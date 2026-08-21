import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import { initQdrant } from "./services/qdrantService.js";
import { getDb } from "./services/database.js";
import { apiKeyAuth } from "./middleware/auth.js";
import papersRouter from "./routes/papers.js";
import queryRouter  from "./routes/query.js";
import healthRouter from "./routes/health.js";


const app  = express();
const PORT = process.env.PORT || 3001;

// ── Security headers ──────────────────────────────────────────────────────────
app.use(helmet());

// ── CORS — strict explicit allow-list only ────────────────────────────────────
const allowedOrigins = process.env.CORS_ORIGIN
    ? process.env.CORS_ORIGIN.split(",").map((o) => o.trim())
    : ["http://localhost:5173", "http://localhost:3000"];

app.use(cors({
    origin: true,
    credentials: true,
}));

// ── Body parsing — conservative limits ───────────────────────────────────────
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));

// ── Request logger ────────────────────────────────────────────────────────────
app.use((req, _res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
    next();
});

// ── Routes (auth applied to all except health) ────────────────────────────────
app.use("/api/health", healthRouter);                    // health is public
app.use("/api/papers", apiKeyAuth, papersRouter);
app.use("/api/query",  apiKeyAuth, queryRouter);

// ── 404 ───────────────────────────────────────────────────────────────────────
app.use((_req, res) => {
    res.status(404).json({ error: "Route not found" });
});

// ── Global error handler ──────────────────────────────────────────────────────
app.use((err, _req, res, _next) => {
    console.error("[Error]", err.message);
    // Never leak stack traces to clients in production
    const isProd = process.env.NODE_ENV === "production";
    res.status(err.status || 500).json({
        error: isProd ? "Internal server error" : (err.message || "Internal server error"),
    });
});

let server;

async function boot() {
    try {
        console.log("\n╔══════════════════════════════════════╗");
        console.log("║  NEXUS RAG — Node.js Backend          ║");
        console.log("╚══════════════════════════════════════╝\n");

        console.log("[1/3] Initializing SQLite...");
        getDb();
        console.log("      SQLite ready ✓");

        console.log("[2/3] Initializing Qdrant...");
        await initQdrant();
        console.log("      Qdrant ready ✓");

        server = app.listen(PORT, () => {
            console.log(`\n[3/3] Server running → http://localhost:${PORT}`);
            console.log(`      Health check  → http://localhost:${PORT}/api/health`);
            console.log(`      Auth          → ${process.env.API_KEY ? "enabled (X-API-Key)" : "disabled (dev mode)"}`);
            console.log(`      LLM model     → ${process.env.LLM_MODEL || "llama-3.1-8b-instant"} (Groq)`);
            console.log(`      Embed model   → ${process.env.EMBEDDING_MODEL || "Xenova/all-MiniLM-L6-v2"} (local)\n`);
        });
    } catch (err) {
        console.error("Boot failed:", err);
        process.exit(1);
    }
}

// ── Graceful shutdown for Render SIGTERM ──────────────────────────────────────
function shutdown(signal) {
    console.log(`\n[${signal}] Shutting down gracefully...`);
    server?.close(() => {
        console.log("HTTP server closed.");
        process.exit(0);
    });
    setTimeout(() => process.exit(1), 10_000).unref();
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT",  () => shutdown("SIGINT"));

boot();