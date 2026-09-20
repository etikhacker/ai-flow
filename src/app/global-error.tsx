"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[ai-flow] fatal client error:", error);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          fontFamily: "system-ui, sans-serif",
          minHeight: "100vh",
          margin: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "2rem",
          background: "#fafaf7",
          color: "#1a1a23",
        }}
      >
        <div style={{ maxWidth: 540 }}>
          <h1 style={{ fontSize: 20, fontWeight: 600, marginBottom: 12 }}>
            Something went wrong while loading AI Flow.
          </h1>
          <p style={{ fontSize: 14, lineHeight: 1.55, color: "#444", marginBottom: 16 }}>
            A client-side exception occurred. Reload the page to recover.
            {error.digest && (
              <>
                {" "}
                <code style={{ fontSize: 12, color: "#666" }}>(digest: {error.digest})</code>
              </>
            )}
          </p>
          <details style={{ marginBottom: 16 }}>
            <summary style={{ cursor: "pointer", fontSize: 13, color: "#444" }}>
              Show error details
            </summary>
            <pre
              style={{
                marginTop: 8,
                padding: 12,
                background: "#fff",
                border: "1px solid #e6e2d8",
                borderRadius: 6,
                fontSize: 12,
                overflow: "auto",
                whiteSpace: "pre-wrap",
              }}
            >
              {error.stack || error.message}
            </pre>
          </details>
          <button
            onClick={reset}
            style={{
              padding: "8px 14px",
              background: "#1a1a23",
              color: "#fafaf7",
              border: 0,
              borderRadius: 6,
              fontSize: 13,
              cursor: "pointer",
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
