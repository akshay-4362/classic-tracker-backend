import { insertLocationBatch } from './locations.repository.js';
import { broadcastLocationUpdate } from '../websocket/socket.js';
import { findUserVisibility } from '../profile/profile.repository.js';
import type { LocationPointInput } from './locations.dto.js';
import type { Role } from '../../common/types.js';

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
  role: Role,
  points: LocationPointInput[]
): Promise<IngestLocationsResult> {
  const latestPoint = selectLatestPoint(points);
  await insertLocationBatch(employeeId, points, latestPoint);

  try {
    const shouldBroadcast =
      role === 'EMPLOYEE' ? true : await findUserVisibility(employeeId);
    if (shouldBroadcast) {
      broadcastLocationUpdate({
        employeeId,
        latitude: latestPoint.latitude,
        longitude: latestPoint.longitude,
        updatedAt: new Date().toISOString(),
      });
    }
  } catch (err) {
    // The database write above already committed successfully. A broadcast
    // failure (payload serialization, Socket.IO adapter error, a
    // findUserVisibility DB error, etc.) must not surface as an ingest
    // failure, or the mobile client will retry the batch and write
    // duplicate rows (location_history has no dedupe key).
    console.error(err);
  }

  return { inserted: points.length };
}
