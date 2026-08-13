import argon2 from 'argon2';
import crypto from 'node:crypto';
import { findUserByEmail, findUserById, setRefreshToken, type UserRow } from './auth.repository.js';
import { REFRESH_TOKEN_TTL_MS, signAccessToken, signRefreshToken, verifyRefreshToken } from './jwt.js';

export class AuthError extends Error {}

export interface AuthUserView {
  id: string;
  name: string;
  email: string;
  role: 'ADMIN' | 'EMPLOYEE';
  status: 'ACTIVE' | 'DISABLED';
}

function hashRefreshToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function toUserView(user: UserRow): AuthUserView {
  return { id: user.id, name: user.name, email: user.email, role: user.role, status: user.status };
}

export async function login(
  email: string,
  password: string
): Promise<{ user: AuthUserView; accessToken: string; refreshToken: string }> {
  const user = await findUserByEmail(email);
  if (!user || user.status !== 'ACTIVE') {
    throw new AuthError('Invalid email or password');
  }

  const passwordValid = await argon2.verify(user.passwordHash, password);
  if (!passwordValid) {
    throw new AuthError('Invalid email or password');
  }

  const accessToken = signAccessToken({ sub: user.id, role: user.role });
  const refreshToken = signRefreshToken({ sub: user.id });
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_MS);
  await setRefreshToken(user.id, hashRefreshToken(refreshToken), expiresAt);

  return { user: toUserView(user), accessToken, refreshToken };
}

export async function refresh(
  refreshToken: string
): Promise<{ accessToken: string; refreshToken: string }> {
  let payload;
  try {
    payload = verifyRefreshToken(refreshToken);
  } catch {
    throw new AuthError('Invalid or expired refresh token');
  }

  const user = await findUserById(payload.sub);
  if (!user || !user.refreshTokenHash || !user.refreshTokenExpiresAt) {
    throw new AuthError('Invalid or expired refresh token');
  }

  const providedHash = hashRefreshToken(refreshToken);
  if (providedHash !== user.refreshTokenHash || user.refreshTokenExpiresAt.getTime() < Date.now()) {
    throw new AuthError('Invalid or expired refresh token');
  }

  const accessToken = signAccessToken({ sub: user.id, role: user.role });
  const newRefreshToken = signRefreshToken({ sub: user.id });
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_MS);
  await setRefreshToken(user.id, hashRefreshToken(newRefreshToken), expiresAt);

  return { accessToken, refreshToken: newRefreshToken };
}

export async function logout(userId: string): Promise<void> {
  await setRefreshToken(userId, null, null);
}

export async function getMe(userId: string): Promise<AuthUserView> {
  const user = await findUserById(userId);
  if (!user) {
    throw new AuthError('User not found');
  }
  return toUserView(user);
}
