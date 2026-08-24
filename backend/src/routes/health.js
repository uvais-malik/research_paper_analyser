import { Router } from "express";
import { getChunkCount } from "../services/qdrantService.js";

const router = Router();

router.get("/", async (_req, res) => {
    try {
        const chunks = await getChunkCount();
        res.json({
            status:         "healthy",
            vectorStore:    "qdrant",
            chunksStored:   chunks,
            llmModel:       process.env.LLM_MODEL       || "openai/gpt-oss-20b",
            embeddingModel: process.env.EMBEDDING_MODEL || "Xenova/all-MiniLM-L6-v2",
            timestamp:      new Date().toISOString(),
        });
    } catch (err) {
        res.status(503).json({ status: "degraded", error: err.message });
    }
});

export default router;