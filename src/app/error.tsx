"use client";

import { useEffect } from "react";

export default function RouteError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[ai-flow] client error:", error);
  }, [error]);

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "2rem",
        fontFamily: "system-ui, sans-serif",
      }}
    >
      <div style={{ maxWidth: 540 }}>
        <h1 style={{ fontSize: 18, fontWeight: 600, marginBottom: 10 }}>
          AI Flow hit an error.
        </h1>
        <p style={{ fontSize: 14, lineHeight: 1.55, color: "#444", marginBottom: 14 }}>
          {error.message || "A client-side exception occurred."}
        </p>
        <button
          onClick={reset}
          style={{
            padding: "7px 12px",
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
    </div>
  );
}
