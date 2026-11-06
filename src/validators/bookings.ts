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
            quantity: z.number().int().positive().optional(),
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
    totalAmount: z.number().nonnegative().or(z.string().regex(/^\d+(\.\d+)?$/)).optional(),
    discount: z.number().min(0).max(100).or(z.string().regex(/^\d+(\.\d+)?$/)).optional(),
    items: z.array(z.object({
        serviceId: z.string().uuid().optional(),
        comboId: z.string().uuid().optional(),
        name: z.string().trim().min(1),
        price: z.number().nonnegative().or(z.string().regex(/^\d+(\.\d+)?$/)),
        quantity: z.number().int().positive().optional(),
    })).min(1).optional(),
    vendorId: z.string().uuid().optional(),
    salonId: z.string().uuid().optional(),
    branchId: z.string().uuid().nullable().optional(),
}).passthrough();

export const addPaymentSchema = z.object({
    amount: z.number().positive("Payment amount must be greater than zero").or(z.string()),
    method: z.nativeEnum(PaymentMethod),
    transactionId: z.string().optional(),
}).passthrough();

const bookingFilterParams = {
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(10),
    search: z.string().trim().max(160).optional(),
    vendorId: z.string().optional(),
    salonId: z.string().optional(),
    branchId: z.string().optional(),
    staffId: z.string().optional(),
    serviceId: z.string().optional(),
    customerId: z.string().optional(),
    status: z.string().trim().max(40).optional(),
    paymentStatus: z.string().trim().max(40).optional(),
    bookingSource: z.string().trim().max(20).optional(),
    source: z.string().trim().max(20).optional(),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    dateFrom: z.string().optional(),
    dateTo: z.string().optional(),
    createdFrom: z.string().optional(),
    createdTo: z.string().optional(),
    updatedFrom: z.string().optional(),
    updatedTo: z.string().optional(),
    sortBy: z.string().trim().max(40).optional(),
    sortOrder: z.enum(["asc", "desc"]).optional(),
};

export const bookingListQuerySchema = z.object(bookingFilterParams).passthrough();
export const bookingFilterOptionsQuerySchema = z.object({
    ...bookingFilterParams,
    limit: z.coerce.number().int().min(1).max(100).default(100),
}).passthrough();
