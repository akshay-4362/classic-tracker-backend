import { beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';

vi.mock('./employees.service.js', () => ({
  EmployeeError: class EmployeeError extends Error {},
  EmployeeNotFoundError: class EmployeeNotFoundError extends Error {},
  EmployeeEmailConflictError: class EmployeeEmailConflictError extends Error {},
  listEmployees: vi.fn(),
  createEmployee: vi.fn(),
  getEmployee: vi.fn(),
  updateEmployee: vi.fn(),
}));

import { createApp } from '../../app.js';
import {
  EmployeeEmailConflictError,
  EmployeeNotFoundError,
  createEmployee,
  getEmployee,
  listEmployees,
  updateEmployee,
} from './employees.service.js';
import { signAccessToken } from '../auth/jwt.js';

const adminToken = signAccessToken({ sub: 'admin-1', role: 'ADMIN' });
const employeeToken = signAccessToken({ sub: 'emp-1', role: 'EMPLOYEE' });

const sampleSummary = { id: 'emp-1', name: 'Bob', email: 'bob@example.com', status: 'ACTIVE' as const };
const sampleDetail = {
  id: 'emp-1',
  name: 'Bob',
  email: 'bob@example.com',
  phone: null,
  status: 'ACTIVE' as const,
};

describe('employees routes', () => {
  beforeEach(() => vi.clearAllMocks());

  describe('GET /api/employees', () => {
    it('returns employee list for admin', async () => {
      vi.mocked(listEmployees).mockResolvedValue([sampleSummary]);
      const res = await request(createApp())
        .get('/api/employees')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.employees).toHaveLength(1);
      expect(res.body.employees[0].email).toBe('bob@example.com');
    });

    it('returns 401 without auth', async () => {
      const res = await request(createApp()).get('/api/employees');
      expect(res.status).toBe(401);
      expect(listEmployees).not.toHaveBeenCalled();
    });

    it('returns 403 for employee role', async () => {
      const res = await request(createApp())
        .get('/api/employees')
        .set('Authorization', `Bearer ${employeeToken}`);
      expect(res.status).toBe(403);
      expect(listEmployees).not.toHaveBeenCalled();
    });
  });

  describe('POST /api/employees', () => {
    it('returns 201 with created employee', async () => {
      vi.mocked(createEmployee).mockResolvedValue(sampleDetail);
      const res = await request(createApp())
        .post('/api/employees')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Bob', email: 'bob@example.com', password: 'password123' });
      expect(res.status).toBe(201);
      expect(res.body.employee.email).toBe('bob@example.com');
    });

    it('returns 400 for missing required fields', async () => {
      const res = await request(createApp())
        .post('/api/employees')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Bob' });
      expect(res.status).toBe(400);
      expect(createEmployee).not.toHaveBeenCalled();
    });

    it('returns 400 when password is too short', async () => {
      const res = await request(createApp())
        .post('/api/employees')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Bob', email: 'bob@example.com', password: 'short' });
      expect(res.status).toBe(400);
      expect(createEmployee).not.toHaveBeenCalled();
    });

    it('returns 409 for duplicate email', async () => {
      vi.mocked(createEmployee).mockRejectedValue(
        new EmployeeEmailConflictError('Email already in use')
      );
      const res = await request(createApp())
        .post('/api/employees')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Bob', email: 'bob@example.com', password: 'password123' });
      expect(res.status).toBe(409);
      expect(res.body.error).toBe('Email already in use');
    });
  });

  describe('GET /api/employees/:id', () => {
    it('returns employee detail', async () => {
      vi.mocked(getEmployee).mockResolvedValue(sampleDetail);
      const res = await request(createApp())
        .get('/api/employees/emp-1')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.employee.id).toBe('emp-1');
      expect(res.body.employee.phone).toBeNull();
    });

    it('returns 404 when employee not found', async () => {
      vi.mocked(getEmployee).mockRejectedValue(new EmployeeNotFoundError('Employee not found'));
      const res = await request(createApp())
        .get('/api/employees/emp-1')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(404);
    });
  });

  describe('PUT /api/employees/:id', () => {
    it('returns 200 with updated employee', async () => {
      vi.mocked(updateEmployee).mockResolvedValue({ ...sampleDetail, name: 'Robert' });
      const res = await request(createApp())
        .put('/api/employees/emp-1')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Robert' });
      expect(res.status).toBe(200);
      expect(res.body.employee.name).toBe('Robert');
    });

    it('returns 400 for an empty body', async () => {
      const res = await request(createApp())
        .put('/api/employees/emp-1')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({});
      expect(res.status).toBe(400);
      expect(updateEmployee).not.toHaveBeenCalled();
    });

    it('returns 404 when employee not found', async () => {
      vi.mocked(updateEmployee).mockRejectedValue(new EmployeeNotFoundError('Employee not found'));
      const res = await request(createApp())
        .put('/api/employees/emp-1')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Robert' });
      expect(res.status).toBe(404);
    });

    it('returns 409 for duplicate email', async () => {
      vi.mocked(updateEmployee).mockRejectedValue(
        new EmployeeEmailConflictError('Email already in use')
      );
      const res = await request(createApp())
        .put('/api/employees/emp-1')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ email: 'other@example.com' });
      expect(res.status).toBe(409);
    });
  });
});
