import { z } from "zod";
import { AttendanceStatus } from "@prisma/client";

export const addStaffSchema = z.object({
    salonId: z.string().uuid(),
    role: z.string().optional(),
    isActive: z.boolean().optional(),
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
});

export const markAttendanceSchema = z.object({
    staffId: z.string().uuid(),
    date: z.string(), // ISO date string
    status: z.nativeEnum(AttendanceStatus),
});
