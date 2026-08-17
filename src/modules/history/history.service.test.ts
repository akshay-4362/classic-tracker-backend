import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('./history.repository.js', () => ({
  findLocationHistoryForDay: vi.fn(),
}));

import { findLocationHistoryForDay } from './history.repository.js';
import { getLocationHistory } from './history.service.js';
import type { LocationHistoryRow } from './history.repository.js';

function makeRow(overrides: Partial<LocationHistoryRow> = {}): LocationHistoryRow {
  return {
    id: 'row-1',
    employeeId: 'emp-1',
    latitude: 40.7128,
    longitude: -74.006,
    location: 'POINT(-74.006 40.7128)',
    accuracy: null,
    altitude: null,
    speed: null,
    heading: null,
    batteryLevel: null,
    recordedAt: new Date('2026-08-17T09:00:00.000Z'),
    createdAt: new Date('2026-08-17T09:00:00.000Z'),
    ...overrides,
  };
}

describe('getLocationHistory', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns an empty array when there is no history for the day', async () => {
    vi.mocked(findLocationHistoryForDay).mockResolvedValue([]);

    const result = await getLocationHistory('emp-1', '2026-08-17');

    expect(result).toEqual([]);
  });

  it('passes the correct UTC day boundary to the repository', async () => {
    vi.mocked(findLocationHistoryForDay).mockResolvedValue([]);

    await getLocationHistory('emp-1', '2026-08-17');

    expect(findLocationHistoryForDay).toHaveBeenCalledWith(
      'emp-1',
      new Date('2026-08-17T00:00:00.000Z'),
      new Date('2026-08-18T00:00:00.000Z')
    );
  });

  it('keeps a single point unchanged', async () => {
    vi.mocked(findLocationHistoryForDay).mockResolvedValue([
      makeRow({ recordedAt: new Date('2026-08-17T09:00:00.000Z') }),
    ]);

    const result = await getLocationHistory('emp-1', '2026-08-17');

    expect(result).toEqual([
      {
        latitude: 40.7128,
        longitude: -74.006,
        recordedAt: '2026-08-17T09:00:00.000Z',
        speed: null,
        batteryLevel: null,
      },
    ]);
  });

  it('keeps only the first and last point when all points are within 10 minutes', async () => {
    vi.mocked(findLocationHistoryForDay).mockResolvedValue([
      makeRow({ id: 'r1', recordedAt: new Date('2026-08-17T09:00:00.000Z') }),
      makeRow({ id: 'r2', recordedAt: new Date('2026-08-17T09:02:00.000Z') }),
      makeRow({ id: 'r3', recordedAt: new Date('2026-08-17T09:04:00.000Z') }),
      makeRow({ id: 'r4', recordedAt: new Date('2026-08-17T09:06:00.000Z') }),
      makeRow({ id: 'r5', recordedAt: new Date('2026-08-17T09:08:00.000Z') }),
    ]);

    const result = await getLocationHistory('emp-1', '2026-08-17');

    expect(result.map((p) => p.recordedAt)).toEqual([
      '2026-08-17T09:00:00.000Z',
      '2026-08-17T09:08:00.000Z',
    ]);
  });

  it('keeps a point exactly 10 minutes after the last kept point', async () => {
    vi.mocked(findLocationHistoryForDay).mockResolvedValue([
      makeRow({ id: 'r1', recordedAt: new Date('2026-08-17T09:00:00.000Z') }),
      makeRow({ id: 'r2', recordedAt: new Date('2026-08-17T09:10:00.000Z') }),
      makeRow({ id: 'r3', recordedAt: new Date('2026-08-17T09:12:00.000Z') }),
    ]);

    const result = await getLocationHistory('emp-1', '2026-08-17');

    expect(result.map((p) => p.recordedAt)).toEqual([
      '2026-08-17T09:00:00.000Z',
      '2026-08-17T09:10:00.000Z',
      '2026-08-17T09:12:00.000Z',
    ]);
  });

  it('keeps every point when they are spread more than 10 minutes apart', async () => {
    vi.mocked(findLocationHistoryForDay).mockResolvedValue([
      makeRow({ id: 'r1', recordedAt: new Date('2026-08-17T09:00:00.000Z') }),
      makeRow({ id: 'r2', recordedAt: new Date('2026-08-17T09:15:00.000Z') }),
      makeRow({ id: 'r3', recordedAt: new Date('2026-08-17T09:30:00.000Z') }),
    ]);

    const result = await getLocationHistory('emp-1', '2026-08-17');

    expect(result.map((p) => p.recordedAt)).toEqual([
      '2026-08-17T09:00:00.000Z',
      '2026-08-17T09:15:00.000Z',
      '2026-08-17T09:30:00.000Z',
    ]);
  });
});
