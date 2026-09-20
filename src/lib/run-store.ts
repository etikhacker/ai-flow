import { createClient } from "@supabase/supabase-js";
import type { Answer, RunState } from "./types";

const db = () =>
  createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

const line = (msg: string, level: "info" | "error" = "info") => ({ t: Date.now(), level, msg });

async function load(id: string): Promise<RunState | undefined> {
  const { data } = await db().from("runs").select("state").eq("id", id).maybeSingle();
  return data?.state as RunState | undefined;
}
async function save(r: RunState) {
  await db().from("runs").upsert({ id: r.id, state: r });
}
async function update(id: string, fn: (r: RunState) => void) {
  const r = await load(id);
  if (!r) return;
  fn(r);
  await save(r);
}

export const runStore = {
  init: (id: string) =>
    save({ id, status: "running", steps: [], logs: [line("Run queued in Inngest")] }),
  get: load,
  start: (id: string, nodeId: string, label: string) =>
    update(id, (r) => {
      r.activeNodeId = nodeId;
      r.logs.push(line(`▶ ${label}`));
    }),
  record: (id: string, nodeId: string, label: string, answer: Answer | undefined, edgeId?: string) =>
    update(id, (r) => {
      r.steps.push({ nodeId, label, answer, edgeId, at: Date.now() });
      if (answer) r.logs.push(line(`${label} → ${answer}`));
    }),
  complete: (id: string, finalNodeId?: string, note?: string) =>
    update(id, (r) => {
      r.status = "completed";
      r.activeNodeId = undefined;
      r.finalNodeId = finalNodeId;
      r.logs.push(line(note ?? "Run completed"));
    }),
  fail: (id: string, error: string) =>
    update(id, (r) => {
      r.status = "failed";
      r.error = error;
      r.logs.push(line(error, "error"));
    }),
};