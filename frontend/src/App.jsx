import { useState, useRef, useEffect, useCallback } from "react";
import { usePapers } from "./hooks/usePapers.js";
import { api, queryStream } from "./utils/api.js";
import ReactMarkdown from "react-markdown";
import rehypeSanitize from "rehype-sanitize";

let _msgId = 0;
const newId = () => `msg_${++_msgId}`;

/* ── Tiny SVG icon helper ──────────────────────────────────────────────────── */
function Ic({ d, size = 16, stroke = 1.8, fill = "none" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={fill}
      stroke="currentColor" strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round">
      {d}
    </svg>
  );
}

const Icons = {
  upload:   <><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></>,
  trash:    <><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/></>,
  send:     <><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></>,
  brain:    <><path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96-.44 2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1-.34-5.58 2.5 2.5 0 0 1 1.32-4.24 2.5 2.5 0 0 1 4.44-2.16Z"/><path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96-.44 2.5 2.5 0 0 0 2.96-3.08 3 3 0 0 0 .34-5.58 2.5 2.5 0 0 0-1.32-4.24 2.5 2.5 0 0 0-4.44-2.16Z"/></>,
  zap:      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>,
  book:     <><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></>,
  x:        <><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></>,
  check:    <polyline points="20 6 9 17 4 12"/>,
  copy:     <><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></>,
  chevron:  <polyline points="6 9 12 15 18 9"/>,
  sparkle:  <><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/><path d="M5 3v4M19 17v4M3 5h4M17 19h4"/></>,
  layers:   <><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></>,
  clock:    <><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></>,
  file:     <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></>,
  search:   <><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></>,
  download: <><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></>,
  menu:     <><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></>,
};

/* ── Toast ─────────────────────────────────────────────────────────────────── */
function useToasts() {
  const [toasts, setToasts] = useState([]);
  const add = useCallback((message, type = "error") => {
    const id = newId();
    setToasts(p => [...p, { id, message, type }]);
    setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), 4500);
  }, []);
  const remove = useCallback(id => setToasts(p => p.filter(t => t.id !== id)), []);
  return { toasts, add, remove };
}

function Toasts({ toasts, remove }) {
  if (!toasts.length) return null;
  return (
    <div style={{ position: "fixed", bottom: 28, right: 28, zIndex: 9999, display: "flex", flexDirection: "column", gap: 10 }}>
      {toasts.map(t => (
        <div key={t.id} style={{
          background: t.type === "error" ? "rgba(239,68,68,0.12)" : "rgba(34,197,94,0.12)",
          border: `1px solid ${t.type === "error" ? "rgba(239,68,68,0.35)" : "rgba(34,197,94,0.35)"}`,
          borderRadius: 12, padding: "12px 16px", display: "flex", alignItems: "center",
          gap: 10, fontSize: 13, color: t.type === "error" ? "#f87171" : "#4ade80",
          maxWidth: 340, backdropFilter: "blur(16px)", animation: "slideUp .3s ease",
          boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
        }}>
          <span style={{ flex: 1 }}>{t.message}</span>
          <button onClick={() => remove(t.id)} style={{ background: "none", border: "none", cursor: "pointer", color: "inherit", padding: 2, opacity: 0.6 }}>
            <Ic d={Icons.x} size={12} />
          </button>
        </div>
      ))}
    </div>
  );
}

/* ── Spinner ───────────────────────────────────────────────────────────────── */
function Spinner({ size = 16, color = "#a78bfa" }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%",
      border: `2px solid ${color}30`, borderTopColor: color,
      animation: "spin .7s linear infinite", flexShrink: 0,
    }} />
  );
}

