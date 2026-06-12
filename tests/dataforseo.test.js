import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { makeCredentialResolver } from '../src/credentials/resolver.js';
import { executeDataForSEOTool } from '../src/tools/dataforseo-tools.js';

// Fixture: dataforseo SHARED with an agency key; a client-owned tool with no client key.
function sharedFixture() {
  const dir = mkdtempSync(join(tmpdir(), 'dfs-'));
  writeFileSync(
    join(dir, 'orchestrator.mcp.json'),
    JSON.stringify({ tools: { dataforseo: { policy: 'shared', envKeys: ['DATAFORSEO_USERNAME', 'DATAFORSEO_PASSWORD'] } } })
  );
  writeFileSync(join(dir, '.env'), 'DATAFORSEO_USERNAME=agency\nDATAFORSEO_PASSWORD=secret\n');
  return dir;
}
function clientOwnedFixture() {
  const dir = mkdtempSync(join(tmpdir(), 'dfs-'));
  writeFileSync(
    join(dir, 'orchestrator.mcp.json'),
    JSON.stringify({ tools: { dataforseo: { policy: 'client-owned', envKeys: ['DATAFORSEO_USERNAME', 'DATAFORSEO_PASSWORD'] } } })
  );
  writeFileSync(join(dir, '.env'), 'DATAFORSEO_USERNAME=agency\nDATAFORSEO_PASSWORD=secret\n'); // present but must NOT be used
  mkdirSync(join(dir, 'clients'), { recursive: true });
  return dir; // no client env → unavailable
}

const deps = (dir, fetchImpl) => ({
  clients: [{ id: 'acme', slug: 'acme', name: 'Acme' }],
  resolveClientId: async () => ({ ok: true, clientId: 'acme' }),
  credentials: makeCredentialResolver(dir),
  fetchImpl
});

test('resolves the shared agency key and calls DataForSEO with Basic auth', async () => {
  let seen = null;
  const fakeFetch = async (url, opts) => {
    seen = { url, opts };
    return {
      ok: true,
      json: async () => ({
        tasks: [{ result: [{ keyword: 'crm software', search_volume: 49500, cpc: 12.3, competition: 'HIGH', competition_index: 88 }] }]
      })
    };
  };
  const out = await executeDataForSEOTool(
    'dataforseo_search_volume',
    { keywords: ['crm software'], location_name: 'United States', language_code: 'en' },
    {},
    deps(sharedFixture(), fakeFetch)
  );
  assert.equal(out.credential_source, 'admin'); // shared agency key
  assert.equal(out.count, 1);
  assert.equal(out.keywords[0].search_volume, 49500);
  // called the real endpoint with Basic auth derived from the resolved agency creds
  assert.match(seen.url, /dataforseo\.com/);
  assert.equal(seen.opts.headers.Authorization, `Basic ${Buffer.from('agency:secret').toString('base64')}`);
});

test('client-owned + no client key → not connected, and no API call is made', async () => {
  let called = false;
  const out = await executeDataForSEOTool(
    'dataforseo_search_volume',
    { keywords: ['crm software'] },
    {},
    deps(clientOwnedFixture(), async () => { called = true; return { ok: true, json: async () => ({}) }; })
  );
  assert.match(out.error, /not connected/i);
  assert.equal(called, false); // never reached the network; agency key was NOT used
});

test('requires a non-empty keywords array', async () => {
  const out = await executeDataForSEOTool('dataforseo_search_volume', { keywords: [] }, {}, deps(sharedFixture(), async () => ({})));
  assert.match(out.error, /keywords/);
});
