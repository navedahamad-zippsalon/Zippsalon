import { z } from "zod";
import { PaymentMethod, PaymentStatus } from "@prisma/client";

export const paymentSchema = z.object({
    amount: z.number().positive("Payment amount must be greater than zero").or(z.string()),
    method: z.nativeEnum(PaymentMethod),
    status: z.nativeEnum(PaymentStatus).optional(),
    transactionId: z.string().optional(),
}).passthrough();
