import { z } from 'zod';

export const locationPointSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  accuracy: z.number().nullable().optional(),
  altitude: z.number().nullable().optional(),
  speed: z.number().nullable().optional(),
  heading: z.number().nullable().optional(),
  batteryLevel: z.number().nullable().optional(),
  recordedAt: z.string().datetime(),
});

export type LocationPointInput = z.infer<typeof locationPointSchema>;

export const locationBatchSchema = z.object({
  points: z.array(locationPointSchema).min(1).max(500),
});

export type LocationBatchInput = z.infer<typeof locationBatchSchema>;
