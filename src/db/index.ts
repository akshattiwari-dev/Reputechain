import { drizzle } from 'drizzle-orm/node-postgres';
import pkg from 'pg';
const { Pool } = pkg;
import * as schema from './schema';

let db;

try {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL || "postgres://postgres:postgres@localhost:5432/reputechain"
  });
  db = drizzle(pool, { schema });
} catch (e) {
  console.warn("Failed to connect to database. Metadata will not be saved off-chain.");
}

export { db };
