import 'dotenv/config';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Client } from 'pg';
import { downFileFor } from './run-migrations.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const migrationsDir = path.resolve(__dirname, '../../../migrations');

export async function rollbackLastMigration(): Promise<string | null> {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try {
    const { rows } = await client.query<{ name: string }>(
      'SELECT name FROM schema_migrations ORDER BY id DESC LIMIT 1'
    );
    if (rows.length === 0) {
      return null;
    }
    const [{ name }] = rows;
    const downFile = downFileFor(name);
    const sql = readFileSync(path.join(migrationsDir, downFile), 'utf-8');
    await client.query('BEGIN');
    try {
      await client.query(sql);
      await client.query('DELETE FROM schema_migrations WHERE name = $1', [name]);
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    }
    return name;
  } finally {
    await client.end();
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  rollbackLastMigration()
    .then((rolledBack) => {
      console.log(rolledBack ? `Rolled back: ${rolledBack}` : 'No migrations to roll back.');
    })
    .catch((error) => {
      console.error(error);
      process.exitCode = 1;
    });
}
