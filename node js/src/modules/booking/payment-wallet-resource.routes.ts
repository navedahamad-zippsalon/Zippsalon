import { Router } from "express";
import { z } from "zod";
import { authenticate, authorizeRoles } from "../../common/middleware/auth.middleware";
import { requirePermission } from "../../common/middleware/permission.middleware";
import { validate } from "../../common/middleware/validate.middleware";
import * as controller from "./payment-wallet.controller";
import { paymentWalletListQuerySchema, paymentRefundCreateSchema } from "./payment-wallet.validation";

const admin = Router();
admin.use("/payments", authenticate, authorizeRoles("ADMIN", "SUPER_ADMIN"));
admin.use("/refunds", authenticate, authorizeRoles("ADMIN", "SUPER_ADMIN"));
admin.use("/customer-wallet", authenticate, authorizeRoles("ADMIN", "SUPER_ADMIN"));

admin.get("/payments/summary", requirePermission("payment-wallet.overview.view"), validate({ query: paymentWalletListQuerySchema }), controller.overview);
admin.get("/payments/transactions", requirePermission("payment-wallet.transactions.view"), validate({ query: paymentWalletListQuerySchema }), controller.paymentTransactions);
admin.get("/payments/transactions/:reference", requirePermission("payment-wallet.transactions.view"), validate({ params: z.object({ reference: z.string().trim().min(1).max(200) }) }), controller.paymentDetails);
admin.get("/payments", requirePermission("payment-wallet.payments.view"), validate({ query: paymentWalletListQuerySchema }), controller.payments);
admin.get("/payments/:reference", requirePermission("payment-wallet.payments.view"), validate({ params: z.object({ reference: z.string().trim().min(1).max(200) }) }), controller.paymentDetails);

admin.get("/refunds/summary", requirePermission("payment-wallet.refunds.view"), validate({ query: paymentWalletListQuerySchema }), controller.refundSummary);
admin.get("/refunds", requirePermission("payment-wallet.refunds.view"), validate({ query: paymentWalletListQuerySchema }), controller.refundsList);
admin.get("/refunds/:reference", requirePermission("payment-wallet.refunds.view"), validate({ params: z.object({ reference: z.string().trim().min(1).max(200) }) }), controller.refundDetails);
admin.post("/refunds", requirePermission("payment-wallet.refunds.create"), validate({ body: paymentRefundCreateSchema }), controller.createRefund);

admin.get("/customer-wallet/transactions", requirePermission("payment-wallet.customer-wallet.view"), validate({ query: paymentWalletListQuerySchema }), controller.customerWalletTransactions);
admin.get("/customer-wallet/:customerId/transactions/:transactionId", requirePermission("payment-wallet.customer-wallet.view"), validate({ params: z.object({ customerId: z.string().uuid(), transactionId: z.string().uuid() }) }), controller.customerWalletTransactionDetails);
admin.get("/customer-wallet/:customerId/transactions", requirePermission("payment-wallet.customer-wallet.view"), validate({ params: z.object({ customerId: z.string().uuid() }), query: paymentWalletListQuerySchema }), controller.customerWalletTransactionList);
admin.get("/customer-wallet/:customerId", requirePermission("payment-wallet.customer-wallet.view"), validate({ params: z.object({ customerId: z.string().uuid() }) }), controller.customerWalletDetails);
admin.get("/customer-wallet", requirePermission("payment-wallet.customer-wallet.view"), validate({ query: paymentWalletListQuerySchema }), controller.customerWallets);

export default admin;