/* ── Pipeline status indicator ─────────────────────────────────────────────── */
const PIPELINE_STEPS = ["Expanding query", "Retrieving chunks", "Re-ranking", "Generating answer"];
function PipelineStatus({ step }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
      {PIPELINE_STEPS.map((s, i) => (
        <div key={s} style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <div style={{
            display: "flex", alignItems: "center", gap: 5,
            padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 500,
            background: i < step ? "rgba(139,92,246,0.15)" : i === step ? "rgba(139,92,246,0.25)" : "rgba(255,255,255,0.04)",
            border: `1px solid ${i < step ? "rgba(139,92,246,0.4)" : i === step ? "rgba(139,92,246,0.6)" : "rgba(255,255,255,0.08)"}`,
            color: i < step ? "#a78bfa" : i === step ? "#c4b5fd" : "rgba(255,255,255,0.3)",
            transition: "all .3s ease",
          }}>
            {i < step ? <Ic d={Icons.check} size={10} /> : i === step ? <Spinner size={10} color="#a78bfa" /> : null}
            {s}
          </div>
          {i < PIPELINE_STEPS.length - 1 && (
            <div style={{ width: 12, height: 1, background: i < step ? "rgba(139,92,246,0.4)" : "rgba(255,255,255,0.1)" }} />
          )}
        </div>
      ))}
    </div>
  );
}

/* ── Confidence bar ────────────────────────────────────────────────────────── */
function ConfidenceBar({ value }) {
  const pct = Math.round(value * 100);
  const color = pct >= 75 ? "#4ade80" : pct >= 50 ? "#facc15" : "#f87171";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <div style={{ fontSize: 11, color: "rgba(255,255,255,0.45)", whiteSpace: "nowrap" }}>Confidence</div>
      <div style={{ flex: 1, height: 4, background: "rgba(255,255,255,0.08)", borderRadius: 4, overflow: "hidden" }}>
        <div style={{ width: `${pct}%`, height: "100%", background: color, borderRadius: 4, transition: "width .6s ease" }} />
      </div>
      <div style={{ fontSize: 11, fontWeight: 600, color, minWidth: 30 }}>{pct}%</div>
    </div>
  );
}

/* ── Source card ───────────────────────────────────────────────────────────── */
function SourceCard({ src, idx }) {
  const [open, setOpen] = useState(false);
  const score = Math.round((src.relevanceScore ?? 0) * 100);
  return (
    <div style={{
      background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)",
      borderRadius: 10, overflow: "hidden", transition: "border-color .2s",
    }}
      onMouseEnter={e => e.currentTarget.style.borderColor = "rgba(139,92,246,0.4)"}
      onMouseLeave={e => e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)"}
    >
      <button onClick={() => setOpen(o => !o)} style={{
        width: "100%", background: "none", border: "none", cursor: "pointer",
        padding: "10px 12px", display: "flex", alignItems: "center", gap: 10,
      }}>
        <div style={{
          minWidth: 22, height: 22, borderRadius: 6, background: "rgba(139,92,246,0.2)",
          border: "1px solid rgba(139,92,246,0.4)", display: "flex", alignItems: "center",
          justifyContent: "center", fontSize: 10, fontWeight: 700, color: "#a78bfa",
        }}>{idx + 1}</div>
        <div style={{ flex: 1, textAlign: "left" }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.85)", lineHeight: 1.3 }}>
            {src.paperTitle}
          </div>
          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", marginTop: 2 }}>
            Page {src.page} · {score}% relevant
          </div>
        </div>
        <div style={{ color: "rgba(255,255,255,0.3)", transform: open ? "rotate(180deg)" : "none", transition: "transform .2s" }}>
          <Ic d={Icons.chevron} size={14} />
        </div>
      </button>
      {open && (
        <div style={{
          padding: "0 12px 12px", fontSize: 12, color: "rgba(255,255,255,0.5)",
          lineHeight: 1.6, borderTop: "1px solid rgba(255,255,255,0.06)",
          paddingTop: 10,
        }}>
          {src.content?.slice(0, 400)}{src.content?.length > 400 ? "…" : ""}
        </div>
      )}
    </div>
  );
}

/* ── Copy button ───────────────────────────────────────────────────────────── */
function CopyBtn({ text }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };
  return (
    <button onClick={copy} title="Copy answer" style={{
      background: copied ? "rgba(34,197,94,0.15)" : "rgba(255,255,255,0.06)",
      border: `1px solid ${copied ? "rgba(34,197,94,0.4)" : "rgba(255,255,255,0.12)"}`,
      borderRadius: 8, padding: "5px 10px", cursor: "pointer",
      display: "flex", alignItems: "center", gap: 5,
      color: copied ? "#4ade80" : "rgba(255,255,255,0.5)", fontSize: 11,
      transition: "all .2s",
    }}>
      <Ic d={copied ? Icons.check : Icons.copy} size={12} />
      {copied ? "Copied!" : "Copy"}
    </button>
  );
}

