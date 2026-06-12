import express from 'express';
import {
  readAdminConfig,
  writeAdminConfig,
  readSystemEnv,
  readClientEnv,
  saveClientEnv,
} from './config';
import { testConnection } from './connection-test';
import type {
  AdminTool,
  AdminToolsResponse,
  ClientStatusResponse,
  ToolPolicy,
  ToolClientStatus,
} from '../src/lib/types';

const app = express();
app.use(express.json({ limit: '256kb' }));

/** Admin: the tool registry + which shared keys are present in the system .env. */
app.get('/api/admin/tools', (_req, res) => {
  const cfg = readAdminConfig();
  const sysEnv = readSystemEnv();
  const systemEnvKeys: Record<string, boolean> = {};
  for (const t of Object.values(cfg.tools))
    for (const k of t.envKeys ?? []) systemEnvKeys[k] = Boolean(sysEnv[k] ?? process.env[k]);
  const body: AdminToolsResponse = { configPath: 'orchestrator.mcp.json', tools: cfg.tools, systemEnvKeys };
  res.json(body);
});

/** Admin: save the registry (policy/envKeys/launch only — never secrets). */
app.put('/api/admin/tools', (req, res) => {
  const tools = (req.body?.tools ?? {}) as Record<string, AdminTool>;
  writeAdminConfig(tools);
  res.json({ ok: true });
});

/** Client: per-tool status (shared vs client-owned, what they've connected). */
app.get('/api/client/:id', (req, res) => {
  const clientId = req.params.id;
  const cfg = readAdminConfig();
  const env = readClientEnv(clientId);
  const tools: ToolClientStatus[] = Object.entries(cfg.tools).map(([token, t]) => {
    const policy: ToolPolicy = t.policy ?? 'shared';
    const envKeys = t.envKeys ?? [];
    const providedKeys = envKeys.filter((k) => env[k] !== undefined);
    const connected =
      policy === 'shared' ? true : envKeys.length > 0 && providedKeys.length === envKeys.length;
    return { token, policy, envKeys, providedKeys, connected };
  });
  const body: ClientStatusResponse = { clientId, tools };
  res.json(body);
});

/** Client: upload a .env (or pasted body) → saved to the client's gitignored env file. */
app.post('/api/client/:id/env', (req, res) => {
  const content = String(req.body?.content ?? '');
  if (!content.trim()) return res.status(400).json({ ok: false, error: 'empty .env content' });
  const keys = saveClientEnv(req.params.id, content);
  res.json({ ok: true, keys });
});

/** Per-tool connection test (Square = live locations.list; others = key-presence). */
app.post('/api/test-connection', async (req, res) => {
  const token = String(req.body?.token ?? '');
  const clientId = req.body?.clientId ? String(req.body.clientId) : undefined;
  const cfg = readAdminConfig();
  const tool = cfg.tools[token];
  if (!tool) return res.status(404).json({ ok: false, detail: `unknown tool: ${token}`, live: false });
  const env =
    (tool.policy ?? 'shared') === 'client-owned'
      ? clientId
        ? readClientEnv(clientId)
        : {}
      : { ...readSystemEnv(), ...(clientId ? readClientEnv(clientId) : {}) };
  res.json(await testConnection(token, tool, env));
});

const PORT = Number(process.env.PORT ?? 8787);
app.listen(PORT, () => console.log(`tool-credentials API on :${PORT}`));
