import { Pool, PoolClient } from 'pg';

const pool = new Pool({
  host: process.env.PG_HOST || 'postgres.default',
  port: parseInt(process.env.PG_PORT || '5432', 10),
  user: process.env.PG_USER || 'postgres',
  password: process.env.PG_PASSWORD || 'postgres',
  database: process.env.PG_DATABASE || 'smart_inventory',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

pool.on('error', (err) => {
  console.error('Unexpected PostgreSQL pool error:', err);
});

export { pool };

// Helper: run a query and return rows
export async function query<T = any>(text: string, params?: any[]): Promise<T[]> {
  const result = await pool.query(text, params);
  return result.rows as T[];
}

// Helper: run a query and return single row or null
export async function queryOne<T = any>(text: string, params?: any[]): Promise<T | null> {
  const rows = await query<T>(text, params);
  return rows[0] || null;
}

// Helper: run an insert/update/delete and return the result
export async function run(text: string, params?: any[]): Promise<{ lastID: number; rowsAffected: number }> {
  const result = await pool.query(text, params);
  const lastID = result.rows[0]?.id || 0;
  return { lastID, rowsAffected: result.rowCount || 0 };
}
