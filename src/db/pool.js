/**
 * Postgres connection pool (singleton).
 *
 * Returns null when DATABASE_URL is unset so callers can degrade gracefully
 * (auth disabled). SSL is enabled for managed providers (Railway/DO) but with
 * rejectUnauthorized:false since they use self-signed chains on the proxy.
 */

import pg from 'pg';
import { config } from '../config.js';

let pool = null;

export function getPool() {
  if (pool) return pool;
  if (!config.databaseUrl) return null;

  const useSsl =
    !/localhost|127\.0\.0\.1/.test(config.databaseUrl) &&
    process.env.PGSSL !== 'disable';
  // Managed DBs (Railway/DO) present self-signed proxy certs, so default to not
  // rejecting; set PG_REJECT_UNAUTHORIZED=true to enforce full cert validation.
  const rejectUnauthorized = process.env.PG_REJECT_UNAUTHORIZED === 'true';

  pool = new pg.Pool({
    connectionString: config.databaseUrl,
    ssl: useSsl ? { rejectUnauthorized } : false,
    max: parseInt(process.env.PG_POOL_MAX || '10', 10),
    idleTimeoutMillis: 30000
  });

  pool.on('error', (err) => {
    console.error('[db] idle client error:', err.message);
  });

  return pool;
}

/** Convenience query helper. */
export async function query(text, params) {
  const p = getPool();
  if (!p) throw new Error('Database not configured (DATABASE_URL missing)');
  return p.query(text, params);
}

export async function closePool() {
  if (pool) {
    await pool.end();
    pool = null;
  }
}
