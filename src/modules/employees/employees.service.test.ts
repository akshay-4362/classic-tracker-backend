// src/modules/employees/employees.service.test.ts
import { beforeEach, describe, expect, it, vi } from 'vitest';
import argon2 from 'argon2';

vi.mock('./employees.repository.js', () => ({
  findAllEmployees: vi.fn(),
  findEmployeeById: vi.fn(),
  findUserByEmail: vi.fn(),
  insertEmployee: vi.fn(),
  updateEmployeeById: vi.fn(),
}));

import {
  findAllEmployees,
  findEmployeeById,
  findUserByEmail,
  insertEmployee,
  updateEmployeeById,
} from './employees.repository.js';
import {
  EmployeeEmailConflictError,
  EmployeeNotFoundError,
  createEmployee,
  getEmployee,
  listEmployees,
  updateEmployee,
} from './employees.service.js';

const baseRow = {
  id: 'emp-1',
  name: 'Bob',
  email: 'bob@example.com',
  phone: null as string | null,
  role: 'EMPLOYEE' as const,
  status: 'ACTIVE' as const,
  locationVisibleToEmployees: false,
  passwordHash: 'hash',
  refreshTokenHash: null as string | null,
  refreshTokenExpiresAt: null as Date | null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('listEmployees', () => {
  it('returns mapped list items', async () => {
    vi.mocked(findAllEmployees).mockResolvedValue([baseRow]);
    const result = await listEmployees();
    expect(result).toEqual([
      { id: 'emp-1', name: 'Bob', email: 'bob@example.com', status: 'ACTIVE' },
    ]);
  });
});

describe('createEmployee', () => {
  beforeEach(() => vi.clearAllMocks());

  it('hashes password, inserts, and returns detail view', async () => {
    vi.mocked(findUserByEmail).mockResolvedValue(null);
    vi.mocked(insertEmployee).mockResolvedValue(baseRow);

    const result = await createEmployee({
      name: 'Bob',
      email: 'bob@example.com',
      password: 'password123',
    });

    expect(result).toEqual({
      id: 'emp-1',
      name: 'Bob',
      email: 'bob@example.com',
      phone: null,
      status: 'ACTIVE',
    });
    const insertCall = vi.mocked(insertEmployee).mock.calls[0][0];
    expect(await argon2.verify(insertCall.passwordHash, 'password123')).toBe(true);
  });

  it('throws EmployeeEmailConflictError when email already exists', async () => {
    vi.mocked(findUserByEmail).mockResolvedValue(baseRow);
    await expect(
      createEmployee({ name: 'Bob', email: 'bob@example.com', password: 'password123' })
    ).rejects.toThrow(EmployeeEmailConflictError);
    expect(insertEmployee).not.toHaveBeenCalled();
  });
});

describe('getEmployee', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns detail view when found', async () => {
    vi.mocked(findEmployeeById).mockResolvedValue(baseRow);
    const result = await getEmployee('emp-1');
    expect(result).toEqual({
      id: 'emp-1',
      name: 'Bob',
      email: 'bob@example.com',
      phone: null,
      status: 'ACTIVE',
    });
  });

  it('throws EmployeeNotFoundError when not found', async () => {
    vi.mocked(findEmployeeById).mockResolvedValue(null);
    await expect(getEmployee('emp-1')).rejects.toThrow(EmployeeNotFoundError);
  });
});

describe('updateEmployee', () => {
  beforeEach(() => vi.clearAllMocks());

  it('updates name and returns updated view', async () => {
    vi.mocked(findEmployeeById).mockResolvedValue(baseRow);
    vi.mocked(updateEmployeeById).mockResolvedValue({ ...baseRow, name: 'Robert' });

    const result = await updateEmployee('emp-1', { name: 'Robert' });

    expect(result.name).toBe('Robert');
    const updateCall = vi.mocked(updateEmployeeById).mock.calls[0][1];
    expect(updateCall).not.toHaveProperty('passwordHash');
  });

  it('throws EmployeeNotFoundError when employee does not exist', async () => {
    vi.mocked(findEmployeeById).mockResolvedValue(null);
    await expect(updateEmployee('emp-1', { name: 'Robert' })).rejects.toThrow(
      EmployeeNotFoundError
    );
  });

  it('throws EmployeeEmailConflictError when email is taken by another user', async () => {
    vi.mocked(findEmployeeById).mockResolvedValue(baseRow);
    vi.mocked(findUserByEmail).mockResolvedValue({ ...baseRow, id: 'other-user' });
    await expect(
      updateEmployee('emp-1', { email: 'taken@example.com' })
    ).rejects.toThrow(EmployeeEmailConflictError);
  });

  it('does not check email conflict when email field is absent', async () => {
    vi.mocked(findEmployeeById).mockResolvedValue(baseRow);
    vi.mocked(updateEmployeeById).mockResolvedValue(baseRow);
    await updateEmployee('emp-1', { name: 'Bob Updated' });
    expect(findUserByEmail).not.toHaveBeenCalled();
  });

  it('hashes and updates password when a non-empty password is provided', async () => {
    vi.mocked(findEmployeeById).mockResolvedValue(baseRow);
    vi.mocked(updateEmployeeById).mockResolvedValue(baseRow);

    await updateEmployee('emp-1', { password: 'newpassword123' });

    const updateCall = vi.mocked(updateEmployeeById).mock.calls[0][1];
    expect(updateCall.passwordHash).toBeDefined();
    expect(await argon2.verify(updateCall.passwordHash!, 'newpassword123')).toBe(true);
  });

  it('does not update passwordHash when password is absent', async () => {
    vi.mocked(findEmployeeById).mockResolvedValue(baseRow);
    vi.mocked(updateEmployeeById).mockResolvedValue(baseRow);

    await updateEmployee('emp-1', { name: 'Bob' });

    const updateCall = vi.mocked(updateEmployeeById).mock.calls[0][1];
    expect(updateCall.passwordHash).toBeUndefined();
  });

  it('does not update passwordHash when password is empty string', async () => {
    vi.mocked(findEmployeeById).mockResolvedValue(baseRow);
    vi.mocked(updateEmployeeById).mockResolvedValue(baseRow);

    await updateEmployee('emp-1', { name: 'Bob', password: '' });

    const updateCall = vi.mocked(updateEmployeeById).mock.calls[0][1];
    expect(updateCall.passwordHash).toBeUndefined();
  });
});
