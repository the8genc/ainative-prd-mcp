import { existsSync, readFileSync } from 'node:fs';
import { parse as parseEnv } from 'dotenv';

/**
 * Multi-tenant tool credentials.
 *
 * The admin registers every tool's API config for the MCP server. Each tool has a policy:
 *  - `shared`       — the admin's key is exposed to clients (the agency's shared resource);
 *  - `client-owned` — the client MUST supply their own key; the admin key is NEVER used for
 *                     that client. This is how a project uses the client's own resources and
 *                     keeps clients isolated (no cross-pollination).
 *
 * A client may also override a `shared` tool with their own key (their override always wins).
 * These two config shapes are exactly what the admin/client dashboard writes.
 */

export type ToolPolicy = 'shared' | 'client-owned';

export interface AdminTool {
  /** default 'shared'. */
  policy?: ToolPolicy;
  /** env var NAMES this tool consumes — resolved from the system/client .env (no secrets in JSON). */
  envKeys?: string[];
  /** inline literal env (alternative to .env; kept for back-compat). */
  env?: Record<string, string>;
  /** optional MCP server launch for this tool. */
  command?: string;
  args?: string[];
}

/** Parsed .env files: the system/admin env and (optionally) the active client's uploaded env. */
export interface EnvSources {
  adminEnv?: Record<string, string>;
  clientEnv?: Record<string, string>;
}

/** Parse a .env file into a plain map (empty if absent). Does NOT touch process.env. */
export function loadEnvFile(path?: string): Record<string, string> {
  if (!path || !existsSync(path)) return {};
  return parseEnv(readFileSync(path));
}

const pick = (keys: string[], env?: Record<string, string>): Record<string, string> => {
  const out: Record<string, string> = {};
  if (env) for (const k of keys) if (env[k] !== undefined) out[k] = env[k];
  return out;
};

export interface AdminToolConfig {
  tools: Record<string, AdminTool>;
}

export interface ClientToolOverride {
  env?: Record<string, string>;
  command?: string;
  args?: string[];
}

export interface ClientCredentials {
  clientId: string;
  overrides: Record<string, ClientToolOverride>;
}

export interface ResolvedCredential {
  token: string;
  available: boolean;
  /** 'admin' = shared admin key; 'client' = client's own key; 'none' = no creds (built-in) or unavailable. */
  source: 'admin' | 'client' | 'none';
  policy: ToolPolicy | 'none';
  env: Record<string, string>;
  mcp?: { command: string; args?: string[]; env?: Record<string, string> };
  reason?: string;
}

/** Load the admin tool registry. Accepts `{ tools: {...} }` or a flat `{ token: {...} }` (back-compat). */
export function loadAdminToolConfig(path: string): AdminToolConfig {
  if (!existsSync(path)) return { tools: {} };
  const raw = JSON.parse(readFileSync(path, 'utf-8')) as Record<string, unknown>;
  const src = (raw.tools && typeof raw.tools === 'object' ? raw.tools : raw) as Record<string, unknown>;
  const tools: Record<string, AdminTool> = {};
  for (const [k, v] of Object.entries(src)) {
    if (k.startsWith('_') || k === 'tools') continue;
    if (v && typeof v === 'object') tools[k] = v as AdminTool;
  }
  return { tools };
}

/** Load one client's overrides (the keys they set in the dashboard). */
export function loadClientCredentials(path: string): ClientCredentials | undefined {
  if (!existsSync(path)) return undefined;
  const raw = JSON.parse(readFileSync(path, 'utf-8')) as Partial<ClientCredentials>;
  return { clientId: raw.clientId ?? 'client', overrides: raw.overrides ?? {} };
}

const mkMcp = (command?: string, args?: string[], env?: Record<string, string>) =>
  command ? { command, args, env } : undefined;

/**
 * Resolve the credentials for one tool token under a given client, enforcing the policy.
 * The core isolation rule: a `client-owned` tool with no client key is **unavailable** — it
 * never falls back to the admin key.
 */
export function resolveCredential(
  token: string,
  admin: AdminToolConfig,
  client?: ClientCredentials,
  sources: EnvSources = {},
): ResolvedCredential {
  const a = admin.tools[token];
  const ov = client?.overrides?.[token];

  // Not registered by the admin → a no-credential capability (e.g. a built-in like webfetch).
  if (!a) return { token, available: true, source: 'none', policy: 'none', env: {} };

  const policy: ToolPolicy = a.policy ?? 'shared';
  const keys = a.envKeys ?? [];

  // The client's keys come from their uploaded .env (by envKeys) and/or inline JSON override env.
  const clientVals = { ...pick(keys, sources.clientEnv), ...(ov?.env ?? {}) };
  const clientHas = Object.keys(clientVals).length > 0 || Boolean(ov?.command);

  if (policy === 'client-owned') {
    if (clientHas) {
      return {
        token,
        available: true,
        source: 'client',
        policy,
        env: clientVals,
        mcp: mkMcp(ov?.command ?? a.command, ov?.args ?? a.args, clientVals),
      };
    }
    return {
      token,
      available: false,
      source: 'none',
      policy,
      env: {},
      reason: `tool "${token}" is client-owned: this client must supply their own API key (none in the client .env). Not falling back to the admin key — client isolation enforced.`,
    };
  }

  // shared: admin keys from the system .env (by envKeys) + inline literals; a client may override per key.
  const adminVals = { ...(a.env ?? {}), ...pick(keys, sources.adminEnv) };
  const env = { ...adminVals, ...clientVals }; // client overrides admin per key
  return {
    token,
    available: true,
    source: clientHas ? 'client' : 'admin',
    policy,
    env,
    mcp: mkMcp(ov?.command ?? a.command, ov?.args ?? a.args, env),
  };
}
