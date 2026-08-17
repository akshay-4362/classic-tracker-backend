import { z } from 'zod';

export const updateLocationVisibilitySchema = z.object({
  locationVisibleToEmployees: z.boolean(),
});

export type UpdateLocationVisibilityInput = z.infer<typeof updateLocationVisibilitySchema>;

export const updateProfileSchema = z
  .object({
    name: z.string().min(1).optional(),
    phone: z.string().nullable().optional(),
    currentPassword: z.string().optional(),
    newPassword: z.string().min(8).optional(),
  })
  .refine(
    (data) => data.name !== undefined || 'phone' in data || data.newPassword !== undefined,
    { message: 'At least one field is required' }
  )
  .refine((data) => !data.newPassword || data.currentPassword, {
    message: 'currentPassword is required to change your password',
  });

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
