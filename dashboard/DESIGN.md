# Tool-Credentials Dashboard — Design (8gentic-designer)

Design lead output for the dashboard `8gentic-web-dev` implements. Drives the contract in
[`../docs/tool-credentials.md`](../docs/tool-credentials.md).

## Intake
- **Objective:** let an admin register every tool's API config + policy, and let a client connect
  their own keys (upload a `.env`) for client-owned tools — without ever exposing the admin's key
  for a client-owned tool (no cross-pollination).
- **Users:** *Admin* (agency operator) and *Client* (a tenant connecting their own accounts).
- **Tone:** a trustworthy, calm operations console — dense but legible, status-forward, no fluff.
  Security-cue language ("isolated", "your own key", "shared agency key").

## Screens (UX / UI structure)

**1. Admin — Tool Registry**
- Table of tools: token · **policy** (toggle: `shared` ⇄ `client-owned`) · required env keys ·
  shared-key status (✓ set in system `.env` / ✗ missing) · optional MCP launch.
- Header: connection to the orchestrator config file; a "shared keys come from the system `.env`" note.
- Saving writes `orchestrator.mcp.json` (policy/envKeys only — never secrets).

**2. Client — Connect Tools**
- Client selector (id) at top.
- Per-tool **cards**: name · policy badge (`shared` = uses agency key; `client-owned` = needs yours)
  · status (connected / not connected / shared) · for client-owned: **Upload `.env`** (drag-drop)
  or paste keys, and a **Test connection** button (Square → `locations.list`; others → key-present).
- A whole-account **".env upload"** dropzone that fans keys out to the right tools by `envKeys`.

## Visual system (design tokens)
A focused, professional admin palette — neutral slate canvas, a single indigo accent, semantic
green/amber/red for connection status. System font stack for speed. Tokens live in
`src/styles/tokens.css` (CSS variables), the implementation source of truth:

- **Color:** `--bg`, `--surface`, `--border`, `--text`, `--muted`, `--accent` (indigo),
  `--ok` (green), `--warn` (amber), `--danger` (red).
- **Type:** system stack; sizes `--fs-1..4`; weight 600 for labels/headings.
- **Space/Radius:** 4px scale (`--sp-1..6`); `--radius` 8px; subtle `--shadow`.
- **Status semantics:** shared = neutral/indigo; client-connected = green; client-owned-missing = amber; error = red.

## Component inventory
`PolicyToggle`, `StatusBadge`, `ToolRow` (admin), `ToolCard` (client), `EnvDropzone`,
`KeyFields`, `TestConnectionButton`, `Tabs` (Admin/Client). Each maps a token's policy + state to
a clear, single-glance status — the design's job is to make "whose key is this, and is it live?"
obvious at all times.

## Notes
- Sub-agents (`8gentic-figma-designer` / `8gentic-canva-designer` / `8gentic-claude-designer`)
  would generate/iterate hi-fi variants if their accounts were connected; here the lead produced
  the system directly (tokens + structure) so the build can proceed.
- Secrets are never rendered back in plaintext after entry; fields show "•••• set" status only.
