import { insertLocationBatch } from './locations.repository.js';
import { broadcastLocationUpdate } from '../websocket/socket.js';
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
  broadcastLocationUpdate({
    employeeId,
    latitude: latestPoint.latitude,
    longitude: latestPoint.longitude,
    updatedAt: new Date().toISOString(),
  });
  return { inserted: points.length };
}
