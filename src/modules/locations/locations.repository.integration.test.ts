import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { config as loadDotenv } from 'dotenv';
import { eq, sql } from 'drizzle-orm';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';

// This suite exercises the repository's actual SQL against a REAL, SHARED
// Neon Postgres database rather than a mock: `insertLocationBatch` is the
// first code in this repo to write to a `geography(Point,4326)` column
// using raw parameterized SQL (`sql` template tag + `db.transaction`), and
// none of that — the transaction, the ST_SetSRID/ST_MakePoint construction,
// the bulk multi-row INSERT, or the `ON CONFLICT (employee_id) DO UPDATE`
// upsert — is exercised by locations.service.test.ts, which mocks this
// module entirely.
//
// This file is named `*.integration.test.ts` and is excluded from the
// default `npm test` run (see vitest.config.ts) specifically so it never
// runs automatically. Run it deliberately with `npm run test:integration`,
// which requires a `.env` with a real DATABASE_URL (the same connection the
// migrator uses). Follows the same env-var-swap/restore pattern as
// settings.repository.integration.test.ts.
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
    'locations.repository.integration.test.ts requires a DATABASE_URL in .env to run against a real database',
  );
}
process.env.DATABASE_URL = parsedEnv.DATABASE_URL;

const { insertLocationBatch } = await import('./locations.repository.js');
const { db, pool } = await import('../../database/client.js');
const { users } = await import('../../database/schema/users.js');
const { locationHistory } = await import('../../database/schema/locationHistory.js');
const { employeeLocations } = await import('../../database/schema/employeeLocations.js');

// This test needs a real employeeId that satisfies the `location_history` /
// `employee_locations` foreign key to `users.id`. There is no seeded
// fixture user or documented test-user convention anywhere in this repo
// (no seed scripts, no fixtures directory), so this suite is fully
// self-contained: it inserts its own throwaway user row in `beforeAll` and
// deletes it (cascading, per the FK's `onDelete: 'cascade'`) in `afterAll`,
// which also removes any `location_history` / `employee_locations` rows
// this suite created. The email is namespaced so it can never collide with
// a real account.
const TEST_USER_EMAIL = 'locations.repository.integration-test@example.invalid';

describe('insertLocationBatch', () => {
  let employeeId: string;

  beforeAll(async () => {
    const [user] = await db
      .insert(users)
      .values({
        name: 'Locations Integration Test User',
        email: TEST_USER_EMAIL,
        passwordHash: 'not-a-real-hash',
        role: 'EMPLOYEE',
        status: 'ACTIVE',
      })
      .returning();
    if (!user) {
      throw new Error('Failed to create throwaway test user for locations integration test');
    }
    employeeId = user.id;
  });

  afterEach(async () => {
    // Cascades to location_history / employee_locations rows for this user,
    // keeping each test isolated without needing per-row cleanup logic.
    await db.delete(locationHistory).where(eq(locationHistory.employeeId, employeeId));
    await db.delete(employeeLocations).where(eq(employeeLocations.employeeId, employeeId));
  });

  afterAll(async () => {
    // Deleting the user cascades and removes it entirely, leaving the real
    // dev database exactly as it was found.
    await db.delete(users).where(eq(users.id, employeeId));
    await pool.end();
    process.env.DATABASE_URL = originalDatabaseUrl;
  });

  const points = [
    {
      latitude: 40.7128,
      longitude: -74.006,
      accuracy: 5,
      altitude: 10,
      speed: 1.5,
      heading: 90,
      batteryLevel: 0.8,
      recordedAt: '2026-08-17T12:00:00.000Z',
    },
    {
      latitude: 40.713,
      longitude: -74.0062,
      accuracy: 6,
      altitude: 11,
      speed: 1.6,
      heading: 95,
      batteryLevel: 0.79,
      recordedAt: '2026-08-17T12:00:20.000Z',
    },
    {
      latitude: 40.7132,
      longitude: -74.0064,
      accuracy: 7,
      altitude: 12,
      speed: 1.7,
      heading: 100,
      batteryLevel: 0.78,
      recordedAt: '2026-08-17T12:00:40.000Z',
    },
  ];
  const latestPoint = points[2]!;

  it('inserts a batch of points into location_history with correct data, including the geography round trip', async () => {
    await insertLocationBatch(employeeId, points, latestPoint);

    const rows = await db
      .select()
      .from(locationHistory)
      .where(eq(locationHistory.employeeId, employeeId))
      .orderBy(locationHistory.recordedAt);

    expect(rows).toHaveLength(3);
    rows.forEach((row, i) => {
      const expected = points[i]!;
      expect(row.latitude).toBeCloseTo(expected.latitude);
      expect(row.longitude).toBeCloseTo(expected.longitude);
      expect(row.accuracy).toBeCloseTo(expected.accuracy);
      expect(row.altitude).toBeCloseTo(expected.altitude);
      expect(row.speed).toBeCloseTo(expected.speed);
      expect(row.heading).toBeCloseTo(expected.heading);
      expect(row.batteryLevel).toBeCloseTo(expected.batteryLevel);
      expect(row.recordedAt.toISOString()).toBe(expected.recordedAt);
    });

    // Verify the geography(Point,4326) column round-trips correctly, not
    // just the plain latitude/longitude columns.
    const geoRows = await db.execute<{ x: number; y: number }>(sql`
      SELECT ST_X(location::geometry) AS x, ST_Y(location::geometry) AS y
      FROM location_history
      WHERE employee_id = ${employeeId}
      ORDER BY recorded_at
    `);
    geoRows.rows.forEach((row, i) => {
      const expected = points[i]!;
      expect(Number(row.x)).toBeCloseTo(expected.longitude);
      expect(Number(row.y)).toBeCloseTo(expected.latitude);
    });
  });

  it('upserts employee_locations to the latest point by recordedAt', async () => {
    await insertLocationBatch(employeeId, points, latestPoint);

    const [row] = await db
      .select()
      .from(employeeLocations)
      .where(eq(employeeLocations.employeeId, employeeId));

    expect(row).toBeDefined();
    expect(row!.latitude).toBeCloseTo(latestPoint.latitude);
    expect(row!.longitude).toBeCloseTo(latestPoint.longitude);
    expect(row!.accuracy).toBeCloseTo(latestPoint.accuracy);
    expect(row!.isTracking).toBe(true);
  });

  it('updates employee_locations on a second flush (ON CONFLICT path) instead of erroring', async () => {
    await insertLocationBatch(employeeId, points, latestPoint);

    const secondBatchPoint = {
      latitude: 40.72,
      longitude: -74.01,
      accuracy: 4,
      altitude: 20,
      speed: 2.1,
      heading: 180,
      batteryLevel: 0.75,
      recordedAt: '2026-08-17T12:01:00.000Z',
    };
    await insertLocationBatch(employeeId, [secondBatchPoint], secondBatchPoint);

    const rows = await db
      .select()
      .from(employeeLocations)
      .where(eq(employeeLocations.employeeId, employeeId));

    // Still exactly one row for this employee (upsert, not insert).
    expect(rows).toHaveLength(1);
    expect(rows[0]!.latitude).toBeCloseTo(secondBatchPoint.latitude);
    expect(rows[0]!.longitude).toBeCloseTo(secondBatchPoint.longitude);

    // The second flush's point was appended to location_history rather than
    // replacing the first batch.
    const historyRows = await db
      .select()
      .from(locationHistory)
      .where(eq(locationHistory.employeeId, employeeId));
    expect(historyRows).toHaveLength(4);
  });
});
