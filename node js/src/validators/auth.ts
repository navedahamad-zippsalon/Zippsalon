import { z } from "zod";

export const registerSchema = z.object({
    firstName: z.string().min(2, "First name must be at least 2 characters"),
    lastName: z.string().optional(),
    email: z.string().email("Invalid email format").transform((value) => value.trim().toLowerCase()),
    password: z.string().min(6, "Password must be at least 6 characters"),
    confirmPassword: z.string().optional(),
    phone: z.string().min(5, "Phone number is required"),
    countryCode: z.string().min(1, "Country code is required"),
    source: z.enum(["WEBSITE", "ADMIN"]).optional(),
    salonName: z.string().optional(),
    salonType: z.string().trim().min(1).max(100).optional(),
    category: z.string().trim().min(1).max(100).optional(),
    description: z.string().trim().max(2000).optional(),
    salonImage: z.string().trim().min(1).max(500).optional(),
    address: z.string().trim().min(1).max(255).optional(),
    addressLine1: z.string().trim().min(1).max(255).optional(),
    addressLine2: z.string().trim().max(255).optional(),
    city: z.string().trim().min(1).max(120).optional(),
    state: z.string().trim().min(1).max(120).optional(),
    country: z.string().trim().min(1).max(120).optional(),
    postalCode: z.string().trim().min(1).max(32).optional(),
}).superRefine((data, context) => {
    if (data.confirmPassword !== undefined && data.confirmPassword !== data.password) {
        context.addIssue({ code: "custom", path: ["confirmPassword"], message: "Passwords do not match" });
    }
    const addressFields = [data.addressLine1 ?? data.address, data.city, data.state, data.country, data.postalCode];
    if (addressFields.some(Boolean) && addressFields.some((value) => !value)) {
        context.addIssue({ code: "custom", path: ["addressLine1"], message: "Complete address details are required" });
    }
});

export const loginSchema = z.object({
    email: z.string().email("Invalid email format"),
    password: z.string().min(1, "Password is required"),
});

export const forgotPasswordSchema = z.object({
    email: z.string().email("Invalid email format"),
});

export const resetPasswordSchema = z.object({
    token: z.string().min(1, "Token is required"),
    password: z.string().min(6, "Password must be at least 6 characters"),
});

export const changePasswordSchema = z.object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: z.string().min(6, "New password must be at least 6 characters"),
});
