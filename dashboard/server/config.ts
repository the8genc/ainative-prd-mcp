import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { parse as parseEnv } from 'dotenv';
import type { AdminToolConfig, AdminTool } from '../src/lib/types';

// Where the orchestrator's config + per-client envs live. Override with ORCH_DIR.
const ORCH_DIR = process.env.ORCH_DIR
  ? process.env.ORCH_DIR
  : join(dirname(new URL(import.meta.url).pathname), '..', '..', 'tool-credentials');

export const paths = {
  adminConfig: () => join(ORCH_DIR, 'orchestrator.mcp.json'),
  systemEnv: () => join(ORCH_DIR, '.env'),
  clientEnv: (clientId: string) => join(ORCH_DIR, 'clients', `${sanitize(clientId)}.env`),
};

function sanitize(id: string): string {
  return id.replace(/[^A-Za-z0-9_-]/g, '_');
}

export function readAdminConfig(): AdminToolConfig {
  const p = paths.adminConfig();
  if (!existsSync(p)) return { tools: {} };
  const raw = JSON.parse(readFileSync(p, 'utf-8')) as Record<string, unknown>;
  const src = (raw.tools && typeof raw.tools === 'object' ? raw.tools : raw) as Record<string, unknown>;
  const tools: Record<string, AdminTool> = {};
  for (const [k, v] of Object.entries(src)) {
    if (k.startsWith('_') || k === 'tools') continue;
    if (v && typeof v === 'object') tools[k] = v as AdminTool;
  }
  return { tools };
}

export function writeAdminConfig(tools: Record<string, AdminTool>): void {
  // Persist policy/envKeys/launch only — NEVER secrets.
  const clean: Record<string, AdminTool> = {};
  for (const [k, t] of Object.entries(tools)) {
    clean[k] = {
      policy: t.policy ?? 'shared',
      ...(t.envKeys?.length ? { envKeys: t.envKeys } : {}),
      ...(t.command ? { command: t.command, args: t.args } : {}),
    };
  }
  writeFileSync(paths.adminConfig(), JSON.stringify({ tools: clean }, null, 2));
}

export function readSystemEnv(): Record<string, string> {
  const p = paths.systemEnv();
  return existsSync(p) ? parseEnv(readFileSync(p)) : {};
}

export function readClientEnv(clientId: string): Record<string, string> {
  const p = paths.clientEnv(clientId);
  return existsSync(p) ? parseEnv(readFileSync(p)) : {};
}

/** Save an uploaded .env for a client (merging with any existing). Returns the resulting key names. */
export function saveClientEnv(clientId: string, content: string): string[] {
  const incoming = parseEnv(content);
  const merged = { ...readClientEnv(clientId), ...incoming };
  const p = paths.clientEnv(clientId);
  mkdirSync(dirname(p), { recursive: true });
  const body = Object.entries(merged)
    .map(([k, v]) => `${k}=${v}`)
    .join('\n');
  writeFileSync(p, body + '\n');
  return Object.keys(merged);
}
