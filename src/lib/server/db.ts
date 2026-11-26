import { env } from 'node:process';
import { Pool, type PoolClient } from 'pg';

export const db = new Pool({
  connectionString: env.DATABASE_URL,
  host: env.PGHOST,
  user: env.PGUSER,
  password: env.PGPASSWORD,
  database: env.PGDATABASE,
  port: env.PGPORT ? Number(env.PGPORT) : undefined,
  connectionTimeoutMillis: 5_000,
  max: 10
});

db.on('error', (error) => console.error('Conexão ociosa do PostgreSQL:', error.message));

export async function transaction<T>(work: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await db.connect();
  try {
    await client.query('BEGIN');
    const result = await work(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