/* ── Paper chip ────────────────────────────────────────────────────────────── */
function PaperChip({ paper, selected, onToggle, onDelete, deleting }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 0,
      background: selected ? "rgba(139,92,246,0.15)" : "rgba(255,255,255,0.04)",
      border: `1px solid ${selected ? "rgba(139,92,246,0.5)" : "rgba(255,255,255,0.08)"}`,
      borderRadius: 10, overflow: "hidden", transition: "all .2s",
    }}>
      <button onClick={() => onToggle(paper.id)} style={{
        flex: 1, background: "none", border: "none", cursor: "pointer",
        padding: "9px 12px", textAlign: "left", display: "flex", alignItems: "center", gap: 8,
      }}>
        <div style={{
          width: 6, height: 6, borderRadius: "50%", flexShrink: 0,
          background: selected ? "#a78bfa" : "rgba(255,255,255,0.2)",
          boxShadow: selected ? "0 0 8px #a78bfa" : "none",
          transition: "all .2s",
        }} />
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 12, fontWeight: 500, color: selected ? "#e2d9f3" : "rgba(255,255,255,0.65)", lineHeight: 1.3, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {paper.title || paper.filename}
          </div>
          <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", marginTop: 2 }}>
            {paper.totalPages}p · {paper.totalChunks} chunks
            {paper.year ? ` · ${paper.year}` : ""}
          </div>
        </div>
      </button>
      <button onClick={() => onDelete(paper.id)} disabled={deleting === paper.id} style={{
        background: "none", border: "none", borderLeft: "1px solid rgba(255,255,255,0.08)",
        cursor: "pointer", padding: "9px 10px", color: "rgba(255,255,255,0.25)", transition: "color .2s",
      }}
        onMouseEnter={e => e.currentTarget.style.color = "#f87171"}
        onMouseLeave={e => e.currentTarget.style.color = "rgba(255,255,255,0.25)"}
      >
        {deleting === paper.id ? <Spinner size={12} color="#f87171" /> : <Ic d={Icons.trash} size={12} />}
      </button>
    </div>
  );
}

