import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Client } from 'pg';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const migrationsDir = path.resolve(__dirname, '../../../migrations');

export function listMigrationFiles(dir: string = migrationsDir): string[] {
  return readdirSync(dir)
    .filter((file) => file.endsWith('.sql') && !file.endsWith('.down.sql'))
    .sort();
}

export function downFileFor(name: string): string {
  return name.replace(/\.sql$/, '.down.sql');
}

async function ensureMigrationsTable(client: Client): Promise<void> {
  await client.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);
}

export async function runMigrations(): Promise<string[]> {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  const applied: string[] = [];
  try {
    await ensureMigrationsTable(client);
    const { rows } = await client.query<{ name: string }>('SELECT name FROM schema_migrations');
    const appliedNames = new Set(rows.map((row) => row.name));

    for (const file of listMigrationFiles()) {
      if (appliedNames.has(file)) {
        continue;
      }
      const sql = readFileSync(path.join(migrationsDir, file), 'utf-8');
      await client.query('BEGIN');
      try {
        await client.query(sql);
        await client.query('INSERT INTO schema_migrations (name) VALUES ($1)', [file]);
        await client.query('COMMIT');
        applied.push(file);
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      }
    }
  } finally {
    await client.end();
  }
  return applied;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  runMigrations()
    .then((applied) => {
      console.log(applied.length > 0 ? `Applied: ${applied.join(', ')}` : 'No pending migrations.');
    })
    .catch((error) => {
      console.error(error);
      process.exitCode = 1;
    });
}
