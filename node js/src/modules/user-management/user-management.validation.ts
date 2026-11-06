import { z } from "zod";

const permissionAction = z.string().trim().regex(/^[a-z][a-z0-9_-]*\.[a-z][a-z0-9_-]*$/i);

export const createManagedUserSchema = z.object({
    firstName: z.string().trim().min(2).max(100),
    lastName: z.string().trim().max(100).nullable().optional(),
    email: z.string().trim().email().transform((value) => value.toLowerCase()),
    phone: z.string().trim().min(5).max(32),
    countryCode: z.string().trim().min(1).max(8),
    password: z.string().min(8).max(128),
    roleId: z.string().uuid().optional(),
    roleName: z.enum(["MANAGER", "STAFF"]).optional(),
    salonId: z.string().uuid(),
    branchIds: z.array(z.string().uuid()).default([]),
    permissions: z.array(permissionAction).default([]),
    isActive: z.boolean().default(true),
}).superRefine((value, context) => {
    if (!value.roleId && !value.roleName) {
        context.addIssue({ code: "custom", path: ["roleId"], message: "roleId or roleName is required" });
    }
    if (new Set(value.branchIds).size !== value.branchIds.length) {
        context.addIssue({ code: "custom", path: ["branchIds"], message: "Branch IDs must be unique" });
    }
    if (new Set(value.permissions).size !== value.permissions.length) {
        context.addIssue({ code: "custom", path: ["permissions"], message: "Permissions must be unique" });
    }
});

export const updateManagedUserSchema = z.object({
    firstName: z.string().trim().min(2).max(100).optional(),
    lastName: z.string().trim().max(100).nullable().optional(),
    email: z.string().trim().email().transform((value) => value.toLowerCase()).optional(),
    phone: z.string().trim().min(5).max(32).optional(),
    countryCode: z.string().trim().min(1).max(8).optional(),
    isActive: z.boolean().optional(),
}).refine((value) => Object.keys(value).length > 0, "At least one field must be provided");

export const managedUserStatusSchema = z.object({
    isActive: z.boolean(),
});

export const aiImageAccessSchema = z.object({
    enabled: z.boolean(),
});

export const replaceUserRolesSchema = z.object({
    roleIds: z.array(z.string().uuid()),
}).superRefine((value, context) => {
    if (new Set(value.roleIds).size !== value.roleIds.length) {
        context.addIssue({ code: "custom", path: ["roleIds"], message: "Role IDs must be unique" });
    }
});

export const replaceUserPermissionsSchema = z.object({
    permissions: z.array(permissionAction),
}).superRefine((value, context) => {
    if (new Set(value.permissions).size !== value.permissions.length) {
        context.addIssue({ code: "custom", path: ["permissions"], message: "Permissions must be unique" });
    }
});

export const replaceUserAccessSchema = z.object({
    salonId: z.string().uuid(),
    branchIds: z.array(z.string().uuid()).default([]),
}).superRefine((value, context) => {
    if (value.branchIds.includes(value.salonId) || new Set(value.branchIds).size !== value.branchIds.length) {
        context.addIssue({ code: "custom", path: ["branchIds"], message: "Branch IDs must be unique and different from salonId" });
    }
});

export const userListQuerySchema = z.object({
    search: z.string().trim().max(120).optional(),
    role: z.string().trim().max(100).optional(),
    isActive: z.enum(["true", "false"]).optional(),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
}).strict();
