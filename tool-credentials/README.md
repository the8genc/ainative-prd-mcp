# Tool Credentials

Multi-tenant tool-credential engine for the 8genc MCP server. The admin registers every tool's
API config with a per-tool **policy**; each tool is either **shared** (the agency key, from the
system `.env`, is exposed to clients) or **client-owned** (the client must bring their own key via
their uploaded `.env` — the admin key is never used, so tenants don't cross-pollinate). Managed by
the [`../dashboard`](../dashboard) UI; full model + contract in
[`../docs/tool-credentials.md`](../docs/tool-credentials.md).

Ported from `ai-8gent-skills` PRs #21 (credential model) and #22 (.env support).

## Use
```ts
import { loadAdminToolConfig, loadEnvFile } from './src/tool-credentials';
import { resolveSessionTools } from './src/mcp-config';

const admin = loadAdminToolConfig('orchestrator.mcp.json');   // policy + envKeys (no secrets)
const adminEnv = loadEnvFile('.env');                         // agency shared keys
const clientEnv = loadEnvFile('clients/acme.env');            // a client's uploaded keys
const session = resolveSessionTools(['dataforseo', 'square-sdk'], admin,
  { clientId: 'acme', overrides: {} }, { adminEnv, clientEnv });
// session.env → inject into the MCP tool call; session.unavailable → client-owned tools not connected
```

Isolation rule: a `client-owned` tool with no client key resolves to **unavailable** — it never
falls back to the admin key.

## Files
```
src/tool-credentials.ts   policy model, .env loaders, resolveCredential (isolation enforced)
src/mcp-config.ts         resolveSessionTools → per-session env + MCP servers + unavailable list
test/credentials.test.ts  policy matrix + .env resolution + isolation (vitest)
examples/                 tools.example.json (admin registry), clients.example.json, client.env.example
```
`npm install && npm test` to verify; `npm run typecheck` to type-check.
