import argon2 from 'argon2';
import {
  findAllEmployees,
  findEmployeeById,
  findUserByEmail,
  insertEmployee,
  updateEmployeeById,
  type UserRow,
} from './employees.repository.js';

export class EmployeeError extends Error {}
export class EmployeeNotFoundError extends EmployeeError {}
export class EmployeeEmailConflictError extends EmployeeError {}

export interface EmployeeListItem {
  id: string;
  name: string;
  email: string;
  status: 'ACTIVE' | 'DISABLED';
}

export interface EmployeeDetailView {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  status: 'ACTIVE' | 'DISABLED';
}

function toListItem(row: UserRow): EmployeeListItem {
  return { id: row.id, name: row.name, email: row.email, status: row.status };
}

function toDetailView(row: UserRow): EmployeeDetailView {
  return { id: row.id, name: row.name, email: row.email, phone: row.phone ?? null, status: row.status };
}

export async function listEmployees(): Promise<EmployeeListItem[]> {
  const rows = await findAllEmployees();
  return rows.map(toListItem);
}

export async function createEmployee(data: {
  name: string;
  email: string;
  phone?: string;
  password: string;
}): Promise<EmployeeDetailView> {
  const existing = await findUserByEmail(data.email);
  if (existing) {
    throw new EmployeeEmailConflictError('Email already in use');
  }

  const passwordHash = await argon2.hash(data.password);
  const row = await insertEmployee({
    name: data.name,
    email: data.email,
    phone: data.phone ?? null,
    passwordHash,
  });
  return toDetailView(row);
}

export async function getEmployee(id: string): Promise<EmployeeDetailView> {
  const row = await findEmployeeById(id);
  if (!row) {
    throw new EmployeeNotFoundError('Employee not found');
  }
  return toDetailView(row);
}

export async function updateEmployee(
  id: string,
  data: {
    name?: string;
    email?: string;
    phone?: string | null;
    status?: 'ACTIVE' | 'DISABLED';
    password?: string;
  }
): Promise<EmployeeDetailView> {
  const existing = await findEmployeeById(id);
  if (!existing) {
    throw new EmployeeNotFoundError('Employee not found');
  }

  if (data.email !== undefined) {
    const emailOwner = await findUserByEmail(data.email);
    if (emailOwner && emailOwner.id !== id) {
      throw new EmployeeEmailConflictError('Email already in use');
    }
  }

  const updateData: {
    name?: string;
    email?: string;
    phone?: string | null;
    status?: 'ACTIVE' | 'DISABLED';
    passwordHash?: string;
  } = {};

  if (data.name !== undefined) updateData.name = data.name;
  if (data.email !== undefined) updateData.email = data.email;
  if ('phone' in data) updateData.phone = data.phone;
  if (data.status !== undefined) updateData.status = data.status;
  if (data.password) {
    updateData.passwordHash = await argon2.hash(data.password);
  }

  const updated = await updateEmployeeById(id, updateData);
  if (!updated) {
    throw new EmployeeNotFoundError('Employee not found');
  }
  return toDetailView(updated);
}
