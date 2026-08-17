import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('./roster.repository.js', () => ({
  findActiveUsers: vi.fn(),
}));

import { findActiveUsers } from './roster.repository.js';
import { listRoster } from './roster.service.js';

const baseRow = {
  id: 'user-1',
  name: 'Bob',
  role: 'EMPLOYEE' as const,
};

describe('listRoster', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns id, name, and role for each active user', async () => {
    vi.mocked(findActiveUsers).mockResolvedValue([
      baseRow,
      { ...baseRow, id: 'user-2', name: 'Alice', role: 'ADMIN' },
    ]);

    const result = await listRoster();

    expect(result).toEqual([
      { id: 'user-1', name: 'Bob', role: 'EMPLOYEE' },
      { id: 'user-2', name: 'Alice', role: 'ADMIN' },
    ]);
  });

  it('returns an empty array when there are no active users', async () => {
    vi.mocked(findActiveUsers).mockResolvedValue([]);

    const result = await listRoster();

    expect(result).toEqual([]);
  });
});
