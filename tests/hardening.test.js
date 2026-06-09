import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { requirePasswordChange } from '../src/auth/session.js';
import { createOAuthProvider } from '../src/auth/oauthProvider.js';

function mockRes() {
  return {
    statusCode: 200,
    body: null,
    status(c) { this.statusCode = c; return this; },
    json(b) { this.body = b; return this; }
  };
}

describe('requirePasswordChange guard', () => {
  it('blocks (409) when the user must change password', () => {
    const mw = requirePasswordChange();
    const res = mockRes();
    let nexted = false;
    mw({ sessionUser: { must_change_password: true } }, res, () => { nexted = true; });
    assert.equal(res.statusCode, 409);
    assert.equal(res.body.error, 'must_change_password');
    assert.equal(nexted, false);
  });

  it('passes through when no change is required', () => {
    const mw = requirePasswordChange();
    const res = mockRes();
    let nexted = false;
    mw({ sessionUser: { must_change_password: false } }, res, () => { nexted = true; });
    assert.equal(nexted, true);
  });
});

describe('refresh-token reuse detection (family revocation)', () => {
  function build({ valid, stale } = {}) {
    const calls = { revokedFamilies: [], created: [] };
    const deps = {
      clients: { getClient: async (id) => ({ client_id: id }) },
      codes: { get: async () => null, consume: async () => null, create: async () => {} },
      refresh: {
        findValid: async () => valid || null,
        findAnyByHash: async () => stale || null,
        create: async (r) => { calls.created.push(r); },
        revokeByHash: async () => {},
        revokeFamily: async (f) => { calls.revokedFamilies.push(f); }
      },
      findUserById: async () => ({ id: 'u1', role: 'user', status: 'approved' }),
      sha256: (v) => `h:${v}`,
      randomToken: () => 'RND',
      signAccessToken: () => 'AT',
      verifyAccessJwt: () => null,
      signTicket: (p) => JSON.stringify(p),
      verifyTicket: () => null,
      baseUrl: 'https://x', accessTtlSeconds: 3600, scope: 'mcp:tools'
    };
    return { ...createOAuthProvider(deps), calls };
  }
  const client = { client_id: 'c1' };

  it('revokes the whole family when an already-revoked refresh token is replayed', async () => {
    const { provider, calls } = build({ valid: null, stale: { family_id: 'fam-1', revoked_at: new Date() } });
    await assert.rejects(() => provider.exchangeRefreshToken(client, 'replayed'), /invalid refresh token/i);
    assert.deepEqual(calls.revokedFamilies, ['fam-1']); // reuse → family revoked
  });

  it('rotates within the family on a valid refresh', async () => {
    const { provider, calls } = build({ valid: { client_id: 'c1', user_id: 'u1', scopes: ['mcp:tools'], family_id: 'fam-2' } });
    const t = await provider.exchangeRefreshToken(client, 'good');
    assert.equal(t.refresh_token, 'RND');
    assert.equal(calls.created[0].familyId, 'fam-2'); // new token stays in the same family
    assert.equal(calls.revokedFamilies.length, 0);    // no family revocation on the happy path
  });
});
