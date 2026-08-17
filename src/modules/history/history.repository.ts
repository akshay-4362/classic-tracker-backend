import { and, asc, eq, gte, lt } from 'drizzle-orm';
import { db } from '../../database/client.js';
import { locationHistory } from '../../database/schema/locationHistory.js';

export interface LocationHistoryRow {
  latitude: number;
  longitude: number;
  recordedAt: Date;
  speed: number | null;
  batteryLevel: number | null;
}

export async function findLocationHistoryForDay(
  employeeId: string,
  dayStart: Date,
  dayEnd: Date
): Promise<LocationHistoryRow[]> {
  return db
    .select({
      latitude: locationHistory.latitude,
      longitude: locationHistory.longitude,
      recordedAt: locationHistory.recordedAt,
      speed: locationHistory.speed,
      batteryLevel: locationHistory.batteryLevel,
    })
    .from(locationHistory)
    .where(
      and(
        eq(locationHistory.employeeId, employeeId),
        gte(locationHistory.recordedAt, dayStart),
        lt(locationHistory.recordedAt, dayEnd)
      )
    )
    .orderBy(asc(locationHistory.recordedAt));
}