/* ── Message bubble ────────────────────────────────────────────────────────── */
function MessageBubble({ msg }) {
  const isUser = msg.role === "user";
  if (isUser) {
    return (
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 20 }}>
        <div className="message-bubble message-user">
          {msg.content}
        </div>
      </div>
    );
  }

  if (msg.role === "assistant") {
    return (
      <div style={{ display: "flex", gap: 12, marginBottom: 28, alignItems: "flex-start" }}>
        <div style={{
          width: 32, height: 32, borderRadius: 10, flexShrink: 0, marginTop: 2,
          background: "linear-gradient(135deg, rgba(139,92,246,0.3), rgba(79,70,229,0.3))",
          border: "1px solid rgba(139,92,246,0.4)",
          display: "flex", alignItems: "center", justifyContent: "center",
          color: "#a78bfa",
        }}>
          <Ic d={Icons.brain} size={16} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Pipeline status while streaming */}
          {msg.streaming && (
            <div style={{ marginBottom: 12 }}>
              <PipelineStatus step={msg.pipelineStep ?? 3} />
            </div>
          )}

          {/* Answer text */}
          <div className="message-bubble message-assistant">
            <div className="markdown-body" style={{ fontSize: 14, lineHeight: 1.75, color: "rgba(255,255,255,0.85)" }}>
              <ReactMarkdown rehypePlugins={[rehypeSanitize]}>
                {msg.content || (msg.streaming ? "▍" : "")}
              </ReactMarkdown>
            </div>
          </div>

          {/* Meta row */}
          {!msg.streaming && msg.content && (
            <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 10 }}>
              {/* Actions */}
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <CopyBtn text={msg.content} />
                {msg.processingTimeMs && (
                  <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: "rgba(255,255,255,0.3)" }}>
                    <Ic d={Icons.clock} size={11} />
                    {(msg.processingTimeMs / 1000).toFixed(1)}s
                  </div>
                )}
                {msg.expandedQueries?.length > 0 && (
                  <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", fontStyle: "italic" }}>
                    +{msg.expandedQueries.length} query expansions
                  </div>
                )}
              </div>

              {/* Confidence */}
              {msg.confidence != null && (
                <ConfidenceBar value={msg.confidence} />
              )}

              {/* Sources */}
              {msg.sources?.length > 0 && (
                <div>
                  <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", marginBottom: 6, fontWeight: 500, letterSpacing: ".05em", textTransform: "uppercase" }}>
                    {msg.sources.length} Source{msg.sources.length > 1 ? "s" : ""}
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {msg.sources.map((s, i) => <SourceCard key={i} src={s} idx={i} />)}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  if (msg.role === "error") {
    return (
      <div style={{
        display: "flex", gap: 10, alignItems: "flex-start", marginBottom: 20,
        padding: "12px 16px", background: "rgba(239,68,68,0.08)",
        border: "1px solid rgba(239,68,68,0.25)", borderRadius: 12,
      }}>
        <Ic d={Icons.x} size={16} />
        <span style={{ fontSize: 13, color: "#f87171" }}>{msg.content}</span>
      </div>
    );
  }

  return null;
}

/* ── Empty state ───────────────────────────────────────────────────────────── */
function EmptyState({ paperCount }) {
  if (paperCount === 0) {
    return (
      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16, padding: 40 }}>
        <div style={{
          width: 80, height: 80, borderRadius: 24,
          background: "linear-gradient(135deg, rgba(139,92,246,0.2), rgba(79,70,229,0.2))",
          border: "1px solid rgba(139,92,246,0.3)",
          display: "flex", alignItems: "center", justifyContent: "center",
          color: "#a78bfa", animation: "float 3s ease-in-out infinite",
        }}>
          <Ic d={Icons.book} size={36} stroke={1.2} />
        </div>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 20, fontWeight: 700, color: "rgba(255,255,255,0.85)", marginBottom: 8 }}>
            Upload a research paper to begin
          </div>
          <div style={{ fontSize: 14, color: "rgba(255,255,255,0.35)", maxWidth: 320, lineHeight: 1.6 }}>
            ScholarMind RAG uses multi-query expansion, MMR re-ranking, and LLM re-ranking to give you precise, cited answers.
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center" }}>
          {["Multi-query expansion", "MMR re-ranking", "LLM re-ranking", "Streaming SSE", "Inline citations"].map(f => (
            <span key={f} style={{
              fontSize: 11, padding: "4px 10px", borderRadius: 20,
              background: "rgba(139,92,246,0.1)", border: "1px solid rgba(139,92,246,0.25)",
              color: "#a78bfa",
            }}>{f}</span>
          ))}
        </div>
      </div>
    );
  }
  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12, padding: 40 }}>
      <div style={{
        width: 64, height: 64, borderRadius: 20,
        background: "linear-gradient(135deg, rgba(139,92,246,0.2), rgba(79,70,229,0.2))",
        border: "1px solid rgba(139,92,246,0.3)",
        display: "flex", alignItems: "center", justifyContent: "center",
        color: "#a78bfa", animation: "float 3s ease-in-out infinite",
      }}>
        <Ic d={Icons.sparkle} size={28} stroke={1.5} />
      </div>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: 18, fontWeight: 700, color: "rgba(255,255,255,0.85)", marginBottom: 6 }}>
          Ask anything about your papers
        </div>
        <div style={{ fontSize: 13, color: "rgba(255,255,255,0.35)" }}>
          {paperCount} paper{paperCount > 1 ? "s" : ""} ready · Press Enter to send
        </div>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════════ */
