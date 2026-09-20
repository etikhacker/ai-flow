import { MarkerType } from "@xyflow/react";
import type { DecisionData, FlowEdge, FlowNode, Graph, ResultData } from "./types";

export const STORAGE_KEY = "ai-flow:graph:v1";

export const defaultNodes: FlowNode[] = [
  {
    id: "n1",
    type: "decision",
    position: { x: 260, y: 20 },
    data: { label: "Support?", prompt: "Is this a support request?" } as DecisionData,
  },
  { id: "n2", type: "result", position: { x: 60, y: 260 }, data: { label: "Support Node" } as ResultData },
  { id: "n3", type: "result", position: { x: 460, y: 260 }, data: { label: "Sales Node" } as ResultData },
];

const marker = { type: MarkerType.ArrowClosed };

export const defaultEdges: FlowEdge[] = [
  { id: "e-n1-yes", source: "n1", sourceHandle: "yes", target: "n2", type: "yes", markerEnd: marker },
  { id: "e-n1-no", source: "n1", sourceHandle: "no", target: "n3", type: "no", markerEnd: marker },
];

export function toGraph(nodes: FlowNode[], edges: FlowEdge[]): Graph {
  return {
    nodes: nodes.map((n) => ({
      id: n.id,
      type: n.type as "decision" | "result",
      label: n.data.label,
      prompt: n.type === "decision" ? (n.data as DecisionData).prompt : undefined,
      position: n.position,
    })),
    edges: edges.map((e) => ({
      id: e.id,
      source: e.source,
      target: e.target,
      branch: e.type === "no" ? "no" : "yes",
    })),
  };
}

export function fromGraph(g: Graph): { nodes: FlowNode[]; edges: FlowEdge[] } {
  return {
    nodes: g.nodes.map((n) => ({
      id: n.id,
      type: n.type,
      position: n.position,
      data: n.type === "decision" ? { label: n.label, prompt: n.prompt ?? "" } : { label: n.label },
    })) as FlowNode[],
    edges: g.edges.map((e) => ({
      id: e.id,
      source: e.source,
      sourceHandle: e.branch,
      target: e.target,
      type: e.branch,
      markerEnd: marker,
    })),
  };
}

export function isGraph(x: unknown): x is Graph {
  const g = x as Graph;
  return (
    !!g &&
    Array.isArray(g.nodes) &&
    Array.isArray(g.edges) &&
    g.nodes.every((n) => typeof n.id === "string" && (n.type === "decision" || n.type === "result")) &&
    g.edges.every((e) => e.source && e.target && (e.branch === "yes" || e.branch === "no"))
  );
}
