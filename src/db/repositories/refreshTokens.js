/** OAuth refresh tokens (stored hashed; rotated on use; grouped into families). */
import { query } from '../pool.js';

export async function create({ userId, clientId, tokenHash, scopes, resource, expiresAt, familyId = null }) {
  const { rows } = await query(
    `INSERT INTO refresh_tokens (user_id, client_id, token_hash, scopes, resource, expires_at, family_id)
     VALUES ($1, $2, $3, $4, $5, $6, COALESCE($7, gen_random_uuid()))
     RETURNING id, family_id`,
    [userId, clientId, tokenHash, scopes || [], resource || null, expiresAt, familyId]
  );
  return rows[0];
}

/** A live (unrevoked, unexpired) token. */
export async function findValid(tokenHash) {
  const { rows } = await query(
    `SELECT * FROM refresh_tokens WHERE token_hash = $1 AND revoked_at IS NULL AND expires_at > now()`,
    [tokenHash]
  );
  return rows[0] || null;
}

/** Any token by hash, including revoked/expired — used to detect reuse. */
export async function findAnyByHash(tokenHash) {
  const { rows } = await query('SELECT * FROM refresh_tokens WHERE token_hash = $1', [tokenHash]);
  return rows[0] || null;
}

export async function revokeByHash(tokenHash) {
  await query('UPDATE refresh_tokens SET revoked_at = now() WHERE token_hash = $1 AND revoked_at IS NULL', [tokenHash]);
}

/** Revoke every token in a rotation family (reuse-detection response). */
export async function revokeFamily(familyId) {
  await query('UPDATE refresh_tokens SET revoked_at = now() WHERE family_id = $1 AND revoked_at IS NULL', [familyId]);
}
