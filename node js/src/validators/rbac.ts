import { z } from "zod";

export const createMenuSchema = z.object({
    label: z.string().min(1, "Menu label is required"),
    path: z.string().optional(),
    icon: z.string().optional(),
    parentId: z.string().uuid().nullable().optional(),
    showInSidebar: z.boolean().optional(),
}).passthrough();

export const updateMenuSchema = z.object({
    label: z.string().min(1).optional(),
    path: z.string().optional(),
    icon: z.string().optional(),
    parentId: z.string().uuid().nullable().optional(),
    showInSidebar: z.boolean().optional(),
}).passthrough();

export const reorderMenusSchema = z.object({
    items: z.array(
        z.object({
            id: z.string().min(1, "Item ID is required"),
            order: z.number().int(),
        })
    ).min(1, "Items array must not be empty"),
}).passthrough();

export const toggleRolePermissionSchema = z.object({
    action: z.string().min(1, "Permission action is required"),
    active: z.boolean(),
}).passthrough();

export const replaceRolePermissionsSchema = z.object({
    permissions: z.array(z.string().min(1)).default([]),
}).passthrough();

export const createStaffRoleSchema = z.object({
    name: z.string().min(2, "Role name must be at least 2 characters"),
    description: z.string().optional(),
    salonId: z.string().optional(),
    permissions: z.array(z.string()).optional(),
}).passthrough();

export const updateStaffRoleSchema = z.object({
    name: z.string().min(2).optional(),
    description: z.string().optional(),
    permissions: z.array(z.string()).optional(),
}).passthrough();

export const planPermissionSchema = z.object({ permissions: z.array(z.string().min(1)).default([]) });
export const systemRoleSchema = z.object({ name: z.string().trim().min(2).max(100), subscriptionPlanId: z.string().uuid(), permissions: z.array(z.string().min(1)).default([]), isActive: z.boolean().default(true) });
export const systemRoleUpdateSchema = systemRoleSchema.partial();

