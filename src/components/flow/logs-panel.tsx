"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import type { LogLine } from "@/lib/types";

export function LogsPanel({ logs, status }: { logs: LogLine[]; status?: string }) {
  const end = useRef<HTMLDivElement>(null);
  useEffect(() => {
    // Return undefined explicitly so React 19's stricter commit-phase cleanup
    // never sees scrollIntoView()'s return value (which historically varies
    // across browser engines and is not a function).
    end.current?.scrollIntoView({ block: "end" });
  }, [logs.length]);

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b px-3 py-2 text-xs font-medium">
        <span>Execution log</span>
        {status && <span className="text-muted-foreground">{status}</span>}
      </div>
      <div className="flex-1 overflow-auto px-3 py-2 font-mono text-xs leading-relaxed">
        {logs.length === 0 && (
          <p className="text-muted-foreground">Run the workflow to see each step here.</p>
        )}
        {logs.map((l, i) => (
          <div key={i} className={cn(l.level === "error" && "text-destructive")}>
            <span className="mr-2 text-muted-foreground">
              {new Date(l.t).toLocaleTimeString([], { hour12: false })}
            </span>
            {l.msg}
          </div>
        ))}
        <div ref={end} />
      </div>
    </div>
  );
}
