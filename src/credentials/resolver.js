/**
 * Credential resolver, scoped per client. The admin registry is a committed, non-secret
 * default (`registry.default.json`) overlaid with the dashboard-written
 * `orchestrator.mcp.json` (gitignored) when present. Shared (agency) keys come from
 * process.env (how Railway supplies secrets), with the system `.env` file overriding for
 * local/dashboard use. Per-client `client-owned` keys come from `clients/<id>.env`.
 */
import { join } from 'node:path';
import { loadAdminToolConfig, loadEnvFile, resolveCredential, resolveSessionTools } from './engine.js';
import { config } from '../config.js';

const sanitize = (id) => String(id).replace(/[^A-Za-z0-9_-]/g, '_');

export function makeCredentialResolver(dir = config.credentialsDir) {
  const defaults = loadAdminToolConfig(join(dir, 'registry.default.json'));
  const override = loadAdminToolConfig(join(dir, 'orchestrator.mcp.json'));
  const admin = { tools: { ...defaults.tools, ...override.tools } };
  // pick() (engine.js) limits use to each tool's declared envKeys, so spreading process.env
  // here can't leak unrelated vars; the system .env file overrides process.env when present.
  const adminEnv = { ...process.env, ...loadEnvFile(join(dir, '.env')) };
  const clientEnvCache = new Map();
  const clientEnv = (clientId) => {
    if (!clientId) return {};
    if (!clientEnvCache.has(clientId)) {
      clientEnvCache.set(clientId, loadEnvFile(join(dir, 'clients', `${sanitize(clientId)}.env`)));
    }
    return clientEnvCache.get(clientId);
  };

  /** Per-tool status for a client (no secrets) — mirrors the dashboard client view. */
  function statusForClient(clientId) {
    const cEnv = clientEnv(clientId);
    const client = clientId ? { clientId, overrides: {} } : undefined;
    return Object.entries(admin.tools).map(([token, t]) => {
      const cred = resolveCredential(token, admin, client, { adminEnv, clientEnv: cEnv });
      const envKeys = t.envKeys ?? [];
      const providedKeys = envKeys.filter((k) => cEnv[k] !== undefined);
      return {
        token,
        policy: t.policy ?? 'shared',
        envKeys,
        providedKeys,
        available: cred.available,
        source: cred.source,
        reason: cred.reason
      };
    });
  }

  /** Resolve credentials/env for a tool call, scoped to a client (for internal tool handlers). */
  function resolveForClient(clientId, tokens) {
    return resolveSessionTools(tokens, admin, clientId ? { clientId, overrides: {} } : undefined, {
      adminEnv,
      clientEnv: clientEnv(clientId)
    });
  }

  return { statusForClient, resolveForClient, tokens: () => Object.keys(admin.tools) };
}
