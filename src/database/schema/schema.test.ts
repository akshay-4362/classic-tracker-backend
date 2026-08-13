import { describe, expect, it } from 'vitest';
import { getTableColumns } from 'drizzle-orm';
import { users } from './users.js';
import { employeeLocations } from './employeeLocations.js';
import { locationHistory } from './locationHistory.js';

describe('database schema', () => {
  it('users table has the expected columns', () => {
    expect(Object.keys(getTableColumns(users)).sort()).toEqual(
      [
        'createdAt',
        'email',
        'id',
        'name',
        'passwordHash',
        'phone',
        'refreshTokenExpiresAt',
        'refreshTokenHash',
        'role',
        'status',
        'updatedAt',
      ].sort()
    );
  });

  it('employeeLocations table has the expected columns', () => {
    expect(Object.keys(getTableColumns(employeeLocations)).sort()).toEqual(
      [
        'accuracy',
        'altitude',
        'batteryLevel',
        'createdAt',
        'employeeId',
        'heading',
        'id',
        'isTracking',
        'lastSeenAt',
        'latitude',
        'location',
        'longitude',
        'speed',
        'updatedAt',
      ].sort()
    );
  });

  it('locationHistory table has the expected columns', () => {
    expect(Object.keys(getTableColumns(locationHistory)).sort()).toEqual(
      [
        'accuracy',
        'altitude',
        'batteryLevel',
        'createdAt',
        'employeeId',
        'heading',
        'id',
        'latitude',
        'location',
        'longitude',
        'recordedAt',
        'speed',
      ].sort()
    );
  });
});
