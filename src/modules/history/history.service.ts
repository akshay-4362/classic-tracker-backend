import { findLocationHistoryForDay, type LocationHistoryRow } from './history.repository.js';

export interface HistoryPoint {
  latitude: number;
  longitude: number;
  recordedAt: string;
  speed: number | null;
  batteryLevel: number | null;
}

function toHistoryPoint(row: LocationHistoryRow): HistoryPoint {
  return {
    latitude: row.latitude,
    longitude: row.longitude,
    recordedAt: row.recordedAt.toISOString(),
    speed: row.speed,
    batteryLevel: row.batteryLevel,
  };
}

const TEN_MINUTES_MS = 10 * 60 * 1000;

function thinPoints(points: HistoryPoint[]): HistoryPoint[] {
  if (points.length === 0) {
    return [];
  }
  const thinned = [points[0]];
  for (let i = 1; i < points.length; i++) {
    const last = thinned[thinned.length - 1];
    if (points[i].recordedAt === last.recordedAt) {
      continue; // never emit two points with identical recordedAt, even the final one
    }
    const isLast = i === points.length - 1;
    const gapMs = new Date(points[i].recordedAt).getTime() - new Date(last.recordedAt).getTime();
    if (isLast || gapMs >= TEN_MINUTES_MS) {
      thinned.push(points[i]);
    }
  }
  return thinned;
}

export async function getLocationHistory(
  employeeId: string,
  date: string
): Promise<HistoryPoint[]> {
  const dayStart = new Date(`${date}T00:00:00.000Z`);
  const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);
  const rows = await findLocationHistoryForDay(employeeId, dayStart, dayEnd);
  const points = rows.map(toHistoryPoint);
  return thinPoints(points);
}
