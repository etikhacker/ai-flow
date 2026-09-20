"use client";

import { Handle, Position, type NodeProps } from "@xyflow/react";
import { CheckCircle2, CircleAlert, Flag, GitBranch, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { DecisionData, FlowNode, NodeStatus, ResultData } from "@/lib/types";

const ring: Record<NodeStatus, string> = {
  idle: "border-border",
  running: "border-ring node-running",
  done: "border-yes/70",
  error: "border-destructive",
};

function StatusIcon({ status }: { status?: NodeStatus }) {
  if (status === "running") return <Loader2 className="h-3.5 w-3.5 animate-spin text-ring" />;
  if (status === "done") return <CheckCircle2 className="h-3.5 w-3.5 text-yes" />;
  if (status === "error") return <CircleAlert className="h-3.5 w-3.5 text-destructive" />;
  return null;
}

export function DecisionNode({ data, selected }: NodeProps<FlowNode>) {
  const d = data as DecisionData;
  return (
    <div
      className={cn(
        "w-56 rounded-lg border-2 bg-background shadow-sm",
        ring[d.status ?? "idle"],
        selected && "outline outline-2 outline-offset-2 outline-primary/40",
      )}
    >
      <Handle type="target" position={Position.Top} className="!h-2.5 !w-2.5 !bg-primary" />
      <div className="flex items-center gap-2 border-b px-3 py-2">
        <GitBranch className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="flex-1 truncate text-sm font-medium">{d.label}</span>
        <StatusIcon status={d.status} />
        {d.answer && (
          <span
            className={cn(
              "rounded px-1.5 py-0.5 text-[11px] font-semibold text-white",
              d.answer === "YES" ? "bg-yes" : "bg-no",
            )}
          >
            {d.answer}
          </span>
        )}
      </div>
      <p className="line-clamp-3 px-3 py-2 text-xs text-muted-foreground">
        {d.prompt || "Click to write a yes/no question…"}
      </p>
      <div className="flex justify-between px-6 pb-2 text-[11px] font-semibold">
        <span className="text-yes">YES</span>
        <span className="text-no">NO</span>
      </div>
      <Handle id="yes" type="source" position={Position.Bottom} style={{ left: "25%" }} className="!h-2.5 !w-2.5 !bg-yes" />
      <Handle id="no" type="source" position={Position.Bottom} style={{ left: "75%" }} className="!h-2.5 !w-2.5 !bg-no" />
    </div>
  );
}

export function ResultNode({ data, selected }: NodeProps<FlowNode>) {
  const d = data as ResultData;
  return (
    <div
      className={cn(
        "flex w-48 items-center gap-2 rounded-lg border-2 bg-secondary px-3 py-2.5",
        ring[d.status ?? "idle"],
        selected && "outline outline-2 outline-offset-2 outline-primary/40",
      )}
    >
      <Handle type="target" position={Position.Top} className="!h-2.5 !w-2.5 !bg-primary" />
      <Flag className="h-3.5 w-3.5 text-muted-foreground" />
      <span className="flex-1 truncate text-sm font-medium">{d.label}</span>
      <StatusIcon status={d.status} />
    </div>
  );
}
