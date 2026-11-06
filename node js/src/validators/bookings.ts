import { z } from "zod";
import { BookingStatus, PaymentMethod } from "@prisma/client";

export const createBookingSchema = z.object({
    vendorId: z.string().uuid().optional(),
    salonId: z.string().uuid().optional(),
    branchId: z.string().uuid().nullable().optional(),
    customerId: z.string().uuid().optional(),
    customerData: z.object({
        firstName: z.string().min(1, "First name is required"),
        lastName: z.string().optional(),
        email: z.string().email().optional().or(z.literal("")),
        phone: z.string().min(5, "Phone is required"),
        countryCode: z.string().optional(),
    }).optional(),
    staffId: z.string().min(1, "Staff ID is required"),
    bookingDate: z.string().min(1, "Booking date is required"),
    notes: z.string().optional(),
    couponCode: z.string().trim().min(1).optional(),
    discount: z.number().min(0).max(100).optional(),
    taxType: z.enum(["CGST_SGST", "IGST"]).optional(),
    items: z.array(
        z.object({
            serviceId: z.string().uuid().optional(),
            comboId: z.string().uuid().optional(),
            name: z.string().min(1, "Item name is required"),
            price: z.number().nonnegative("Price must be non-negative").or(z.string()),
        })
    ).min(1, "At least one service is required"),
    payment: z.object({
        amount: z.number().nonnegative().or(z.string()),
        method: z.nativeEnum(PaymentMethod),
        transactionId: z.string().optional(),
    }).optional(),
}).passthrough();

export const updateBookingSchema = z.object({
    status: z.nativeEnum(BookingStatus).optional(),
    bookingDate: z.string().optional(),
    staffId: z.string().uuid().optional(),
    notes: z.string().optional(),
    vendorId: z.string().uuid().optional(),
    salonId: z.string().uuid().optional(),
    branchId: z.string().uuid().nullable().optional(),
}).passthrough();

export const addPaymentSchema = z.object({
    amount: z.number().positive("Payment amount must be greater than zero").or(z.string()),
    method: z.nativeEnum(PaymentMethod),
    transactionId: z.string().optional(),
}).passthrough();
