import type { Edge, Node } from "@xyflow/react";

export type Answer = "YES" | "NO";
export type NodeStatus = "idle" | "running" | "done" | "error";

export type DecisionData = {
  label: string;
  prompt: string;
  status?: NodeStatus;
  answer?: Answer;
};

export type ResultData = {
  label: string;
  status?: NodeStatus;
};

export type FlowNode = Node<DecisionData | ResultData, "decision" | "result">;
export type FlowEdge = Edge<{ active?: boolean }>;

/** Minimal graph shape sent to the server / stored in JSON files. */
export type GraphNode = {
  id: string;
  type: "decision" | "result";
  label: string;
  prompt?: string;
  position: { x: number; y: number };
};
export type GraphEdge = {
  id: string;
  source: string;
  target: string;
  branch: "yes" | "no";
};
export type Graph = { nodes: GraphNode[]; edges: GraphEdge[] };

export type LogLine = { t: number; level: "info" | "error"; msg: string };
export type StepRecord = {
  nodeId: string;
  label: string;
  answer?: Answer;
  edgeId?: string;
  at: number;
};
export type RunState = {
  id: string;
  status: "running" | "completed" | "failed";
  activeNodeId?: string;
  steps: StepRecord[];
  logs: LogLine[];
  error?: string;
  finalNodeId?: string;
};
