import { StrictMode, Component } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.jsx";

// ── Error Boundary — prevents blank white screen on component crashes ─────────
class ErrorBoundary extends Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, info) {
        console.error("[ErrorBoundary] Caught error:", error, info);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div style={{
                    minHeight: "100vh", background: "#0c0e14", display: "flex",
                    alignItems: "center", justifyContent: "center", flexDirection: "column",
                    gap: 16, fontFamily: "monospace", color: "#f87171", padding: 32,
                }}>
                    <div style={{ fontSize: 40 }}>⚠️</div>
                    <div style={{ fontSize: 16, fontWeight: 700 }}>Something went wrong</div>
                    <div style={{ fontSize: 12, color: "#64748b", maxWidth: 400, textAlign: "center" }}>
                        {this.state.error?.message || "An unexpected error occurred."}
                    </div>
                    <button
                        onClick={() => window.location.reload()}
                        style={{
                            marginTop: 8, padding: "8px 20px", background: "#f59e0b",
                            border: "none", borderRadius: 8, color: "#000",
                            cursor: "pointer", fontWeight: 600, fontSize: 13,
                        }}>
                        Reload App
                    </button>
                </div>
            );
        }
        return this.props.children;
    }
}

createRoot(document.getElementById("root")).render(
    <StrictMode>
        <ErrorBoundary>
            <App />
        </ErrorBoundary>
    </StrictMode>
);