import { z } from 'zod';

export const historyQuerySchema = z.object({
  employeeId: z.uuid(),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'date must be in YYYY-MM-DD format')
    .refine((d) => {
      const parsed = new Date(`${d}T00:00:00.000Z`);
      return !Number.isNaN(parsed.getTime()) && parsed.toISOString().startsWith(d);
    }, 'date is not a real calendar date'),
});

export type HistoryQueryInput = z.infer<typeof historyQuerySchema>;
