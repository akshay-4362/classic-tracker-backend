// src/modules/locations/locations.service.test.ts
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('./locations.repository.js', () => ({
  insertLocationBatch: vi.fn(),
  findCurrentLocations: vi.fn(),
}));

vi.mock('../websocket/socket.js', () => ({
  broadcastLocationUpdate: vi.fn(),
}));

vi.mock('../profile/profile.repository.js', () => ({
  findUserVisibility: vi.fn(),
}));

import { findCurrentLocations, insertLocationBatch } from './locations.repository.js';
import { broadcastLocationUpdate } from '../websocket/socket.js';
import { findUserVisibility } from '../profile/profile.repository.js';
import { getCurrentLocations, ingestLocations } from './locations.service.js';
import type { LocationPointInput } from './locations.dto.js';
import type { CurrentLocationRow } from './locations.repository.js';

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

    const result = await ingestLocations('emp-1', 'EMPLOYEE', points);

    expect(result).toEqual({ inserted: 2 });
  });

  it('passes the point with the latest recordedAt as the latest point, regardless of array order', async () => {
    vi.mocked(insertLocationBatch).mockResolvedValue(undefined);
    const earlier = makePoint({ recordedAt: '2026-08-17T12:00:00.000Z', latitude: 1 });
    const later = makePoint({ recordedAt: '2026-08-17T12:05:00.000Z', latitude: 2 });
    const points = [later, earlier];

    await ingestLocations('emp-1', 'EMPLOYEE', points);

    expect(insertLocationBatch).toHaveBeenCalledWith('emp-1', points, later);
  });

  it('handles a single-point batch', async () => {
    vi.mocked(insertLocationBatch).mockResolvedValue(undefined);
    const point = makePoint();

    const result = await ingestLocations('emp-1', 'EMPLOYEE', [point]);

    expect(result).toEqual({ inserted: 1 });
    expect(insertLocationBatch).toHaveBeenCalledWith('emp-1', [point], point);
  });

  it('broadcasts an EMPLOYEE update to their own room, admins, and employees', async () => {
    vi.mocked(insertLocationBatch).mockResolvedValue(undefined);
    const point = makePoint({ latitude: 40.7128, longitude: -74.006 });

    await ingestLocations('emp-1', 'EMPLOYEE', [point]);

    expect(broadcastLocationUpdate).toHaveBeenCalledWith(
      {
        employeeId: 'emp-1',
        latitude: 40.7128,
        longitude: -74.006,
        updatedAt: expect.any(String),
      },
      expect.arrayContaining(['user:emp-1', 'role:ADMIN', 'role:EMPLOYEE'])
    );
    expect(findUserVisibility).not.toHaveBeenCalled();
  });

  it('broadcasts an ADMIN update to their own room and all admins, plus employees when visible', async () => {
    vi.mocked(insertLocationBatch).mockResolvedValue(undefined);
    vi.mocked(findUserVisibility).mockResolvedValue(true);
    const point = makePoint({ latitude: 40.7128, longitude: -74.006 });

    await ingestLocations('admin-1', 'ADMIN', [point]);

    expect(findUserVisibility).toHaveBeenCalledWith('admin-1');
    expect(broadcastLocationUpdate).toHaveBeenCalledWith(
      {
        employeeId: 'admin-1',
        latitude: 40.7128,
        longitude: -74.006,
        updatedAt: expect.any(String),
      },
      expect.arrayContaining(['user:admin-1', 'role:ADMIN', 'role:EMPLOYEE'])
    );
  });

  it('still broadcasts an ADMIN update to their own room and all admins, but not employees, when their visibility flag is false', async () => {
    vi.mocked(insertLocationBatch).mockResolvedValue(undefined);
    vi.mocked(findUserVisibility).mockResolvedValue(false);
    const point = makePoint();

    const result = await ingestLocations('admin-1', 'ADMIN', [point]);

    expect(result).toEqual({ inserted: 1 });
    const [, rooms] = vi.mocked(broadcastLocationUpdate).mock.calls[0]!;
    expect(rooms).toEqual(expect.arrayContaining(['user:admin-1', 'role:ADMIN']));
    expect(rooms).not.toContain('role:EMPLOYEE');
  });

  it('still broadcasts an ADMIN update to their own room and all admins, but not employees, when their visibility flag lookup returns null', async () => {
    vi.mocked(insertLocationBatch).mockResolvedValue(undefined);
    vi.mocked(findUserVisibility).mockResolvedValue(null);
    const point = makePoint();

    const result = await ingestLocations('admin-1', 'ADMIN', [point]);

    expect(result).toEqual({ inserted: 1 });
    const [, rooms] = vi.mocked(broadcastLocationUpdate).mock.calls[0]!;
    expect(rooms).toEqual(expect.arrayContaining(['user:admin-1', 'role:ADMIN']));
    expect(rooms).not.toContain('role:EMPLOYEE');
  });

  it('still resolves with the insert count when the broadcast throws', async () => {
    vi.mocked(insertLocationBatch).mockResolvedValue(undefined);
    vi.mocked(broadcastLocationUpdate).mockImplementation(() => {
      throw new Error('socket adapter error');
    });
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const points = [makePoint(), makePoint()];

    const result = await ingestLocations('emp-1', 'EMPLOYEE', points);

    expect(result).toEqual({ inserted: 2 });
    expect(consoleErrorSpy).toHaveBeenCalled();

    consoleErrorSpy.mockRestore();
  });
});