/*  MAIN APP                                                                   */
/* ════════════════════════════════════════════════════════════════════════════ */
/* ── Pipeline Config Panel ─────────────────────────────────────────────────── */
function PipelineConfig({ config, onChange }) {
  const [open, setOpen] = useState(false);
  const toggle = (key) => onChange({ ...config, [key]: !config[key] });
  const set    = (key, val) => onChange({ ...config, [key]: val });
  const row = (label, desc, key) => (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
      <div>
        <div style={{ fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.75)" }}>{label}</div>
        <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", marginTop: 2 }}>{desc}</div>
      </div>
      <button onClick={() => toggle(key)} style={{
        width: 38, height: 20, borderRadius: 10, border: "none", cursor: "pointer",
        background: config[key] ? "linear-gradient(90deg,#7c3aed,#4f46e5)" : "rgba(255,255,255,0.12)",
        position: "relative", transition: "background .25s", flexShrink: 0,
      }}>
        <div style={{
          width: 14, height: 14, borderRadius: "50%", background: "#fff",
          position: "absolute", top: 3, left: config[key] ? 21 : 3,
          transition: "left .25s", boxShadow: "0 1px 4px rgba(0,0,0,0.4)",
        }} />
      </button>
    </div>
  );
  const slider = (label, desc, key, min, max, step) => (
    <div style={{ padding: "8px 0", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
        <div>
          <div style={{ fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.75)" }}>{label}</div>
          <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", marginTop: 2 }}>{desc}</div>
        </div>
        <div style={{ fontSize: 12, fontWeight: 700, color: "#a78bfa", minWidth: 30, textAlign: "right" }}>{config[key]}</div>
      </div>
      <input type="range" min={min} max={max} step={step} value={config[key]}
        onChange={e => set(key, Number(e.target.value))}
        style={{ width: "100%", accentColor: "#7c3aed", cursor: "pointer" }} />
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 9, color: "rgba(255,255,255,0.2)", marginTop: 2 }}>
        <span>{min}</span><span>{max}</span>
      </div>
    </div>
  );
  return (
    <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", flexShrink: 0 }}>
      <button onClick={() => setOpen(o => !o)} style={{
        width: "100%", background: "none", border: "none", cursor: "pointer",
        padding: "10px 16px", display: "flex", alignItems: "center", gap: 8,
        color: "rgba(255,255,255,0.5)",
      }}>
        <Ic d={Icons.layers} size={14} />
        <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: ".05em", textTransform: "uppercase", flex: 1, textAlign: "left" }}>Pipeline Config</span>
        <div style={{ transform: open ? "rotate(180deg)" : "none", transition: "transform .2s" }}>
          <Ic d={Icons.chevron} size={12} />
        </div>
      </button>
      {open && (
        <div style={{ padding: "0 16px 14px" }}>
          {row("Query Expansion", "Generate 2 extra query variants", "useQueryExpansion")}
          {row("MMR Re-ranking", "Diversity filter on retrieved chunks", "useMMR")}
          {row("LLM Re-ranking", "Score chunks for relevance via LLM", "useReranking")}
          {slider("Top-K Results", "Chunks retrieved per query", "topK", 3, 15, 1)}
          {slider("Chunk Size", "Characters per text chunk", "chunkSize", 400, 2000, 100)}
          {slider("Chunk Overlap", "Overlap between chunks", "chunkOverlap", 0, 400, 50)}
          <div style={{ marginTop: 10, padding: "8px 10px", background: "rgba(139,92,246,0.08)", borderRadius: 8, border: "1px solid rgba(139,92,246,0.2)" }}>
            <div style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", lineHeight: 1.5 }}>
              ⚠ Chunk settings apply on next upload. Pipeline toggles apply immediately.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function App() {
  const { toasts, add: toast, remove: removeToast } = useToasts();
  const { papers, loading: papersLoading, reload: reloadPapers } = usePapers();

  const [selectedIds, setSelectedIds] = useState(new Set());
  const [messages,    setMessages]    = useState([]);
  const [input,       setInput]       = useState("");
  const [streaming,   setStreaming]   = useState(false);
  const [uploading,   setUploading]   = useState(false);
  const [deleting,    setDeleting]    = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [uploadProgress, setUploadProgress] = useState(null);

  // Pipeline configuration state
  const [pipelineCfg, setPipelineCfg] = useState({
    useQueryExpansion: true,
    useMMR:            true,
    useReranking:      true,
    topK:              5,
    chunkSize:         1000,
    chunkOverlap:      200,
  });

  const abortRef      = useRef(null);
  const bottomRef     = useRef(null);
  const fileInputRef  = useRef(null);
  const textareaRef   = useRef(null);

  // Auto-scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 160) + "px";
    }
  }, [input]);

  const toggleSelect = useCallback(id => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

  const selectAll = () => setSelectedIds(new Set(papers.map(p => p.id)));
  const clearAll  = () => setSelectedIds(new Set());

  /* ── Upload ─────────────────────────────────────────────────────────────── */
  const handleUpload = async (files) => {
    const list = Array.from(files).filter(f => f.type === "application/pdf");
    if (!list.length) { toast("Only PDF files are supported"); return; }

    setUploading(true);
    let ok = 0;
    for (const file of list) {
      setUploadProgress(file.name);
      try {
        const form = new FormData();
        form.append("file", file);
        await api.uploadPaper(form);
        ok++;
      } catch (err) {
        toast(`Failed to upload "${file.name}": ${err.message}`);
      }
    }
    setUploading(false);
    setUploadProgress(null);
    if (ok > 0) {
      toast(`Uploaded ${ok} paper${ok > 1 ? "s" : ""} successfully`, "success");
      reloadPapers();
    }
  };

  const onFileChange = e => { handleUpload(e.target.files); e.target.value = ""; };

  const onDrop = useCallback(e => {
    e.preventDefault();
    handleUpload(e.dataTransfer.files);
  }, []);

  /* ── Delete ─────────────────────────────────────────────────────────────── */
  const handleDelete = async id => {
    setDeleting(id);
    try {
      await api.deletePaper(id);
      setSelectedIds(prev => { const n = new Set(prev); n.delete(id); return n; });
      reloadPapers();
      toast("Paper deleted", "success");
    } catch (err) {
      toast(`Delete failed: ${err.message}`);
    } finally {
      setDeleting(null);
    }
  };

  /* ── Send ───────────────────────────────────────────────────────────────── */
  const handleSend = async () => {
    const q = input.trim();
    if (!q || streaming) return;
    if (!papers.length) { toast("Upload at least one paper first"); return; }

    setInput("");
    const userMsg = { id: newId(), role: "user", content: q };
    const asstMsg = { id: newId(), role: "assistant", content: "", streaming: true, pipelineStep: 0 };
    setMessages(p => [...p, userMsg, asstMsg]);
    setStreaming(true);

    // Simulate pipeline step progression
    const stepTimer = setInterval(() => {
      setMessages(p => p.map(m => m.id === asstMsg.id && m.pipelineStep < 2
        ? { ...m, pipelineStep: m.pipelineStep + 1 } : m));
    }, 1800);

    const paperIds = selectedIds.size > 0 ? [...selectedIds] : null;

    abortRef.current = await queryStream(
      { question: q, paperIds, useMMR: pipelineCfg.useMMR, useQueryExpansion: pipelineCfg.useQueryExpansion, useReranking: pipelineCfg.useReranking, topK: pipelineCfg.topK },
      {
        onToken: token => {
          clearInterval(stepTimer);
          setMessages(p => p.map(m => m.id === asstMsg.id
            ? { ...m, content: m.content + token, pipelineStep: 3 } : m));
        },
        onMeta: meta => {
          setMessages(p => p.map(m => m.id === asstMsg.id
            ? { ...m, sources: meta.sources, confidence: meta.confidence, expandedQueries: meta.expandedQueries, timings: meta.timings }
            : m));
        },
        onDone: ({ processingTimeMs }) => {
          clearInterval(stepTimer);
          setMessages(p => p.map(m => m.id === asstMsg.id
            ? { ...m, streaming: false, processingTimeMs } : m));
          setStreaming(false);
        },
        onError: msg => {
          clearInterval(stepTimer);
          setMessages(p => p.map(m => m.id === asstMsg.id
            ? { ...m, role: "error", content: msg, streaming: false } : m));
          setStreaming(false);
        },
      }
    );
  };

  const handleKeyDown = e => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
    if (e.key === "Escape" && streaming) { abortRef.current?.abort(); setStreaming(false); }
  };

  const clearChat = () => { if (!streaming) setMessages([]); };

  /* ── Render ─────────────────────────────────────────────────────────────── */
  return (
    <div className="app-container">

      {/* ── Sidebar ────────────────────────────────────────────────────────── */}
      <div className="sidebar glass-panel" style={{
        width: sidebarOpen ? 320 : 0, minWidth: sidebarOpen ? 320 : 0,
        transition: "width .3s ease", overflow: "hidden", borderRight: "none"
      }}>
        <div style={{ padding: "20px 16px 12px", flexShrink: 0 }}>
          {/* Logo */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
            <img
              src="/logo.png"
              alt="ScholarMind RAG"
              style={{
                width: 40, height: 40, borderRadius: 10,
                boxShadow: "0 4px 16px rgba(124,58,237,0.5)",
                objectFit: "cover",
              }}
            />
            <div>
              <div style={{ fontWeight: 800, fontSize: 16, letterSpacing: "-.02em", background: "linear-gradient(90deg,#c4b5fd,#818cf8)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>SCHOLARMIND</div>
              <div style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", letterSpacing: ".06em" }}>RESEARCH AI</div>
            </div>
          </div>

          {/* Upload zone */}
          <div
            onDrop={onDrop}
            onDragOver={e => e.preventDefault()}
            style={{
              border: "1.5px dashed rgba(139,92,246,0.35)", borderRadius: 12,
              padding: "16px 12px", textAlign: "center", cursor: "pointer",
              background: "rgba(139,92,246,0.05)", marginBottom: 16,
              transition: "all .2s",
            }}
            onClick={() => !uploading && fileInputRef.current?.click()}
            onMouseEnter={e => e.currentTarget.style.borderColor = "rgba(139,92,246,0.6)"}
            onMouseLeave={e => e.currentTarget.style.borderColor = "rgba(139,92,246,0.35)"}
          >
            <input ref={fileInputRef} type="file" accept=".pdf" multiple style={{ display: "none" }} onChange={onFileChange} />
            {uploading ? (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
                <Spinner size={22} color="#a78bfa" />
                <div style={{ fontSize: 12, color: "#a78bfa" }}>
                  {uploadProgress ? `Processing ${uploadProgress.slice(0, 22)}…` : "Uploading…"}
                </div>
              </div>
            ) : (
              <>
                <div style={{ color: "#a78bfa", marginBottom: 6 }}><Ic d={Icons.upload} size={22} stroke={1.5} /></div>
                <div style={{ fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.7)" }}>Drop PDFs or click to upload</div>
                <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", marginTop: 3 }}>Multiple files supported</div>
              </>
            )}
          </div>

          {/* Paper count + select actions */}
          {papers.length > 0 && (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,0.35)", letterSpacing: ".06em", textTransform: "uppercase" }}>
                Papers ({papers.length})
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                <button onClick={selectAll} style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", background: "none", border: "none", cursor: "pointer", padding: "2px 4px" }}>All</button>
                <button onClick={clearAll}  style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", background: "none", border: "none", cursor: "pointer", padding: "2px 4px" }}>None</button>
              </div>
            </div>
          )}
        </div>

        {/* Scrollable bottom — paper list + hint + pipeline config */}
        <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column" }}>

          {/* Paper list */}
          <div style={{ padding: "0 16px 16px" }}>
            {papersLoading ? (
              <div style={{ display: "flex", justifyContent: "center", paddingTop: 20 }}><Spinner /></div>
            ) : papers.length === 0 ? (
              <div style={{ fontSize: 12, color: "rgba(255,255,255,0.25)", textAlign: "center", paddingTop: 12 }}>
                No papers yet
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {papers.map(p => (
                  <PaperChip
                    key={p.id} paper={p}
                    selected={selectedIds.has(p.id)}
                    onToggle={toggleSelect}
                    onDelete={handleDelete}
                    deleting={deleting}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Spacer to push hint + config to bottom when few papers */}
          <div style={{ flex: 1 }} />

          {/* Selected hint */}
          {papers.length > 0 && (
            <div style={{ padding: "10px 16px", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", textAlign: "center" }}>
                {selectedIds.size === 0
                  ? "All papers will be searched"
                  : `Searching ${selectedIds.size} selected paper${selectedIds.size > 1 ? "s" : ""}`}
              </div>
            </div>
          )}

          {/* Pipeline Config */}
          <PipelineConfig config={pipelineCfg} onChange={setPipelineCfg} />

        </div>
      </div>

      {/* ── Main chat area ─────────────────────────────────────────────────── */}
      <div className="chat-area">

        {/* Header */}
        <div style={{
          padding: "14px 20px", borderBottom: "1px solid rgba(255,255,255,0.06)",
          display: "flex", alignItems: "center", gap: 12, flexShrink: 0,
          background: "rgba(255,255,255,0.01)", backdropFilter: "blur(10px)",
        }}>
          <button onClick={() => setSidebarOpen(o => !o)} style={{
            background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: 8, padding: "6px 8px", cursor: "pointer", color: "rgba(255,255,255,0.6)",
            transition: "all .2s",
          }}
            onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.1)"}
            onMouseLeave={e => e.currentTarget.style.background = "rgba(255,255,255,0.06)"}
          >
            <Ic d={Icons.menu} size={16} />
          </button>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 15, fontWeight: 700 }}>Research Chat</div>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)" }}>
              Powered by Groq · LLaMA 3.1 · Qdrant · Local Embeddings
            </div>
          </div>
          {messages.length > 0 && (
            <button onClick={clearChat} disabled={streaming} style={{
              background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: 8, padding: "6px 12px", cursor: "pointer",
              color: "rgba(255,255,255,0.4)", fontSize: 12, transition: "all .2s",
              display: "flex", alignItems: "center", gap: 5,
            }}>
              <Ic d={Icons.x} size={12} /> Clear chat
            </button>
          )}
        </div>

        {/* Messages */}
        <div style={{ flex: 1, overflowY: "auto", padding: "24px 24px 8px" }}>
          {messages.length === 0 ? (
            <EmptyState paperCount={papers.length} />
          ) : (
            messages.map(m => <MessageBubble key={m.id} msg={m} />)
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input bar */}
        <div style={{
          padding: "12px 20px 20px", flexShrink: 0,
          borderTop: "1px solid rgba(255,255,255,0.06)",
          background: "rgba(255,255,255,0.01)",
        }}>
          {streaming && (
            <div style={{ marginBottom: 8, fontSize: 11, color: "rgba(255,255,255,0.35)", display: "flex", alignItems: "center", gap: 6 }}>
              <Spinner size={10} />
              Generating · Press Esc to stop
            </div>
          )}
          <div style={{
            display: "flex", gap: 10, alignItems: "flex-end",
            background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.12)",
            borderRadius: 16, padding: "10px 12px",
            boxShadow: "0 0 0 1px transparent",
            transition: "border-color .2s, box-shadow .2s",
          }}
            onFocusCapture={e => { e.currentTarget.style.borderColor = "rgba(139,92,246,0.5)"; e.currentTarget.style.boxShadow = "0 0 0 3px rgba(139,92,246,0.1)"; }}
            onBlurCapture={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.12)"; e.currentTarget.style.boxShadow = "0 0 0 1px transparent"; }}
          >
            <textarea
              ref={textareaRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={papers.length ? "Ask a question about your papers… (Enter to send)" : "Upload a PDF first…"}
              disabled={streaming || !papers.length}
              rows={1}
              style={{
                flex: 1, background: "none", border: "none", outline: "none",
                color: "rgba(255,255,255,0.85)", fontSize: 14, lineHeight: 1.6,
                resize: "none", fontFamily: "inherit", overflowY: "hidden",
              }}
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || streaming || !papers.length}
              style={{
                width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                background: input.trim() && !streaming && papers.length
                  ? "linear-gradient(135deg, #7c3aed, #4f46e5)"
                  : "rgba(255,255,255,0.08)",
                border: "none", cursor: input.trim() && !streaming && papers.length ? "pointer" : "not-allowed",
                display: "flex", alignItems: "center", justifyContent: "center",
                color: input.trim() && !streaming && papers.length ? "#fff" : "rgba(255,255,255,0.25)",
                transition: "all .2s",
                boxShadow: input.trim() && !streaming && papers.length ? "0 4px 12px rgba(124,58,237,0.4)" : "none",
              }}
            >
              {streaming ? <Spinner size={16} color="#a78bfa" /> : <Ic d={Icons.send} size={15} />}
            </button>
          </div>
          <div style={{ marginTop: 6, fontSize: 10, color: "rgba(255,255,255,0.2)", textAlign: "center" }}>
            Shift+Enter for newline · Esc to cancel
          </div>
        </div>
      </div>

      <Toasts toasts={toasts} remove={removeToast} />

    </div>
  );
}
