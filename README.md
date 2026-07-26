<div align="center">

# ⚡ ScholarMind

### Production-Grade Retrieval-Augmented Generation for Research Papers

[![Node.js](https://img.shields.io/badge/Node.js-22+-339933?style=flat-square&logo=node.js&logoColor=white)](https://nodejs.org)
[![React](https://img.shields.io/badge/React-18-61DAFB?style=flat-square&logo=react&logoColor=black)](https://react.dev)
[![Qdrant](https://img.shields.io/badge/Qdrant_Cloud-Vector_DB-DC244C?style=flat-square)](https://cloud.qdrant.io)
[![Groq](https://img.shields.io/badge/Groq-LLaMA_3.1-F55036?style=flat-square)](https://console.groq.com)
[![Vercel](https://img.shields.io/badge/Vercel-Frontend-000?style=flat-square&logo=vercel)](https://vercel.com)
[![Render](https://img.shields.io/badge/Render-Backend-46E3B7?style=flat-square)](https://render.com)
[![License](https://img.shields.io/badge/License-MIT-yellow?style=flat-square)](LICENSE)

**Upload research PDFs → Ask questions → Get cited, confidence-scored answers in real time**

[Live Demo](https://nexus-rag.vercel.app) · [Report Bug](https://github.com/uvais-malik/research_paper_analyser/issues)

</div>

---

## 🧠 What Is This?

**ScholarMind** is a full-stack, production-ready **Retrieval-Augmented Generation (RAG)** system for academic research. It lets you upload multiple research PDFs and ask complex questions across all of them — receiving detailed, inline-cited answers grounded exclusively in the uploaded documents.

The system implements a **multi-stage RAG pipeline** far beyond simple vector search:

```
Your Question
    │
    ├─► Query Expansion      (LLM generates 2 semantic reformulations)
    │
    ├─► Multi-Query Retrieval (all 3 queries searched in Qdrant Cloud)
    │
    ├─► MMR Re-ranking       (Maximal Marginal Relevance — diversity filter)
    │
    ├─► LLM Re-ranking       (Groq scores each chunk 0.0–1.0 for relevance)
    │
    └─► Answer Generation    (Groq writes a cited, structured answer)
            │
            └─► Streamed token-by-token via Server-Sent Events (SSE)
```

---

## ✨ Key Features

| Category | Feature |
|----------|---------|
| **RAG Pipeline** | Multi-query expansion · MMR diversity · LLM re-ranking · Streaming SSE |
| **Citations** | Inline `[Paper: Title, Page: N]` with real page numbers |
| **Confidence** | Calibrated 0–100% confidence bar per answer |
| **Embeddings** | `all-MiniLM-L6-v2` via `@xenova/transformers` — **runs on-server, no API cost** |
| **Vector DB** | **Qdrant Cloud** (free tier, 1GB, production-grade, cosine similarity) |
| **Metadata** | LLM extracts title, authors, year, abstract automatically on upload |
| **Storage** | SQLite (WAL mode) for paper metadata — zero-config, concurrent-safe |
| **Security** | API key auth · Rate limiting · helmet middleware · Zod validation · XSS protection |
| **Deploy** | Vercel (frontend) + Render (backend) — **both free tier** |

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Browser  (Vercel)                         │
│                                                             │
│   Sidebar                  Chat Area                        │
│   • Upload PDFs            • Real-time streaming answer     │
│   • Select papers          • Source cards with excerpts     │
│   • Toggle per-paper       • Confidence bar                 │
│     search scope           • Pipeline step indicator        │
│                            • Expanded query display         │
└──────────────────────────────┬──────────────────────────────┘
                               │ HTTPS (Fetch / SSE)
┌──────────────────────────────▼──────────────────────────────┐
│                  Node.js Backend  (Render)                   │
│                                                             │
│  Express.js · helmet · cors · express-rate-limit · zod      │
│                                                             │
│  POST /api/papers/upload   → PDF ingestion pipeline         │
│  GET  /api/papers          → list all papers                │
│  DEL  /api/papers/:id      → delete paper + vectors         │
│  POST /api/papers/:id/analyze → deep analysis               │
│  POST /api/query           → standard RAG query             │
│  POST /api/query/stream    → SSE streaming RAG query        │
│  GET  /api/health          → health check                   │
│                                                             │
│  ┌─────────────┐  ┌──────────────┐  ┌───────────────────┐  │
│  │  ragService │  │ingestionSvc  │  │  analysisService  │  │
│  │             │  │              │  │                   │  │
│  │ • Expansion │  │ • pdf-parse  │  │ • summary         │  │
│  │ • Retrieval │  │ • LLM meta   │  │ • methodology     │  │
│  │ • MMR       │  │ • Chunking   │  │ • contributions   │  │
│  │ • Reranking │  │ • Embedding  │  │ • limitations     │  │
│  │ • Streaming │  │ • Qdrant     │  │ • future_work     │  │
│  └─────────────┘  └──────────────┘  └───────────────────┘  │
└──────────────────────────────┬──────────────────────────────┘
                               │
          ┌────────────────────┴──────────────────┐
          │                                       │
   ┌──────▼──────┐                       ┌────────▼───────┐
   │ Qdrant Cloud│                       │ SQLite (local) │
   │ (Vectors)   │                       │ (Paper meta)   │
   │  Free tier  │                       │  WAL mode      │
   └─────────────┘                       └────────────────┘
```

---

## 🛠️ Tech Stack

| Layer | Technology | Notes |
|-------|-----------|-------|
| **Frontend** | React 18 + Vite | SSE streaming, dark UI |
| **Backend** | Node.js 22 + Express.js | ESM, graceful shutdown |
| **LLM** | Groq (LLaMA 3.1-8b-instant) | Fastest inference, free tier |
| **Embeddings** | `@xenova/transformers` (all-MiniLM-L6-v2) | Runs on-server, no API cost |
| **Vector DB** | **Qdrant Cloud** | Free 1GB cluster, cosine similarity |
| **Metadata DB** | better-sqlite3 (WAL mode) | Zero-config, concurrent-safe |
| **PDF parsing** | pdf-parse | Real per-page extraction |
| **Chunking** | LangChain RecursiveCharacterTextSplitter | 1000-char chunks / 200 overlap |
| **LLM chains** | LangChain + @langchain/groq | Typed prompt templates |
| **Validation** | Zod | Schema-validated API inputs |
| **Security** | helmet + express-rate-limit | CSP, HSTS, rate limits |
| **Deploy** | Vercel + Render | Both free tier |

---

## 🚀 Getting Started

### Prerequisites
- Node.js 22+
- Free [Qdrant Cloud](https://cloud.qdrant.io) account (no credit card)
- Free [Groq](https://console.groq.com) API key

### Installation

```bash
# Clone the repo
git clone https://github.com/uvais-malik/research_paper_analyser.git
cd research_paper_analyser

# Install backend dependencies
cd backend && npm install

# Install frontend dependencies
cd ../frontend && npm install
```

### Environment Variables

Copy `backend/.env.example` to `backend/.env` and fill in your values:

```env
GROQ_API_KEY=gsk_your_key_here
QDRANT_URL=https://your-cluster.us-west-1-0.aws.cloud.qdrant.io
QDRANT_API_KEY=your_qdrant_api_key
QDRANT_COLLECTION=research_papers
CORS_ORIGIN=http://localhost:5173
PORT=3001
```

### Running Locally

```bash
# Terminal 1 — Backend
cd backend
npm run dev

# Terminal 2 — Frontend
cd frontend
npm run dev
# Open http://localhost:5173
```

---

## ☁️ Deployment

### Backend → Render

1. Connect your GitHub repo to [Render](https://render.com)
2. New Web Service → Root Dir: `backend` → Build: `npm install` → Start: `node src/server.js`
3. Add environment variables in Render dashboard:
   ```
   GROQ_API_KEY=gsk_...
   QDRANT_URL=https://your-cluster.aws.cloud.qdrant.io
   QDRANT_API_KEY=your_key
   CORS_ORIGIN=https://your-frontend.vercel.app
   NODE_ENV=production
   ```

### Frontend → Vercel

1. Connect your GitHub repo to [Vercel](https://vercel.com)
2. Root Dir: `frontend`
3. Add environment variable:
   ```
   VITE_API_URL=https://your-render-backend.onrender.com
   ```
4. Deploy — Vercel handles the build automatically

### Health Check

After deployment, verify the backend is running:
```
GET https://your-backend.onrender.com/api/health
→ { "status": "healthy", "vectorStore": "qdrant", "chunksStored": 0, ... }
```

---

## 📡 API Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET`  | `/api/health` | Health check — public |
| `GET`  | `/api/papers` | List all papers |
| `POST` | `/api/papers/upload` | Upload a PDF (`multipart/form-data`) |
| `GET`  | `/api/papers/:id` | Get paper by ID |
| `DELETE` | `/api/papers/:id` | Delete paper + vectors |
| `POST` | `/api/papers/:id/analyze` | Deep analysis (`{ analysisType }`) |
| `POST` | `/api/query` | Standard RAG query |
| `POST` | `/api/query/stream` | SSE streaming RAG query |

---

## 🔒 Security

- **API key auth** via `X-API-Key` header (optional dev bypass)
- **Rate limiting** — 15 queries/min, 10 uploads/min per IP
- **Helmet** — CSP, HSTS, X-Frame-Options, X-Content-Type
- **Zod validation** — all inputs schema-validated
- **CORS** — strict allowlist only
- **XSS protection** — `rehype-sanitize` on all LLM markdown output
- **No secrets in code** — all via environment variables

---

## ⚡ Performance

| Metric | Value |
|--------|-------|
| Embedding model | 384-dim, runs in ~50ms per chunk |
| Query expansion | +2 reformulations via LLaMA 3.1 |
| Retrieval | Qdrant cosine search, ~20ms |
| Full pipeline | ~3–8s end-to-end (streaming starts in ~2s) |
| Max PDF size | 50MB |
| Chunk size | 1000 chars / 200 overlap |

---

## 📁 Project Structure

```
research_paper_analyser/
├── backend/
│   ├── src/
│   │   ├── server.js              # Express app, boot sequence
│   │   ├── middleware/
│   │   │   ├── auth.js            # API key authentication
│   │   │   └── upload.js          # Multer file upload config
│   │   ├── routes/
│   │   │   ├── health.js          # GET /api/health
│   │   │   ├── papers.js          # Paper CRUD + upload
│   │   │   └── query.js           # RAG query (standard + stream)
│   │   └── services/
│   │       ├── qdrantService.js   # Qdrant Cloud vector operations
│   │       ├── ragService.js      # Full RAG pipeline (expand→retrieve→rerank→generate)
│   │       ├── ingestionService.js# PDF parse → chunk → embed → store
│   │       ├── llmService.js      # Groq LLM + local embeddings
│   │       ├── analysisService.js # Deep paper analysis
│   │       └── database.js        # SQLite paper metadata
│   ├── .env.example
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── App.jsx                # Main UI (chat, sidebar, streaming)
│   │   ├── hooks/
│   │   │   └── usePapers.js       # Paper list state management
│   │   └── utils/
│   │       └── api.js             # API client + SSE streaming
│   ├── vite.config.js
│   └── package.json
├── render.yaml                    # Render deployment config
└── README.md
```

---

## 🤝 Contributing

Pull requests welcome! Please open an issue first to discuss what you'd like to change.

---

## 📄 License

MIT © [uvais-malik](https://github.com/uvais-malik)
