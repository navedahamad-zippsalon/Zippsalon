import { NextFunction, Request, Response } from "express";
import * as finance from "./booking-finance.service";
import * as paymentWallet from "./payment-wallet.service";
import * as refundService from "./payment-refund.service";
import { resolveFinanceDateRange } from "./booking-finance.service";
import { paymentWalletListQuerySchema, paymentWalletLookupQuerySchema } from "./payment-wallet.validation";

const respond = (handler: (req: Request) => Promise<unknown>) =>
  (req: Request, res: Response, next: NextFunction) =>
    Promise.resolve(handler(req))
      .then((data) => res.json({ success: true, data }))
      .catch(next);

const query = (req: Request) => {
  const parsed = paymentWalletListQuerySchema.parse(req.query);
  if (!parsed.period || parsed.startDate || parsed.endDate || parsed.from || parsed.to) return parsed;
  if (parsed.period === "custom") throw { status: 400, code: "INVALID_FINANCE_DATE_RANGE", message: "Custom period requires startDate and endDate" };
  const range = resolveFinanceDateRange(parsed.period);
  return { ...parsed, startDate: range.start.toISOString(), endDate: new Date(range.end.getTime() - 1).toISOString() };
};

export const overview = respond(async (req) => paymentWallet.paymentOverview(query(req)));
export const payments = respond(async (req) => paymentWallet.listPayments(query(req)));
export const paymentTransactions = payments;
export const paymentDetails = respond(async (req) => paymentWallet.getPayment(String(req.params.reference)));
export const refundsList = respond(async (req) => refundService.listRefunds(query(req)));
export const refunds = refundsList;
export const refundDetails = respond(async (req) => refundService.getRefund(String(req.params.reference)));
export const refundSummary = respond(async (req) => refundService.refundSummary(query(req)));
export const createRefund = (req: Request, res: Response, next: NextFunction) => {
  const userId = (req as any).user.userId as string;
  return refundService.createRazorpayRefund({ ...req.body, actorId: userId })
    .then((data) => res.status(201).json({ success: true, data }))
    .catch(next);
};
export const customerWallets = respond(async (req) => refundService.listCustomerWallet(query(req)));
export const customerWalletTransactions = respond(async (req) => paymentWallet.listCustomerWalletTransactions(query(req)));
export const customerWalletDetails = respond(async (req) => refundService.getCustomerWallet(String(req.params.customerId)));
export const customerWalletTransactionDetails = respond(async (req) => refundService.getCustomerWalletTransaction(String(req.params.customerId), String(req.params.transactionId)));
export const customerWalletTransactionList = respond(async (req) => paymentWallet.listCustomerWalletTransactions({ ...query(req), customerId: String(req.params.customerId) }));
export const walletOverview = respond(async (req) => paymentWallet.listAdminWalletOverview(query(req)));
export const walletTransactions = respond(async (req) => paymentWallet.listVendorWalletLedger(query(req)));
export const commissionTransactions = respond(async (req) => paymentWallet.listCommissionTransactions(query(req)));
export const pendingSettlements = respond(async (req) => {
  const filters = query(req);
  return paymentWallet.listCommissionTransactions({
    ...filters,
    approvalStatus: "APPROVED",
    settlementStatus: "ELIGIBLE",
  });
});
export const settlementHistory = respond(async (req) => paymentWallet.listSettlementHistory(query(req)));
export const settlementSettings = respond(async () => finance.getSettlementSettings());
export const updateSettlementSettings = respond(async (req) => {
  const userId = (req as any).user.userId as string;
  const input = req.body;
  await finance.updateSettlementSettings(userId, input);
  return finance.getSettlementSettings();
});
export const commissionSettings = respond(async () => finance.getCommissionRule());
export const updateCommissionSettings = respond(async (req) => {
  const userId = (req as any).user.userId as string;
  return finance.updateCommissionRule(userId, req.body);
});
export const financialReport = respond(async (req) => paymentWallet.paymentFinancialReport(query(req)));
export const lookup = respond(async (req) => {
  const type = String(req.params.type) as "salons" | "branches" | "vendors" | "customers";
  const filters = paymentWalletLookupQuerySchema.parse(req.query);
  return paymentWallet.listLookups(type, filters);
});
