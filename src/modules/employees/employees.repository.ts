import { and, eq } from 'drizzle-orm';
import { db } from '../../database/client.js';
import { users } from '../../database/schema/users.js';

export type UserRow = typeof users.$inferSelect;

export async function findAllEmployees(): Promise<UserRow[]> {
  return db.select().from(users).where(eq(users.role, 'EMPLOYEE'));
}

export async function findEmployeeById(id: string): Promise<UserRow | null> {
  const [user] = await db
    .select()
    .from(users)
    .where(and(eq(users.id, id), eq(users.role, 'EMPLOYEE')))
    .limit(1);
  return user ?? null;
}

export async function findUserByEmail(email: string): Promise<UserRow | null> {
  const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
  return user ?? null;
}

export async function insertEmployee(data: {
  name: string;
  email: string;
  phone: string | null;
  passwordHash: string;
}): Promise<UserRow> {
  const [user] = await db
    .insert(users)
    .values({
      name: data.name,
      email: data.email,
      phone: data.phone,
      passwordHash: data.passwordHash,
      role: 'EMPLOYEE',
      status: 'ACTIVE',
    })
    .returning();
  return user;
}

export async function updateEmployeeById(
  id: string,
  data: {
    name?: string;
    email?: string;
    phone?: string | null;
    status?: 'ACTIVE' | 'DISABLED';
    passwordHash?: string;
  }
): Promise<UserRow | null> {
  const setFields: {
    updatedAt: Date;
    name?: string;
    email?: string;
    phone?: string | null;
    status?: 'ACTIVE' | 'DISABLED';
    passwordHash?: string;
  } = { updatedAt: new Date() };

  if (data.name !== undefined) setFields.name = data.name;
  if (data.email !== undefined) setFields.email = data.email;
  if ('phone' in data) setFields.phone = data.phone;
  if (data.status !== undefined) setFields.status = data.status;
  if (data.passwordHash !== undefined) setFields.passwordHash = data.passwordHash;

  const [updated] = await db
    .update(users)
    .set(setFields)
    .where(and(eq(users.id, id), eq(users.role, 'EMPLOYEE')))
    .returning();
  return updated ?? null;
}
