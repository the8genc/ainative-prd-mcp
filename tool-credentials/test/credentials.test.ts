import { describe, it, expect } from 'vitest';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  resolveCredential,
  loadEnvFile,
  type AdminToolConfig,
  type ClientCredentials,
  type EnvSources,
} from '../src/tool-credentials';
import { resolveSessionTools } from '../src/mcp-config';

const admin: AdminToolConfig = {
  tools: {
    dataforseo: { policy: 'shared', command: 'npx', args: ['dfs'], env: { DATAFORSEO_USERNAME: 'agency', DATAFORSEO_PASSWORD: 'a' } },
    coda: { policy: 'shared', env: { CODA_API_KEY: 'agency-coda' } },
    'square-sdk': { policy: 'client-owned' },
    framer: { policy: 'client-owned' },
  },
};

const acme: ClientCredentials = {
  clientId: 'acme',
  overrides: {
    'square-sdk': { env: { SQUARE_ACCESS_TOKEN: 'acme-sq', SQUARE_ENV: 'production' } },
    dataforseo: { env: { DATAFORSEO_USERNAME: 'acme', DATAFORSEO_PASSWORD: 'b' } },
  },
};

describe('resolveCredential — policy matrix', () => {
  it('shared, no override → admin key exposed', () => {
    const r = resolveCredential('coda', admin, undefined);
    expect(r.available).toBe(true);
    expect(r.source).toBe('admin');
    expect(r.env.CODA_API_KEY).toBe('agency-coda');
  });

  it('shared, with client override → client key wins', () => {
    const r = resolveCredential('dataforseo', admin, acme);
    expect(r.source).toBe('client');
    expect(r.env.DATAFORSEO_USERNAME).toBe('acme');
  });

  it('client-owned, no override → UNAVAILABLE, never the admin key (isolation)', () => {
    const r = resolveCredential('framer', admin, acme); // acme has no framer override
    expect(r.available).toBe(false);
    expect(r.source).toBe('none');
    expect(r.env).toEqual({});
    expect(r.reason).toMatch(/client-owned|isolation/i);
  });

  it('client-owned, with override → client key used', () => {
    const r = resolveCredential('square-sdk', admin, acme);
    expect(r.available).toBe(true);
    expect(r.source).toBe('client');
    expect(r.env.SQUARE_ACCESS_TOKEN).toBe('acme-sq');
  });

  it('unregistered token (built-in) → available, no creds', () => {
    const r = resolveCredential('webfetch', admin, acme);
    expect(r.available).toBe(true);
    expect(r.source).toBe('none');
  });

  it('client-owned with NO client at all → unavailable', () => {
    expect(resolveCredential('square-sdk', admin, undefined).available).toBe(false);
  });
});

describe('resolveSessionTools', () => {
  it('merges resolved env, mounts MCP servers, and reports unavailable client-owned tools', () => {
    const s = resolveSessionTools(['dataforseo', 'square-sdk', 'framer', 'webfetch'], admin, acme);
    // dataforseo (client override) + square-sdk (client) contribute env; framer is unavailable
    expect(s.env.DATAFORSEO_USERNAME).toBe('acme');
    expect(s.env.SQUARE_ACCESS_TOKEN).toBe('acme-sq');
    expect(s.unavailable.map((u) => u.token)).toContain('framer');
    expect(s.sources.framer).toBe('none');
    expect(s.sources['square-sdk']).toBe('client');
    // dataforseo has a command → mounted as an MCP server (permissive allowedTools)
    expect(s.mcpServers.dataforseo).toBeTruthy();
    expect(s.allowedTools).toBeUndefined();
  });

  it('without a client, client-owned tools are all unavailable but shared ones work', () => {
    const s = resolveSessionTools(['coda', 'square-sdk'], admin, undefined);
    expect(s.env.CODA_API_KEY).toBe('agency-coda');
    expect(s.unavailable.map((u) => u.token)).toEqual(['square-sdk']);
  });
});

describe('.env-driven credentials (envKeys + EnvSources)', () => {
  const adminEnvKeys: AdminToolConfig = {
    tools: {
      dataforseo: { policy: 'shared', envKeys: ['DATAFORSEO_USERNAME', 'DATAFORSEO_PASSWORD'] },
      'square-sdk': { policy: 'client-owned', envKeys: ['SQUARE_ACCESS_TOKEN', 'SQUARE_ENV'] },
    },
  };
  const sources: EnvSources = {
    adminEnv: { DATAFORSEO_USERNAME: 'agency', DATAFORSEO_PASSWORD: 'a', SQUARE_ACCESS_TOKEN: 'ADMIN-LEAK' },
    clientEnv: { SQUARE_ACCESS_TOKEN: 'client-tok', SQUARE_ENV: 'production' },
  };

  it('shared tool pulls values from the system .env (adminEnv)', () => {
    const r = resolveCredential('dataforseo', adminEnvKeys, undefined, sources);
    expect(r.source).toBe('admin');
    expect(r.env).toEqual({ DATAFORSEO_USERNAME: 'agency', DATAFORSEO_PASSWORD: 'a' });
  });

  it('client-owned tool pulls ONLY from the client .env, never the admin .env (isolation)', () => {
    const r = resolveCredential('square-sdk', adminEnvKeys, { clientId: 'acme', overrides: {} }, sources);
    expect(r.available).toBe(true);
    expect(r.source).toBe('client');
    expect(r.env.SQUARE_ACCESS_TOKEN).toBe('client-tok'); // NOT the admin's ADMIN-LEAK
    expect(r.env.SQUARE_ENV).toBe('production');
  });

  it('client-owned tool with no client .env is unavailable even though adminEnv has the key', () => {
    const r = resolveCredential('square-sdk', adminEnvKeys, { clientId: 'acme', overrides: {} }, { adminEnv: sources.adminEnv });
    expect(r.available).toBe(false);
    expect(r.env).toEqual({});
  });

  it('loadEnvFile parses a .env into a map', () => {
    const dir = mkdtempSync(join(tmpdir(), 'env-'));
    const p = join(dir, '.env');
    writeFileSync(p, 'FOO=bar\n# comment\nBAZ="qux"\n');
    expect(loadEnvFile(p)).toEqual({ FOO: 'bar', BAZ: 'qux' });
    expect(loadEnvFile(undefined)).toEqual({});
    expect(loadEnvFile('/no/such/file.env')).toEqual({});
  });
});
