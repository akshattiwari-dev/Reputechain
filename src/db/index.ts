
import { drizzle } from 'drizzle-orm/node-postgres';
import pkg from 'pg';
const { Pool } = pkg;
import * as schema from './schema';
 
let db;
let pool: InstanceType<typeof Pool> | null = null;
 
try {
  pool = new Pool({
    connectionString: process.env.DATABASE_URL || "postgres://postgres:postgres@localhost:5432/reputechain"
  });
 
  // Pool construction never throws for bad credentials/host — pg only
  // discovers connection problems when a query actually runs. Without this
  // listener, connection errors surface only as a generic failure deep
  // inside whatever route happened to run first, with no clear cause.
  pool.on('error', (err) => {
    console.error('❌ Postgres pool error (connection dropped or DB unreachable):', err.message);
  });
 
  db = drizzle(pool, { schema });
} catch (e) {
  console.warn("Failed to connect to database. Metadata will not be saved off-chain.");
}
 
/**
 * Actually exercises the connection with a trivial query, so callers (like
 * GET /api/health) can report real DB status instead of assuming `db` being
 * truthy means the connection works — it doesn't; see note above.
 */
async function testDbConnection(): Promise<{ ok: boolean; error?: string }> {
  if (!pool) return { ok: false, error: "Pool was never initialized." };
  try {
    await pool.query("SELECT 1");
    return { ok: true };
  } catch (e: any) {
    return { ok: false, error: e?.message || String(e) };
  }
}
 
export { db, testDbConnection };
 