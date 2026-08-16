import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { config as loadDotenv } from 'dotenv';
import { eq } from 'drizzle-orm';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';

// This suite exercises the repository's actual SQL-building logic against a
// REAL, SHARED Neon Postgres database rather than a mock, since the
// partial-update logic in updateTrackingSettingsRow (which fields get
// touched in the SET clause) can only be verified by round-tripping through
// a real UPDATE ... RETURNING.
//
// This file is named `*.integration.test.ts` and is excluded from the
// default `npm test` run (see vitest.config.ts) specifically so it never
// runs automatically. Run it deliberately with `npm run test:integration`,
// which requires a `.env` with a real DATABASE_URL (the same connection the
// migrator uses, and the one migration 0006 was applied against). Because it
// mutates the shared `tracking_settings` singleton row, do not run it
// concurrently with another instance of itself against the same database.
//
// vitest.config.ts stubs DATABASE_URL to a non-existent local URL for the
// rest of the suite (every other test file mocks the repository/db layer
// entirely, so it never actually connects). This file needs a reachable
// database, so it overrides DATABASE_URL from the project's .env before
// importing the client module, then restores the stubbed value afterwards
// so it doesn't leak into other test files that may share this worker
// thread.
const originalDatabaseUrl = process.env.DATABASE_URL;
const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const parsedEnv = loadDotenv({ path: path.join(projectRoot, '.env') }).parsed;

if (!parsedEnv?.DATABASE_URL) {
  throw new Error(
    'settings.repository.test.ts requires a DATABASE_URL in .env to run against a real database',
  );
}
process.env.DATABASE_URL = parsedEnv.DATABASE_URL;

const { updateTrackingSettingsRow } = await import('./settings.repository.js');
const { db, pool } = await import('../../database/client.js');
const { trackingSettings } = await import('../../database/schema/trackingSettings.js');

describe('updateTrackingSettingsRow', () => {
  let originalRow: {
    updateIntervalMs: number;
    distanceIntervalM: number;
    updatedAt: Date;
  };

  beforeAll(async () => {
    const [row] = await db.select().from(trackingSettings).limit(1);
    if (!row) {
      throw new Error(
        'tracking_settings singleton row is missing; cannot run repository tests without it',
      );
    }
    originalRow = {
      updateIntervalMs: row.updateIntervalMs,
      distanceIntervalM: row.distanceIntervalM,
      updatedAt: row.updatedAt,
    };
  });

  afterEach(async () => {
    // Restore the singleton row to its pre-test state so this suite leaves
    // the shared database exactly as it found it.
    await db
      .update(trackingSettings)
      .set({ ...originalRow })
      .where(eq(trackingSettings.id, true));
  });

  afterAll(async () => {
    await pool.end();
    process.env.DATABASE_URL = originalDatabaseUrl;
  });

  it('updates only updateIntervalMs, leaving distanceIntervalM unchanged', async () => {
    const newValue = originalRow.updateIntervalMs + 1234;

    const updated = await updateTrackingSettingsRow({ updateIntervalMs: newValue });

    expect(updated.updateIntervalMs).toBe(newValue);
    expect(updated.distanceIntervalM).toBe(originalRow.distanceIntervalM);
  });

  it('updates only distanceIntervalM, leaving updateIntervalMs unchanged', async () => {
    const newValue = originalRow.distanceIntervalM + 5;

    const updated = await updateTrackingSettingsRow({ distanceIntervalM: newValue });

    expect(updated.distanceIntervalM).toBe(newValue);
    expect(updated.updateIntervalMs).toBe(originalRow.updateIntervalMs);
  });

  it('updates both fields when both are given', async () => {
    const newUpdateIntervalMs = originalRow.updateIntervalMs + 111;
    const newDistanceIntervalM = originalRow.distanceIntervalM + 11;

    const updated = await updateTrackingSettingsRow({
      updateIntervalMs: newUpdateIntervalMs,
      distanceIntervalM: newDistanceIntervalM,
    });

    expect(updated.updateIntervalMs).toBe(newUpdateIntervalMs);
    expect(updated.distanceIntervalM).toBe(newDistanceIntervalM);
  });

  it('changes updatedAt after an update', async () => {
    const updated = await updateTrackingSettingsRow({
      updateIntervalMs: originalRow.updateIntervalMs + 1,
    });

    expect(updated.updatedAt.getTime()).toBeGreaterThan(originalRow.updatedAt.getTime());
  });
});
