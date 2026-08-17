import { sql } from 'drizzle-orm';
import { db } from '../../database/client.js';
import type { LocationPointInput } from './locations.dto.js';

export async function insertLocationBatch(
  employeeId: string,
  points: LocationPointInput[],
  latestPoint: LocationPointInput
): Promise<void> {
  await db.transaction(async (tx) => {
    // A single multi-row INSERT rather than one round trip per point: with
    // up to 500 points per batch, a per-point loop holds a pooled
    // connection open for the sum of 500 network round trips, and concurrent
    // flushes across employees are the expected steady state, not an edge
    // case. Every point-derived value still flows through a parameterized
    // `${...}` placeholder (never `sql.raw`/string concatenation), so this
    // preserves the injection-safety of the original per-row statements.
    const rows = points.map(
      (point) => sql`(
        ${employeeId}, ${point.latitude}, ${point.longitude},
        ST_SetSRID(ST_MakePoint(${point.longitude}, ${point.latitude}), 4326),
        ${point.accuracy ?? null}, ${point.altitude ?? null}, ${point.speed ?? null},
        ${point.heading ?? null}, ${point.batteryLevel ?? null}, ${point.recordedAt}
      )`
    );
    await tx.execute(sql`
      INSERT INTO location_history
        (employee_id, latitude, longitude, location, accuracy, altitude, speed, heading, battery_level, recorded_at)
      VALUES ${sql.join(rows, sql`, `)}
    `);

    await tx.execute(sql`
      INSERT INTO employee_locations
        (employee_id, latitude, longitude, location, accuracy, altitude, speed, heading, battery_level, is_tracking, last_seen_at, updated_at)
      VALUES (
        ${employeeId}, ${latestPoint.latitude}, ${latestPoint.longitude},
        ST_SetSRID(ST_MakePoint(${latestPoint.longitude}, ${latestPoint.latitude}), 4326),
        ${latestPoint.accuracy ?? null}, ${latestPoint.altitude ?? null}, ${latestPoint.speed ?? null},
        ${latestPoint.heading ?? null}, ${latestPoint.batteryLevel ?? null}, true, now(), now()
      )
      ON CONFLICT (employee_id) DO UPDATE SET
        latitude = EXCLUDED.latitude,
        longitude = EXCLUDED.longitude,
        location = EXCLUDED.location,
        accuracy = EXCLUDED.accuracy,
        altitude = EXCLUDED.altitude,
        speed = EXCLUDED.speed,
        heading = EXCLUDED.heading,
        battery_level = EXCLUDED.battery_level,
        is_tracking = EXCLUDED.is_tracking,
        last_seen_at = EXCLUDED.last_seen_at,
        updated_at = EXCLUDED.updated_at
    `);
  });
}
