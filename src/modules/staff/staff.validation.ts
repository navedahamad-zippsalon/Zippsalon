import { z } from "zod";
import { AttendanceStatus } from "@prisma/client";

export const addStaffSchema = z.object({
    salonId: z.string().uuid(),
    role: z.string().optional(),
    isActive: z.boolean().optional(),
    staffRoleId: z.string().uuid().optional(),
    user: z.object({
        id: z.string().uuid().optional(),
        firstName: z.string().min(2),
        lastName: z.string().optional(),
        email: z.string().email(),
        phone: z.string().min(10),
        countryCode: z.string().optional(),
        password: z.string().min(6).optional(),
    })
});

export const updateStaffSchema = z.object({
    role: z.string().optional(),
    isActive: z.boolean().optional(),
    staffRoleId: z.string().uuid().optional(),
    salonId: z.string().uuid().optional(),
    branchId: z.string().uuid().nullable().optional(),
    user: z.object({
        firstName: z.string().min(2).optional(),
        lastName: z.string().optional(),
        email: z.string().email().optional(),
        phone: z.string().min(5).optional(),
        countryCode: z.string().min(1).optional(),
    }).optional(),
});

export const markAttendanceSchema = z.object({
    staffId: z.string().uuid(),
    date: z.string(), // ISO date string
    status: z.nativeEnum(AttendanceStatus),
});
