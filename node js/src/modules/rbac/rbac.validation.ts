import { z } from "zod";

export const createStaffRoleSchema = z.object({
  name: z.string().min(2),
  description: z.string().optional(),
  salonId: z.string().optional(),
  permissions: z.array(z.string()).optional(),
});

export type CreateStaffRoleDto = z.infer<typeof createStaffRoleSchema>;

export const updateStaffRoleSchema = z.object({
  name: z.string().min(2).optional(),
  description: z.string().optional(),
  permissions: z.array(z.string()).optional(),
});

export const planPermissionSchema = z.object({ permissions: z.array(z.string().min(1)).default([]) });
export const systemRoleSchema = z.object({ name: z.string().trim().min(2).max(100), subscriptionPlanId: z.string().uuid(), permissions: z.array(z.string().min(1)).default([]), isActive: z.boolean().default(true) });
export const systemRoleUpdateSchema = systemRoleSchema.partial();
export type UpdateStaffRoleDto = z.infer<typeof updateStaffRoleSchema>;
