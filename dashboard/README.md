# Tool-Credentials Dashboard

The admin/client credential dashboard for the 8gent orchestrator — built by **8gentic-web-dev**
(custom-code: Vite + React + TS UI, Express API) to the design from **8gentic-designer**
([`DESIGN.md`](DESIGN.md)), implementing the contract in
[`../docs/tool-credentials.md`](../docs/tool-credentials.md).

## What it does
- **Admin** — a tool registry: set each tool's **policy** (`shared` ⇄ `client-owned`), see its env
  keys, and whether shared keys are present in the system `.env`. Saves `orchestrator.mcp.json`
  (policy/envKeys only — never secrets).
- **Client** — connect a client's tools: shared tools use the agency key; **client-owned** tools
  let the client **upload a `.env`** (drag-drop or pick) or paste keys, with a **Test connection**
  per tool (Square runs a live `locations.list`; others do a key-presence check). The upload is
  saved to `orchestrator/clients/<id>.env` (gitignored) — only that client's keys, never mixed.

The dashboard reads/writes the **same files** the orchestrator uses, so what you set here is what
runs. Point it at a different orchestrator dir with `ORCH_DIR=/path/to/orchestrator`.

## Run
```bash
cd dashboard
npm install
npm run dev          # Express API on :8787 + Vite UI on :5173 (proxied)
# open http://localhost:5173
```
`npm run typecheck` type-checks UI + server; `npm run build` builds the UI.

## Platform choice (8gentic-web-dev)
A credential console needs auth-gated forms, file upload, and live API calls — an **app**, not a
marketing site. Per the web-dev platform router that's the **custom-code** path (React + a small
API), not Framer/Squarespace.

## Layout
```
DESIGN.md                 8gentic-designer spec
src/styles/tokens.css     design tokens (the design source of truth)
src/pages/AdminView.tsx   tool registry + policy toggles
src/pages/ClientView.tsx  per-client connect: .env upload + Test connection
src/lib/{types,api}.ts    types (mirror the orchestrator) + fetch wrappers
server/index.ts           Express API (read/write config, upload .env, test connection)
server/config.ts          reads/writes orchestrator.mcp.json + client .env (ORCH_DIR)
server/connection-test.ts per-tool test (Square live; others key-presence)
```
