/**
 * Test a tool's resolved credentials. Square does a real `locations.list`; other tools fall
 * back to a key-presence check. Ported from dashboard/server/connection-test.ts. `env` is the
 * resolved env map for one tool (from the resolver); `envKeys` are the tool's required names.
 */
export async function testConnection(token, env = {}, envKeys = [], fetchImpl = fetch) {
  const missing = envKeys.filter((k) => env[k] === undefined || env[k] === '');

  if (token === 'square-sdk') {
    const t = env.SQUARE_ACCESS_TOKEN;
    if (!t) return { ok: false, detail: 'missing SQUARE_ACCESS_TOKEN', live: false };
    const base = env.SQUARE_ENV === 'production'
      ? 'https://connect.squareup.com'
      : 'https://connect.squareupsandbox.com';
    try {
      const r = await fetchImpl(`${base}/v2/locations`, {
        headers: { Authorization: `Bearer ${t}`, 'Square-Version': '2024-01-18' }
      });
      if (r.ok) {
        const data = await r.json().catch(() => ({}));
        const locs = data.locations ?? [];
        return { ok: true, detail: `connected — ${locs.length} location(s)`, live: true };
      }
      const body = await r.text().catch(() => '');
      return { ok: false, detail: `Square ${r.status}: ${body.slice(0, 160)}`, live: true };
    } catch (e) {
      return { ok: false, detail: `network error: ${e.message}`, live: true };
    }
  }

  if (envKeys.length === 0) return { ok: true, detail: 'no credentials required', live: false };
  if (missing.length) return { ok: false, detail: `missing keys: ${missing.join(', ')}`, live: false };
  return { ok: true, detail: `all keys present (${envKeys.join(', ')}) — live test not implemented for this tool`, live: false };
}
