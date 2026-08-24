import { ChatGroq } from "@langchain/groq";
import { pipeline } from "@xenova/transformers";

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const LLM_MODEL = process.env.LLM_MODEL || "openai/gpt-oss-20b";
const EMBED_MODEL = process.env.EMBEDDING_MODEL || "Xenova/all-MiniLM-L6-v2";

if (!GROQ_API_KEY) {
    console.warn("[llmService] WARNING: GROQ_API_KEY is not set!");
}

export function getLLM({ temperature = 0, maxTokens = 2048 } = {}) {
    return new ChatGroq({
        apiKey: GROQ_API_KEY,
        model: LLM_MODEL,
        temperature,
        maxTokens,
    });
}

let _embedder = null;

async function getEmbedder() {
    if (!_embedder) {
        console.log("[embeddings] Loading local model: " + EMBED_MODEL);
        _embedder = await pipeline("feature-extraction", EMBED_MODEL);
        console.log("[embeddings] Model ready ✓");
    }
    return _embedder;
}

export function getEmbeddings() {
    return {
        async embedDocuments(texts) {
            const embedder = await getEmbedder();
            const results = [];
            for (const text of texts) {
                const output = await embedder(text, { pooling: "mean", normalize: true });
                results.push(Array.from(output.data));
            }
            return results;
        },
        async embedQuery(text) {
            const embedder = await getEmbedder();
            const output = await embedder(text, { pooling: "mean", normalize: true });
            return Array.from(output.data);
        },
    };
}