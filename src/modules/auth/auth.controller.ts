import type { Request, Response } from 'express';
import { loginSchema, refreshSchema } from './auth.dto.js';
import { AuthError, getMe, login, logout, refresh } from './auth.service.js';

export async function loginHandler(req: Request, res: Response): Promise<void> {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid email or password format' });
    return;
  }

  try {
    const result = await login(parsed.data.email, parsed.data.password);
    res.status(200).json(result);
  } catch (error) {
    if (error instanceof AuthError) {
      res.status(401).json({ error: error.message });
      return;
    }
    throw error;
  }
}

export async function refreshHandler(req: Request, res: Response): Promise<void> {
  const parsed = refreshSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'refreshToken is required' });
    return;
  }

  try {
    const result = await refresh(parsed.data.refreshToken);
    res.status(200).json(result);
  } catch (error) {
    if (error instanceof AuthError) {
      res.status(401).json({ error: error.message });
      return;
    }
    throw error;
  }
}

export async function logoutHandler(req: Request, res: Response): Promise<void> {
  await logout(req.user!.id);
  res.status(200).json({ message: 'Logged out' });
}

export async function meHandler(req: Request, res: Response): Promise<void> {
  try {
    const user = await getMe(req.user!.id);
    res.status(200).json({ user });
  } catch (error) {
    if (error instanceof AuthError) {
      res.status(404).json({ error: error.message });
      return;
    }
    throw error;
  }
}
