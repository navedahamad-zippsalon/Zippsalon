import { z } from "zod";

export const staffBankDetailsSchema = z.object({
    accountHolderName: z.string().trim().min(2, "Account holder name must be at least 2 characters").max(120).optional(),
    bankName: z.string().trim().min(2, "Bank name must be at least 2 characters").max(120).optional(),
    accountNumber: z.string().trim().regex(/^(?:[0-9]{8,20}|\*{4,}[0-9]{4})$/, "Account number must contain 8 to 20 digits").optional(),
    ifscCode: z.string().trim().toUpperCase().regex(/^[A-Z]{4}0[A-Z0-9]{6}$/, "Invalid IFSC code").optional(),
    accountType: z.preprocess(
        (val) => (typeof val === "string" && val.trim() ? val.trim().toUpperCase() : val),
        z.enum(["SAVINGS", "CURRENT", "SALARY", "OTHER"])
    ).optional(),
    branchName: z.preprocess(
        (val) => (typeof val === "string" && val.trim() === "" ? null : typeof val === "string" ? val.trim() : val),
        z.string().max(120).nullable().optional()
    ),
    upiId: z.preprocess(
        (val) => (typeof val === "string" && val.trim() === "" ? null : typeof val === "string" ? val.trim().toLowerCase() : val),
        z.string().regex(/^[a-z0-9][a-z0-9._-]{1,254}@[a-z0-9][a-z0-9.-]{1,63}$/, "Invalid UPI ID").nullable().optional()
    ),
    upiName: z.preprocess(
        (val) => (typeof val === "string" && val.trim() === "" ? null : typeof val === "string" ? val.trim() : val),
        z.string().max(120).nullable().optional()
    ),
}).passthrough();

export type StaffBankDetailsInput = z.infer<typeof staffBankDetailsSchema>;
