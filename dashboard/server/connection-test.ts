import type { AdminTool, TestConnectionResult } from '../src/lib/types';

/**
 * Test a tool's credentials. Square does a real `locations.list` call (the canonical test);
 * other tools fall back to a key-presence check (live test not implemented per-tool yet).
 */
export async function testConnection(
  token: string,
  tool: AdminTool,
  env: Record<string, string>,
): Promise<TestConnectionResult> {
  const keys = tool.envKeys ?? [];
  const missing = keys.filter((k) => !env[k]);

  if (token === 'square-sdk') {
    const t = env.SQUARE_ACCESS_TOKEN;
    if (!t) return { ok: false, detail: 'missing SQUARE_ACCESS_TOKEN', live: false };
    const base =
      env.SQUARE_ENV === 'production'
        ? 'https://connect.squareup.com'
        : 'https://connect.squareupsandbox.com';
    try {
      const r = await fetch(`${base}/v2/locations`, {
        headers: { Authorization: `Bearer ${t}`, 'Square-Version': '2024-01-18' },
      });
      if (r.ok) {
        const data = (await r.json()) as { locations?: { id: string; name: string }[] };
        const locs = data.locations ?? [];
        return { ok: true, detail: `connected — ${locs.length} location(s)`, live: true };
      }
      return { ok: false, detail: `Square ${r.status}: ${(await r.text()).slice(0, 160)}`, live: true };
    } catch (e) {
      return { ok: false, detail: `network error: ${(e as Error).message}`, live: true };
    }
  }

  // Generic: keys present?
  if (keys.length === 0) return { ok: true, detail: 'no credentials required', live: false };
  if (missing.length) return { ok: false, detail: `missing keys: ${missing.join(', ')}`, live: false };
  return { ok: true, detail: `all keys present (${keys.join(', ')}) — live test not implemented`, live: false };
}
