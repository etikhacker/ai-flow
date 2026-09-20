"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  addEdge,
  Background,
  Controls,
  MarkerType,
  MiniMap,
  ReactFlow,
  ReactFlowProvider,
  useEdgesState,
  useNodesState,
  type Connection,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { Download, Flag, GitBranch, Play, Trash2, Upload } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { DecisionNode, ResultNode } from "./nodes";
import { edgeTypes } from "./edges";
import { LogsPanel } from "./logs-panel";
import { EditorErrorBoundary } from "./editor-error-boundary";
import {
  defaultEdges,
  defaultNodes,
  fromGraph,
  isGraph,
  STORAGE_KEY,
  toGraph,
} from "@/lib/graph";
import type { Answer, DecisionData, FlowEdge, FlowNode, NodeStatus, RunState } from "@/lib/types";

const nodeTypes = { decision: DecisionNode, result: ResultNode };

/**
 * Top-level wrapper. `useNodesState` / `useEdgesState` / `useReactFlow`
 * read from the store, so they need a `ReactFlowProvider` somewhere up the tree.
 * Without it, polling-driven re-renders can corrupt the effect list and crash
 * the reconciler with "u is not a function" during commit.
 *
 * The EditorErrorBoundary catches any React rendering / commit error and
 * remounts the editor subtree, so a transient third-party crash never leaves
 * the user staring at a blank page.
 */
export function Editor() {
  return (
    <EditorErrorBoundary>
      <ReactFlowProvider>
        <EditorInner />
      </ReactFlowProvider>
    </EditorErrorBoundary>
  );
}

