import { z } from 'zod';

export const updateLocationVisibilitySchema = z.object({
  locationVisibleToEmployees: z.boolean(),
});

export type UpdateLocationVisibilityInput = z.infer<typeof updateLocationVisibilitySchema>;
