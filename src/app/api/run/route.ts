import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { inngest } from "@/inngest/client";
import { runStore } from "@/lib/run-store";
import type { Graph } from "@/lib/types";

export async function POST(req: Request) {
  const { graph, input } = (await req.json()) as { graph: Graph; input: string };

  if (!graph?.nodes?.length) {
    return NextResponse.json({ error: "Graph is empty" }, { status: 400 });
  }
  const bad = graph.nodes.find((n) => n.type === "decision" && !n.prompt?.trim());
  if (bad) {
    return NextResponse.json({ error: `Node "${bad.label}" has no prompt` }, { status: 400 });
  }

  const runId = randomUUID();
  runStore.init(runId);
  try {
    await inngest.send({ name: "workflow/run", data: { runId, graph, input } });
  } catch {
    runStore.fail(runId, "Could not reach Inngest. Is `npm run inngest` running?");
    return NextResponse.json({ error: "Could not reach Inngest dev server" }, { status: 502 });
  }
  return NextResponse.json({ runId });
}
