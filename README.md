# AI Flow — visual YES/NO AI workflows

Each node is an AI decision step that answers `YES` or `NO`. The graph is edited
with **React Flow** and executed durably with **Inngest** (one Inngest step per node).

## Stack
Next.js 15 (App Router) · React Flow (`@xyflow/react`) · Inngest · OpenAI SDK · shadcn-style UI (Tailwind + cva)

## Setup
```bash
npm install
cp .env.example .env.local     # add OPENAI_API_KEY
npm run dev                    # terminal 1 → http://localhost:3000
npm run inngest                # terminal 2 → Inngest dev UI http://localhost:8288
```
`OPENAI_BASE_URL` lets you point the SDK at any OpenAI-compatible API (e.g. OpenRouter).

## How it works
1. Editor: add **question** nodes (with a prompt) and **result** nodes, drag from the
   green `YES` / red `NO` handle to connect. Graph autosaves to `localStorage`.
2. **Run workflow** → `POST /api/run` sends a `workflow/run` event with `{graph, input}`.
3. `src/inngest/functions.ts` walks the graph: for each node
   `step.run("decide-…")` → LLM must reply exactly `YES`/`NO` → follow the matching edge.
   Ends at a result node, a node with no outgoing edge for the answer, or after 25 steps (cycle guard).
4. The UI polls `GET /api/runs/:id` and highlights the active node, taken edges and logs.

## Polish features implemented
- Visual execution state (pulsing running node, done/error borders, YES/NO badges)
- Animated active edges (path actually taken)
- Execution logs panel + execution order list
- JSON export / import
- Error handling: invalid model output is rejected, Inngest retries each step 3×, failures surface in the UI

## Notes
- Run state lives in an in-memory store (`src/lib/run-store.ts`) — fine for local dev;
  swap for Redis/Supabase in production.
- Tests: `parseAnswer` in `src/lib/llm.ts` is the strict YES/NO contract.
