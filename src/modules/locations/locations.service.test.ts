// src/modules/locations/locations.service.test.ts
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('./locations.repository.js', () => ({
  insertLocationBatch: vi.fn(),
}));

import { insertLocationBatch } from './locations.repository.js';
import { ingestLocations } from './locations.service.js';
import type { LocationPointInput } from './locations.dto.js';

function makePoint(overrides: Partial<LocationPointInput> = {}): LocationPointInput {
  return {
    latitude: 40.7128,
    longitude: -74.006,
    accuracy: null,
    altitude: null,
    speed: null,
    heading: null,
    batteryLevel: null,
    recordedAt: '2026-08-17T12:00:00.000Z',
    ...overrides,
  };
}

describe('ingestLocations', () => {
  beforeEach(() => vi.clearAllMocks());

  it('inserts the batch and returns the count', async () => {
    vi.mocked(insertLocationBatch).mockResolvedValue(undefined);
    const points = [makePoint(), makePoint()];

    const result = await ingestLocations('emp-1', points);

    expect(result).toEqual({ inserted: 2 });
  });

  it('passes the point with the latest recordedAt as the latest point, regardless of array order', async () => {
    vi.mocked(insertLocationBatch).mockResolvedValue(undefined);
    const earlier = makePoint({ recordedAt: '2026-08-17T12:00:00.000Z', latitude: 1 });
    const later = makePoint({ recordedAt: '2026-08-17T12:05:00.000Z', latitude: 2 });
    const points = [later, earlier];

    await ingestLocations('emp-1', points);

    expect(insertLocationBatch).toHaveBeenCalledWith('emp-1', points, later);
  });

  it('handles a single-point batch', async () => {
    vi.mocked(insertLocationBatch).mockResolvedValue(undefined);
    const point = makePoint();

    const result = await ingestLocations('emp-1', [point]);

    expect(result).toEqual({ inserted: 1 });
    expect(insertLocationBatch).toHaveBeenCalledWith('emp-1', [point], point);
  });
});
