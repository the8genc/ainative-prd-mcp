import {
  resolveCredential,
  type AdminToolConfig,
  type ClientCredentials,
  type EnvSources,
} from './tool-credentials';

export interface McpServerConfig {
  command: string;
  args?: string[];
  env?: Record<string, string>;
}

/**
 * Built-in capability tokens map to Agent SDK built-in tools. These need no API credentials.
 * (Credentialed tools — coda, dataforseo, square-sdk, framer, canva, … — get their keys from
 * the admin/client tool-credential config; see `tool-credentials.ts`.)
 */
const BUILTIN: Record<string, string[]> = {
  webfetch: ['WebFetch', 'WebSearch'],
  imagemagick: ['Bash'],
  github: ['Bash'],
  wordpress: ['Bash', 'WebFetch'],
  ghost: ['Bash', 'WebFetch'],
  framer: ['Bash', 'WebFetch'],
  falai: ['Bash', 'WebFetch'],
  webhook: ['Bash', 'WebFetch'],
  'square-sdk': ['Bash', 'WebFetch'],
  figma: ['Bash', 'WebFetch'],
  canva: ['Bash', 'WebFetch'],
  squarespace: ['Bash', 'WebFetch'],
  // MCP-server tools also accept Bash for any local glue:
  coda: ['Bash'],
  dataforseo: ['Bash'],
  zerodb: ['Bash'],
  'ainative-8genc': ['Bash'],
};

export interface SessionTools {
  /** undefined = allow all tools (when MCP servers are present, since their tool names are dynamic). */
  allowedTools?: string[];
  mcpServers: Record<string, McpServerConfig>;
  /** env vars (resolved credentials) to inject into the session for credentialed tools. */
  env: Record<string, string>;
  /** tools that couldn't be made available for this client (e.g. client-owned with no key). */
  unavailable: { token: string; reason: string }[];
  /** credential source per token: admin (shared key) | client (own key) | none. */
  sources: Record<string, 'admin' | 'client' | 'none'>;
}

/**
 * Resolve a skill's `tools` tokens into Agent SDK options for a specific client, applying the
 * admin/client credential model. Read/Write are always allowed (read inputs, write outputs);
 * client-owned tools without the client's key are reported as `unavailable` (never given the
 * admin key) so a project can't cross-pollinate another tenant's resources.
 */
export function resolveSessionTools(
  tokens: string[],
  admin: AdminToolConfig,
  client?: ClientCredentials,
  envSources: EnvSources = {},
): SessionTools {
  const allowed = new Set<string>(['Read', 'Write']);
  const mcpServers: Record<string, McpServerConfig> = {};
  const env: Record<string, string> = {};
  const unavailable: { token: string; reason: string }[] = [];
  const sources: Record<string, 'admin' | 'client' | 'none'> = {};

  for (const t of tokens) {
    const cred = resolveCredential(t, admin, client, envSources);
    sources[t] = cred.source;
    if (!cred.available) {
      unavailable.push({ token: t, reason: cred.reason ?? 'unavailable' });
      continue;
    }
    if (BUILTIN[t]) BUILTIN[t].forEach((x) => allowed.add(x));
    Object.assign(env, cred.env);
    if (cred.mcp) mcpServers[t] = cred.mcp;
  }

  const hasMcp = Object.keys(mcpServers).length > 0;
  return {
    allowedTools: hasMcp ? undefined : [...allowed],
    mcpServers,
    env,
    unavailable,
    sources,
  };
}
