"use client";

import { BaseEdge, EdgeLabelRenderer, getBezierPath, type EdgeProps } from "@xyflow/react";

function makeEdge(color: string, label: string) {
  return function BranchEdge(props: EdgeProps) {
    const { id, markerEnd, data } = props;
    const [path, lx, ly] = getBezierPath(props);
    const active = Boolean((data as { active?: boolean } | undefined)?.active);
    return (
      <>
        <BaseEdge
          id={id}
          path={path}
          markerEnd={markerEnd}
          className={active ? "edge-active" : undefined}
          style={{
            stroke: color,
            strokeWidth: active ? 3 : 1.75,
            strokeDasharray: active ? "6 4" : undefined,
            animation: active ? "dash 0.6s linear infinite" : undefined,
          }}
        />
        <EdgeLabelRenderer>
          <div
            className="nodrag nopan absolute rounded px-1.5 py-0.5 text-[10px] font-bold text-white"
            style={{
              background: color,
              transform: `translate(-50%, -50%) translate(${lx}px, ${ly}px)`,
            }}
          >
            {label}
          </div>
        </EdgeLabelRenderer>
      </>
    );
  };
}

export const edgeTypes = {
  yes: makeEdge("hsl(152 60% 32%)", "YES"),
  no: makeEdge("hsl(8 72% 48%)", "NO"),
};