function makeRow(overrides: Partial<CurrentLocationRow> = {}): CurrentLocationRow {
  return {
    employeeId: 'emp-1',
    latitude: 12.9,
    longitude: 77.6,
    updatedAt: new Date('2026-08-19T00:00:00.000Z'),
    role: 'EMPLOYEE',
    locationVisibleToEmployees: false,
    ...overrides,
  };
}

describe('getCurrentLocations', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns every row for an ADMIN caller, including other admins', async () => {
    vi.mocked(findCurrentLocations).mockResolvedValue([
      makeRow({ employeeId: 'emp-1', role: 'EMPLOYEE' }),
      makeRow({ employeeId: 'admin-2', role: 'ADMIN', locationVisibleToEmployees: false }),
    ]);

    const result = await getCurrentLocations('admin-1', 'ADMIN');

    expect(result.map((p) => p.employeeId)).toEqual(['emp-1', 'admin-2']);
  });

  it('for an EMPLOYEE caller, includes other employees and visible admins, excludes hidden admins', async () => {
    vi.mocked(findCurrentLocations).mockResolvedValue([
      makeRow({ employeeId: 'emp-2', role: 'EMPLOYEE' }),
      makeRow({ employeeId: 'admin-1', role: 'ADMIN', locationVisibleToEmployees: true }),
      makeRow({ employeeId: 'admin-2', role: 'ADMIN', locationVisibleToEmployees: false }),
    ]);

    const result = await getCurrentLocations('emp-1', 'EMPLOYEE');

    expect(result.map((p) => p.employeeId)).toEqual(['emp-2', 'admin-1']);
  });

  it('always includes the caller their own row even if it would otherwise be filtered', async () => {
    vi.mocked(findCurrentLocations).mockResolvedValue([
      makeRow({ employeeId: 'admin-1', role: 'ADMIN', locationVisibleToEmployees: false }),
    ]);

    const result = await getCurrentLocations('admin-1', 'EMPLOYEE');

    expect(result.map((p) => p.employeeId)).toEqual(['admin-1']);
  });

  it('maps rows to the API point shape with an ISO updatedAt', async () => {
    vi.mocked(findCurrentLocations).mockResolvedValue([
      makeRow({ employeeId: 'emp-1', latitude: 12.9, longitude: 77.6 }),
    ]);

    const result = await getCurrentLocations('emp-1', 'EMPLOYEE');

    expect(result).toEqual([
      {
        employeeId: 'emp-1',
        latitude: 12.9,
        longitude: 77.6,
        updatedAt: '2026-08-19T00:00:00.000Z',
      },
    ]);
  });
});
