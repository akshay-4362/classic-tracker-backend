import { z } from 'zod';

export const updateTrackingSettingsSchema = z
  .object({
    updateIntervalMs: z.number().int().min(5000).max(300000).optional(),
    distanceIntervalM: z.number().int().min(5).max(1000).optional(),
  })
  .refine((data) => Object.values(data).some((v) => v !== undefined), {
    message: 'At least one field is required',
  });

export type UpdateTrackingSettingsInput = z.infer<typeof updateTrackingSettingsSchema>;
