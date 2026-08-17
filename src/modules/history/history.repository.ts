import { and, asc, eq, gte, lt } from 'drizzle-orm';
import { db } from '../../database/client.js';
import { locationHistory } from '../../database/schema/locationHistory.js';

export type LocationHistoryRow = typeof locationHistory.$inferSelect;

export async function findLocationHistoryForDay(
  employeeId: string,
  dayStart: Date,
  dayEnd: Date
): Promise<LocationHistoryRow[]> {
  return db
    .select()
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
