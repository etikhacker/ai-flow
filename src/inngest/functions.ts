import { inngest } from "./client";
import { askYesNo } from "@/lib/llm";
import { runStore } from "@/lib/run-store";
import type { Graph } from "@/lib/types";

const MAX_STEPS = 25; // guards against cycles in the graph

type RunEvent = { runId: string; graph: Graph; input: string };

export const runWorkflow = inngest.createFunction(
  {
    id: "run-workflow",
    retries: 3, // each failed step (LLM error / invalid answer) is retried by Inngest
    onFailure: async ({ event, error }) => {
      const runId = (event.data as { event: { data: RunEvent } }).event.data.runId;
      await runStore.fail(runId, error.message);
    },
  },
  { event: "workflow/run" },
  async ({ event, step }) => {
    const { runId, graph, input } = event.data as RunEvent;
    const nodes = new Map(graph.nodes.map((n) => [n.id, n]));

    // Entry node = first node without incoming edges.
    const targets = new Set(graph.edges.map((e) => e.target));
    let current = graph.nodes.find((n) => !targets.has(n.id))?.id;
    if (!current) throw new Error("Graph has no start node");

    const path: string[] = [];

    for (let i = 0; i < MAX_STEPS && current; i++) {
      const node = nodes.get(current);
      if (!node) throw new Error(`Node ${current} not found`);
      const nodeId = node.id;

      // Terminal node: nothing to ask, the branch ends here.
      if (node.type === "result") {
        await step.run(`result-${i}-${nodeId}`, async () => {
          await runStore.start(runId, nodeId, node.label);
          await runStore.record(runId, nodeId, node.label, undefined);
          await runStore.complete(runId, nodeId, `Reached "${node.label}"`);
        });
        path.push(nodeId);
        return { runId, path, finalNodeId: nodeId };
      }

      await step.run(`start-${i}-${nodeId}`, () =>
        runStore.start(runId, nodeId, node.label),
      );

      // One Inngest step per node -> retried and memoized independently.
      const answer = await step.run(`decide-${i}-${nodeId}`, () =>
        askYesNo(node.prompt ?? "", input),
      );

      const branch = answer === "YES" ? "yes" : "no";
      const edge = graph.edges.find((e) => e.source === nodeId && e.branch === branch);

      await step.run(`record-${i}-${nodeId}`, () =>
        runStore.record(runId, nodeId, node.label, answer, edge?.id),
      );
      path.push(nodeId);

      if (!edge) {
        await step.run(`end-${i}`, () =>
          runStore.complete(runId, nodeId, `No ${answer} edge from "${node.label}" — run ended`),
        );
        return { runId, path, finalNodeId: nodeId };
      }
      current = edge.target;
    }

    await step.run("max-steps", () =>
      runStore.fail(runId, `Stopped after ${MAX_STEPS} steps (possible cycle)`),
    );
    return { runId, path, finalNodeId: null };
  },
);
