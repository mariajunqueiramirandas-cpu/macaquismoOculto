import { readdir, readFile } from 'node:fs/promises';
import { Pool } from 'pg';

if ((process.env.APP_SECRET ?? '').length < 32) {
  throw new Error('Defina APP_SECRET com pelo menos 32 caracteres.');
}

const files = new URL('../migrations/', import.meta.url);
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  connectionTimeoutMillis: 5_000
});

try {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('SELECT pg_advisory_xact_lock(71920381)');
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migration (
        filename text PRIMARY KEY,
        applied_at timestamptz NOT NULL DEFAULT now()
      )
    `);
    const applied = await client.query('SELECT filename FROM schema_migration');
    const alreadyApplied = new Set(applied.rows.map((row) => row.filename));

    for (const file of (await readdir(files)).filter((name) => name.endsWith('.sql')).sort()) {
      if (alreadyApplied.has(file)) continue;
      await client.query(await readFile(new URL(file, files), 'utf8'));
      await client.query('INSERT INTO schema_migration (filename) VALUES ($1)', [file]);
      console.log(`Migração aplicada: ${file}`);
    }

    const owner = await client.query("SELECT 1 FROM admin_account WHERE role = 'owner'");
    if (owner.rowCount === 0 && (process.env.ADMIN_SETUP_TOKEN ?? '').length < 24) {
      throw new Error('Defina ADMIN_SETUP_TOKEN com pelo menos 24 caracteres para ativar o primeiro admin.');
    }

    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
} finally {
  await pool.end();
}
