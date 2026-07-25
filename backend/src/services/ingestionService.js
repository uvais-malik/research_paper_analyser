import pdfParse from "pdf-parse";
import { v4 as uuid } from "uuid";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { StringOutputParser } from "@langchain/core/output_parsers";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import { getLLM, getEmbeddings } from "./llmService.js";
import { upsertChunks } from "./qdrantService.js";

const CHUNK_SIZE    = parseInt(process.env.CHUNK_SIZE)    || 1000;
const CHUNK_OVERLAP = parseInt(process.env.CHUNK_OVERLAP) || 200;

const METADATA_PROMPT = ChatPromptTemplate.fromTemplate(`
Extract metadata from this research paper text.
Return ONLY valid JSON with these keys (use null if not found):
- title: string or null
- authors: array of strings or null
- abstract: string (max 400 chars) or null
- year: number or null

Text:
{text}

JSON only, no explanation, no markdown:`);

async function extractMetadata(text) {
    try {
        const llm   = getLLM({ temperature: 0 });
        const chain = METADATA_PROMPT.pipe(llm).pipe(new StringOutputParser());
        const raw     = await chain.invoke({ text: text.slice(0, 2000) });
        const cleaned = raw.replace(/```(?:json)?|```/g, "").trim();
        return JSON.parse(cleaned);
    } catch {
        return {};
    }
}

/**
 * Extract real per-page text from a PDF buffer.
 * Uses pdf-parse's pagerender callback to capture each page's content separately,
 * so chunk metadata carries accurate page numbers.
 */
async function extractPages(buffer) {
    const pages = [];

    const options = {
        pagerender: function (pageData) {
            return pageData.getTextContent().then((textContent) => {
                let text = "";
                let lastY = null;
                for (const item of textContent.items) {
                    if (lastY !== null && Math.abs(item.transform[5] - lastY) > 5) {
                        // If gap is large, treat as new paragraph
                        if (Math.abs(item.transform[5] - lastY) > 15) {
                            text += "\n\n";
                        } else {
                            text += "\n";
                        }
                    } else if (lastY !== null) {
                        text += " ";
                    }
                    text += item.str.trim();
                    lastY = item.transform[5];
                }
                text = text.replace(/\\n{3,}/g, "\\n\\n").trim();
                pages.push({ pageNum: pageData.pageNumber, text });
                return text;
            });
        },
    };

    const parsed = await pdfParse(buffer, options);

    // Fallback: if pagerender didn't fire (some PDF builds), use full text as page 1
    if (pages.length === 0) {
        pages.push({ pageNum: 1, text: parsed.text });
    }

    return { pages, totalPages: parsed.numpages, fullText: parsed.text };
}

async function chunkText(pages, paperId, paperTitle, filename) {
    const splitter = new RecursiveCharacterTextSplitter({
        chunkSize:    CHUNK_SIZE,
        chunkOverlap: CHUNK_OVERLAP,
        separators:   ["\n\n", "\n", ". ", " ", ""],
    });

    const chunks = [];
    let chunkIndex = 0;

    for (const { pageNum, text } of pages) {
        if (!text.trim()) continue;
        const pageChunks = await splitter.splitText(text);
        for (const content of pageChunks) {
            if (content.trim().length < 50) continue;
            const chunkId = `${paperId}_chunk_${chunkIndex}`;
            chunks.push({
                id:       chunkId,
                content:  content.trim(),
                metadata: {
                    chunk_id:    chunkId,
                    paper_id:    paperId,
                    paper_title: paperTitle,
                    filename,
                    page:        pageNum,
                    chunk_index: chunkIndex,
                },
            });
            chunkIndex++;
        }
    }
    return chunks;
}

async function embedAndStore(chunks) {
    if (!chunks.length) return 0;

    const embedder = getEmbeddings();
    const BATCH    = 100;
    let stored     = 0;

    for (let i = 0; i < chunks.length; i += BATCH) {
        const batch = chunks.slice(i, i + BATCH);
        const texts = batch.map((c) => c.content);

        // Embed entire batch at once (not one-by-one)
        const embeddings = await embedder.embedDocuments(texts);

        const items = batch.map((c, idx) => ({
            id:        c.id,
            embedding: embeddings[idx],
            document:  c.content,
            metadata:  c.metadata,
        }));

        await upsertChunks(items);
        stored += batch.length;
        process.stdout.write(`\r      Embedded ${stored}/${chunks.length} chunks...`);
    }
    process.stdout.write("\n");
    return stored;
}

export async function ingestPaper(fileBuffer, filename) {
    const paperId = uuid();

    console.log(`\n  Parsing ${filename}...`);
    const { pages, totalPages, fullText } = await extractPages(fileBuffer);

    console.log("  Extracting metadata...");
    const meta       = await extractMetadata(fullText);
    const paperTitle = meta.title || filename.replace(/\.pdf$/i, "");

    console.log("  Chunking text...");
    const chunks = await chunkText(pages, paperId, paperTitle, filename);
    console.log(`  Created ${chunks.length} chunks across ${totalPages} pages`);

    console.log("  Embedding & storing in Qdrant...");
    const totalChunks = await embedAndStore(chunks);
    console.log(`  Stored ${totalChunks} chunks in Qdrant ✓`);

    return {
        id:          paperId,
        filename,
        title:       paperTitle,
        authors:     meta.authors  || null,
        abstract:    meta.abstract || null,
        year:        meta.year     || null,
        totalPages,
        totalChunks,
        status:      "ready",
        uploadedAt:  new Date().toISOString(),
    };
}