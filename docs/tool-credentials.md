# Tool Credentials — Admin Defaults & Client Overrides

How tool API keys are set and scoped for the MCP server / orchestrator, and the contract the
**admin/client dashboard** writes to. The goal: an admin configures every tool once, and each
tool is either **shared** with clients or **owned by the client** — so a project can run on the
client's own resources and tenants never cross-pollinate.

## The model

Every credentialed tool token (`dataforseo`, `coda`, `square-sdk`, `framer`, `squarespace`,
`canva`, `figma`, …) has a **policy** the admin sets:

| Policy | Meaning | Whose key runs |
|---|---|---|
| `shared` | The admin's key is **exposed to clients** (the agency's shared resource). A client may still override with their own. | client's own if they set one, else the admin's |
| `client-owned` | The client **must supply their own key**. The admin key is **never** used for that client. If the client hasn't connected the tool, it is **unavailable** for that client's run. | client's own only |

**Isolation rule (prevents cross-pollination):** a `client-owned` tool with no client key does
**not** fall back to the admin key — it's reported unavailable. A run is scoped to one client, so
its work only ever touches that client's resources.

## Keys live in `.env` (not in the JSON)

Secrets are supplied via `.env` files; the JSON registry only declares each tool's `policy` and
the env var **names** it needs (`envKeys`). Two `.env` files:

- **System `.env`** (`--env`, default `<context>/.env`; see `orchestrator/.env.example`) — used to
  build/run the orchestrator: `ANTHROPIC_API_KEY` (+ provider flags) and the agency's **shared**
  tool keys. The runtime puts only the SDK/runtime vars into `process.env`; shared tool keys stay
  in a map and are injected **per tool** (so they never blanket-leak into a client-owned session).
- **Client `.env`** (`--client-env`; see `orchestrator/client.env.example`) — the file a client
  **uploads** in the dashboard to do client-specific work. It holds that client's keys for
  `client-owned` tools (and optional overrides of shared tools). Parsed into a map, never written
  to `process.env`, and injected only into that client's run via the SDK's per-session `options.env`.

`resolveCredential` maps each tool's `envKeys` to values from the **system** `.env` (shared) or the
**client** `.env` (client-owned / override), enforcing the isolation rule. Both `.env` files are
gitignored and belong in a secret store.

## Two config surfaces (what the dashboard manages)

**1. Admin tool registry** — `orchestrator.mcp.json` (see `orchestrator.mcp.example.json`). The
admin sets, per tool: `policy`, the admin `env` keys (for `shared` tools), and an optional MCP
`command`/`args`. This is the "admin sets all tool APIs for the MCP server" surface.

```jsonc
{ "tools": {
  "dataforseo": { "policy": "shared", "command": "npx", "args": ["-y","dataforseo-mcp-server"],
                  "env": { "DATAFORSEO_USERNAME": "...", "DATAFORSEO_PASSWORD": "..." } },
  "square-sdk": { "policy": "client-owned" }   // each client brings their own
} }
```

**2. Per-client overrides** — one file per client, e.g. `clients/acme.json` (see
`clients.example.json`). The client's own API keys, per tool. Required for `client-owned` tools;
optional for `shared`.

```jsonc
{ "clientId": "acme", "overrides": {
  "square-sdk": { "env": { "SQUARE_ACCESS_TOKEN": "...", "SQUARE_ENV": "production" } }
} }
```

Both files hold secrets → **gitignored**, written by the dashboard to a secret store, never committed.

## How the orchestrator applies it

`runner/tool-credentials.ts` resolves, per `(tool, client)`, which credentials apply and whether
the tool is available (enforcing the isolation rule). `runner/mcp-config.ts#resolveSessionTools`
turns a skill's `tools:` into the session's `env` (injected via the Agent SDK's per-session
`options.env`, so parallel client runs never share `process.env`), MCP servers, and an
`unavailable` list. Run scoping:

```bash
# Admin/shared resources (default):
npx tsx src/cli.ts --context ./runs/acme --goal "..."
# Scope the run to a client (their own keys for client-owned tools):
npx tsx src/cli.ts --context ./runs/acme --goal "..." --tools orchestrator.mcp.json --client clients/acme.json
```

A skill that needs a `client-owned` tool the client hasn't connected logs
`⚠ tool "<x>" unavailable — … client isolation enforced` and proceeds without it.

## Dashboard checklist
- **Admin view:** list every tool; set `policy` (shared / client-owned); enter the admin key for
  shared tools; (optional) MCP launch. Writes the admin registry.
- **Client view:** for each tool, show shared (uses agency key) vs client-owned (needs your key);
  let the client **upload a `.env`** (or paste keys), with a "Test connection" per tool (e.g.
  Square's `locations.list`). The upload becomes that client's `.env` / overrides for the run.
- **Never** render or store a key in plaintext outside the secret store; never commit either file.
