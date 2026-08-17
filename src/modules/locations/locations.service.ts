import { insertLocationBatch } from './locations.repository.js';
import type { LocationPointInput } from './locations.dto.js';

export interface IngestLocationsResult {
  inserted: number;
}

function selectLatestPoint(points: LocationPointInput[]): LocationPointInput {
  return points.reduce((latest, point) =>
    new Date(point.recordedAt) > new Date(latest.recordedAt) ? point : latest
  );
}

export async function ingestLocations(
  employeeId: string,
  points: LocationPointInput[]
): Promise<IngestLocationsResult> {
  const latestPoint = selectLatestPoint(points);
  await insertLocationBatch(employeeId, points, latestPoint);
  return { inserted: points.length };
}