function EditorInner() {
  const [nodes, setNodes, onNodesChange] = useNodesState<FlowNode>(defaultNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState<FlowEdge>(defaultEdges);
  const [input, setInput] = useState("My invoice is wrong and I can't log in to my account.");
  const [run, setRun] = useState<RunState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const pollRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ---- Local persistence -------------------------------------------------
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (isGraph(parsed)) {
          const g = fromGraph(parsed);
          setNodes(g.nodes);
          setEdges(g.edges);
        }
      }
    } catch {}
    setHydrated(true);
  }, [setNodes, setEdges]);

  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(toGraph(nodes, edges)));
  }, [nodes, edges, hydrated]);

  // ---- Graph editing -----------------------------------------------------
  const onConnect = useCallback(
    (c: Connection) => {
      const branch = c.sourceHandle === "no" ? "no" : "yes";
      setEdges((eds) =>
        addEdge(
          { ...c, id: `e-${c.source}-${branch}`, type: branch, markerEnd: { type: MarkerType.ArrowClosed } },
          // one target per branch: replace an existing edge from the same handle
          eds.filter((e) => !(e.source === c.source && e.sourceHandle === c.sourceHandle)),
        ),
      );
    },
    [setEdges],
  );

  const addNode = (type: "decision" | "result") => {
    const id = `n${Date.now().toString(36)}`;
    const count = nodes.length + 1;
    const node: FlowNode = {
      id,
      type,
      position: { x: 120 + (count % 5) * 40, y: 80 + (count % 5) * 50 },
      data:
        type === "decision"
          ? ({ label: `Question ${count}`, prompt: "" } as DecisionData)
          : { label: `Result ${count}` },
    };
    setNodes((ns) => ns.map((n) => ({ ...n, selected: false })).concat({ ...node, selected: true }));
  };

  const selected = nodes.find((n) => n.selected);

  const patchSelected = (patch: Partial<DecisionData>) =>
    setNodes((ns) => ns.map((n) => (n.id === selected?.id ? { ...n, data: { ...n.data, ...patch } } : n)));

  const deleteSelected = () => {
    if (!selected) return;
    setNodes((ns) => ns.filter((n) => n.id !== selected.id));
    setEdges((es) => es.filter((e) => e.source !== selected.id && e.target !== selected.id));
  };

  // ---- Import / export ---------------------------------------------------
  const exportJson = () => {
    const blob = new Blob([JSON.stringify(toGraph(nodes, edges), null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "workflow.json";
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const importJson = async (file: File) => {
    try {
      const parsed = JSON.parse(await file.text());
      if (!isGraph(parsed)) throw new Error("Not a valid workflow file");
      const g = fromGraph(parsed);
      setNodes(g.nodes);
      setEdges(g.edges);
      setRun(null);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not import file");
    }
  };

  // ---- Execution ---------------------------------------------------------
  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearTimeout(pollRef.current);
      pollRef.current = null;
    }
  }, []);
  useEffect(() => {
    return () => {
      cancelledRef.current = true;
      stopPolling();
    };
  }, [stopPolling]);

  // Guard against polling-driven re-renders crashing if the component unmounts
  // mid-flight or the network call throws synchronously.
  const cancelledRef = useRef(false);

  const poll = useCallback((runId: string) => {
    stopPolling();
    cancelledRef.current = false;
    const tick = async () => {
      if (cancelledRef.current) return;
      try {
        const res = await fetch(`/api/runs/${runId}`, { cache: "no-store" });
        if (cancelledRef.current) return;
        if (res.ok) {
          const state: RunState = await res.json();
          if (cancelledRef.current) return;
          setRun(state);
          if (state.status !== "running") return;
        } else if (res.status >= 500) {
          // transient server error: back off instead of hot-looping
          pollRef.current = setTimeout(tick, 2000);
          return;
        }
      } catch {
        // network blip: back off and retry
        if (!cancelledRef.current) pollRef.current = setTimeout(tick, 2000);
        return;
      }
      if (!cancelledRef.current) pollRef.current = setTimeout(tick, 600);
    };
    tick();
  }, [stopPolling]);

  const start = async () => {
    stopPolling();
    cancelledRef.current = false;
    setError(null);
    setRun(null);
    const res = await fetch("/api/run", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ graph: toGraph(nodes, edges), input }),
    });
    let body: { runId?: string; error?: string } = {};
    try {
      body = await res.json();
    } catch {
      body = { error: `Server returned ${res.status}` };
    }
    if (!res.ok) {
      setError(body.error ?? `Failed to start run (${res.status})`);
      return;
    }
    if (body.runId) poll(body.runId);
  };

  const running = run?.status === "running";

  // ---- Visual execution state -------------------------------------------
  // Important: return the SAME reference when nothing actually changed so
  // that polling updates don't churn xyflow's internal effect list. A churn
  // here crashes React 19's commit phase with "u is not a function".
  const viewNodes = useMemo(() => {
    if (!run) return nodes;
    const done = new Map(run.steps.map((s) => [s.nodeId, s]));
    let anyChanged = false;
    const next = nodes.map((n) => {
      let status: NodeStatus = "idle";
      if (done.has(n.id)) status = "done";
      if (run.activeNodeId === n.id) status = "running";
      if (run.status === "failed" && run.activeNodeId === n.id) status = "error";
      const answer = done.get(n.id)?.answer;
      const curStatus = (n.data as { status?: NodeStatus }).status;
      const curAnswer = (n.data as { answer?: Answer }).answer;
      if (curStatus === status && curAnswer === answer) return n;
      anyChanged = true;
      return { ...n, data: { ...n.data, status, answer } };
    });
    return anyChanged ? next : nodes;
  }, [nodes, run]);

  const viewEdges = useMemo(() => {
    if (!run) return edges;
    const taken = new Set(run.steps.map((s) => s.edgeId).filter(Boolean));
    let anyChanged = false;
    const next = edges.map((e) => {
      const active = taken.has(e.id);
      const cur = (e.data as { active?: boolean } | undefined)?.active;
      if (cur === active) return e;
      anyChanged = true;
      return { ...e, data: { active } };
    });
    return anyChanged ? next : edges;
  }, [edges, run]);

  const finalLabel = run?.finalNodeId ? nodes.find((n) => n.id === run.finalNodeId)?.data.label : null;

  return (
    <div className="flex h-screen">
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex flex-wrap items-center gap-2 border-b px-4 py-2">
          <h1 className="mr-2 text-sm font-semibold">AI Flow</h1>
          <Button size="sm" variant="outline" onClick={() => addNode("decision")}>
            <GitBranch className="h-3.5 w-3.5" /> Add question
          </Button>
          <Button size="sm" variant="outline" onClick={() => addNode("result")}>
            <Flag className="h-3.5 w-3.5" /> Add result
          </Button>
          <div className="ml-auto flex items-center gap-2">
            <Button size="sm" variant="ghost" onClick={exportJson}>
              <Download className="h-3.5 w-3.5" /> Export
            </Button>
            <Button size="sm" variant="ghost" onClick={() => fileRef.current?.click()}>
              <Upload className="h-3.5 w-3.5" /> Import
            </Button>
            <input
              ref={fileRef}
              type="file"
              accept="application/json"
              hidden
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) importJson(f);
                e.target.value = "";
              }}
            />
            <Button size="sm" onClick={start} disabled={running}>
              <Play className="h-3.5 w-3.5" /> {running ? "Running…" : "Run workflow"}
            </Button>
          </div>
        </header>

        <div className="relative flex-1">
          <ReactFlow
            nodes={viewNodes}
            edges={viewEdges}
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            fitView
            deleteKeyCode={["Backspace", "Delete"]}
          >
            <Background gap={20} />
            <Controls showInteractive={false} />
            <MiniMap pannable zoomable className="!bg-muted" />
          </ReactFlow>
        </div>

        <div className="h-44 border-t">
          <LogsPanel logs={run?.logs ?? []} status={run?.status} />
        </div>
      </div>

      <aside className="flex w-72 shrink-0 flex-col gap-5 overflow-auto border-l p-4">
        <section className="space-y-2">
          <label className="text-sm font-medium" htmlFor="input">
            Workflow input
          </label>
          <Textarea id="input" value={input} onChange={(e) => setInput(e.target.value)} rows={4} />
          <p className="text-xs text-muted-foreground">
            Every question node is answered against this text.
          </p>
        </section>

        {error && (
          <p role="alert" className="rounded-md border border-destructive/40 bg-destructive/5 p-2 text-xs text-destructive">
            {error}
          </p>
        )}

        {run?.status === "completed" && (
          <p className="rounded-md border border-yes/40 bg-yes/5 p-2 text-xs">
            Finished at <strong>{finalLabel}</strong> after {run.steps.length} step
            {run.steps.length === 1 ? "" : "s"}.
          </p>
        )}
        {run?.status === "failed" && (
          <p role="alert" className="rounded-md border border-destructive/40 bg-destructive/5 p-2 text-xs text-destructive">
            Run failed: {run.error}
          </p>
        )}

        {run && run.steps.length > 0 && (
          <section className="space-y-1">
            <h2 className="text-sm font-medium">Execution order</h2>
            <ol className="list-decimal space-y-0.5 pl-4 text-xs">
              {run.steps.map((s, i) => (
                <li key={i}>
                  {s.label}
                  {s.answer && (
                    <span className={s.answer === "YES" ? "ml-1 text-yes" : "ml-1 text-no"}>{s.answer}</span>
                  )}
                </li>
              ))}
            </ol>
          </section>
        )}

        <section className="space-y-2 border-t pt-4">
          <h2 className="text-sm font-medium">Selected node</h2>
          {!selected && <p className="text-xs text-muted-foreground">Click a node to edit it.</p>}
          {selected && (
            <>
              <Input
                value={selected.data.label}
                onChange={(e) => patchSelected({ label: e.target.value })}
                aria-label="Node name"
              />
              {selected.type === "decision" && (
                <Textarea
                  rows={5}
                  placeholder="Write a yes/no question, e.g. Is this a support request?"
                  value={(selected.data as DecisionData).prompt}
                  onChange={(e) => patchSelected({ prompt: e.target.value })}
                  aria-label="Node prompt"
                />
              )}
              <Button size="sm" variant="outline" onClick={deleteSelected}>
                <Trash2 className="h-3.5 w-3.5" /> Delete node
              </Button>
            </>
          )}
        </section>
      </aside>
    </div>
  );
}
