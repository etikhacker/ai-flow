import type { Answer, RunState } from "./types";

/**
 * In-memory run store shared between the Inngest function and the polling API.
 * Works for local dev (single Node process). For production replace with
 * Redis / Postgres / Supabase — the interface stays the same.
 */
const g = globalThis as unknown as { __runs?: Map<string, RunState> };
const runs = (g.__runs ??= new Map<string, RunState>());

const log = (r: RunState, msg: string, level: "info" | "error" = "info") =>
  r.logs.push({ t: Date.now(), level, msg });

export const runStore = {
  init(id: string) {
    const r: RunState = { id, status: "running", steps: [], logs: [] };
    log(r, "Run queued in Inngest");
    runs.set(id, r);
  },
  get: (id: string) => runs.get(id),
  start(id: string, nodeId: string, label: string) {
    const r = runs.get(id);
    if (!r) return;
    r.activeNodeId = nodeId;
    log(r, `▶ ${label}`);
  },
  record(id: string, nodeId: string, label: string, answer: Answer | undefined, edgeId?: string) {
    const r = runs.get(id);
    if (!r) return;
    r.steps.push({ nodeId, label, answer, edgeId, at: Date.now() });
    if (answer) log(r, `${label} → ${answer}`);
  },
  complete(id: string, finalNodeId?: string, note?: string) {
    const r = runs.get(id);
    if (!r) return;
    r.status = "completed";
    r.activeNodeId = undefined;
    r.finalNodeId = finalNodeId;
    log(r, note ?? "Run completed");
  },
  fail(id: string, error: string) {
    const r = runs.get(id);
    if (!r) return;
    r.status = "failed";
    r.error = error;
    log(r, error, "error");
  },
  warn(id: string, msg: string) {
    const r = runs.get(id);
    if (r) log(r, msg, "error");
  },
};
