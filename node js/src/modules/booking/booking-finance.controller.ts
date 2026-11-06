import { NextFunction, Request, Response } from "express";
import * as service from "./booking-finance.service";
import { commissionRuleSchema, financeDecisionSchema, financeListQuerySchema, financeReportQuerySchema, financeTrendQuerySchema, pendingSettlementQuerySchema, razorpayXConfigurationSchema, settlementListQuerySchema, settlementSettingsSchema, vendorFinanceLookupQuerySchema, vendorPayoutAccountSchema, walletListQuerySchema } from "./booking-finance.validation";
import { vendorWalletListQuerySchema } from "./payment-wallet.validation";

const actorId = (req: Request) => (req as any).user.userId as string;
const respond = (fn: (req: Request) => Promise<unknown>) => (req: Request, res: Response, next: NextFunction) => Promise.resolve(fn(req)).then((data) => res.json({ success: true, data })).catch(next);

const commissionSettingsResponse = (rule: any) => rule ? { ...rule, commissionValue: Number(rule.commissionValue), status: rule.isActive ? "ACTIVE" : "INACTIVE" } : null;
export const adminCommission = respond(async () => commissionSettingsResponse(await service.getCommissionRule()));
export const updateAdminCommission = respond(async (req) => commissionSettingsResponse(await service.updateCommissionRule(actorId(req), commissionRuleSchema.parse(req.body))));
export const adminTransactions = respond(async (req) => service.listFinancialTransactions(financeListQuerySchema.parse(req.query)));
export const adminTransaction = respond(async (req) => service.getFinancialTransaction(String(req.params.id)));
export const approveTransaction = respond(async (req) => {
  const body = financeDecisionSchema.parse(req.body);
  return service.decideFinancialTransaction(actorId(req), String(req.params.id), "APPROVE", body.remarks ?? body.reason);
});
export const rejectTransaction = respond(async (req) => {
  const body = financeDecisionSchema.parse(req.body);
  return service.decideFinancialTransaction(actorId(req), String(req.params.id), "REJECT", body.remarks ?? body.reason);
});
export const holdTransaction = respond(async (req) => {
  const body = financeDecisionSchema.parse(req.body);
  return service.decideFinancialTransaction(actorId(req), String(req.params.id), "HOLD", body.remarks ?? body.reason);
});
export const adminSettlements = respond(async (req) => service.listSettlements(settlementListQuerySchema.parse(req.query)));
export const adminSettlement = respond(async (req) => service.getSettlement(String(req.params.id)));
export const retrySettlement = respond(async (req) => service.retryVendorSettlement(actorId(req), String(req.params.id)));
export const processSettlement = respond(async (req) => service.processExistingSettlement(actorId(req), String(req.params.id)));
export const adminWalletEntries = respond(async (req) => service.listAdminWalletEntries(walletListQuerySchema.parse(req.query)));
export const adminFinanceReport = respond(async (req) => {
  const query = financeReportQuerySchema.parse(req.query);
  return service.bookingFinanceReport({ ...query, startDate: query.startDate ? new Date(query.startDate) : undefined, endDate: query.endDate ? new Date(query.endDate) : undefined });
});
export const adminPendingSettlement = respond(async (req) => service.pendingSettlementSummary(pendingSettlementQuerySchema.parse(req.query)));
export const adminVendorSummaries = respond(async (req) => service.listVendorFinancialSummaries(financeListQuerySchema.parse(req.query)));
export const startSettlement = respond(async (req) => service.startVendorSettlement(actorId(req), String(req.params.vendorId)));
export const settlementSettings = respond(async () => service.getSettlementSettings());
export const updateSettlementSettings = respond(async (req) => {
  await service.updateSettlementSettings(actorId(req), settlementSettingsSchema.parse(req.body));
  return service.getSettlementSettings();
});
export const razorpayXConfiguration = respond(async () => service.getRazorpayXConfiguration());
export const updateRazorpayXConfiguration = respond(async (req) => service.updateRazorpayXConfiguration(actorId(req), razorpayXConfigurationSchema.parse(req.body)));

export const vendorWallet = respond(async (req) => service.getVendorWallet(actorId(req)));
export const vendorFinanceLookups = respond(async (req) => service.listVendorFinanceLookups(
  actorId(req),
  String(req.params.type) as "salons" | "branches",
  vendorFinanceLookupQuerySchema.parse(req.query),
));
export const vendorTransactions = respond(async (req) => service.listFinancialTransactions({ ...financeListQuerySchema.parse(req.query), vendorId: actorId(req) }));
export const vendorWalletEntries = respond(async (req) => service.listVendorWalletEntries(actorId(req), vendorWalletListQuerySchema.parse(req.query)));
export const vendorWalletEntry = respond(async (req) => service.getVendorWalletEntry(actorId(req), String(req.params.id)));
export const vendorSettlements = respond(async (req) => service.listSettlements(settlementListQuerySchema.parse(req.query), actorId(req)));
export const vendorPayoutAccount = respond(async (req) => service.getVendorPayoutAccount(actorId(req)));
export const updateVendorPayoutAccount = respond(async (req) => service.updateVendorPayoutAccount(actorId(req), vendorPayoutAccountSchema.parse(req.body)));
export const adminVendorPayoutAccount = respond(async (req) => service.getVendorPayoutAccount(String(req.params.vendorId)));
export const updateAdminVendorPayoutAccount = respond(async (req) => service.updateVendorPayoutAccount(String(req.params.vendorId), vendorPayoutAccountSchema.parse(req.body)));

export const commissionDashboard = respond(async (req) => {
  const query = financeReportQuerySchema.parse(req.query);
  const report = await service.bookingFinanceReport({ ...query, startDate: query.startDate ? new Date(query.startDate) : undefined, endDate: query.endDate ? new Date(query.endDate) : undefined });
  return {
    summary: report.summary,
    today: { bookingAmount: report.today.bookingAmount, commission: report.today.commission, vendorPayable: report.today.vendorPayable, pending: report.today.pending, settled: report.today.settled },
    week: { bookingAmount: report.week.bookingAmount, commission: report.week.commission, vendorPayable: report.week.vendorPayable, pending: report.week.pending, settled: report.week.settled },
    month: { bookingAmount: report.month.bookingAmount, commission: report.month.commission, vendorPayable: report.month.vendorPayable, pending: report.month.pending, settled: report.month.settled },
    year: { bookingAmount: report.year.bookingAmount, commission: report.year.commission, vendorPayable: report.year.vendorPayable, pending: report.year.pending, settled: report.year.settled },
    settlement: {
      readyToSendToday: report.pendingSettlement.todaySettlementAmount,
      pendingApproval: report.pendingSettlement.pendingApprovalAmount,
      processing: report.pendingSettlement.processingAmount,
      settledToday: report.pendingSettlement.alreadySettledToday,
      eligibleVendorCount: report.pendingSettlement.eligibleVendorCount,
      eligibleTransactionCount: report.pendingSettlement.eligibleTransactionCount,
    },
    selectedPeriod: report.selectedPeriod,
    series: report.series,
  };
});
export const commissionSummary = respond(async (req) => {
  const query = financeReportQuerySchema.parse(req.query);
  return service.bookingFinancePeriodSummary({
    period: query.period,
    from: query.startDate ? new Date(query.startDate) : undefined,
    to: query.endDate ? new Date(query.endDate) : undefined,
  });
});
export const commissionTrends = respond(async (req) => {
  const query = financeTrendQuerySchema.parse(req.query);
  return service.bookingFinanceTrends({
    period: query.period,
    groupBy: query.groupBy,
    from: query.startDate ? new Date(query.startDate) : undefined,
    to: query.endDate ? new Date(query.endDate) : undefined,
  });
});
export const pendingSettlement = adminPendingSettlement;
export const commissionSettings = adminCommission;
export const updateCommissionSettings = updateAdminCommission;
export const settlementConfiguration = settlementSettings;
export const updateSettlementConfiguration = updateSettlementSettings;
export const vendorFinancialSummary = respond(async (req) => service.getVendorWallet(actorId(req)));
export const vendorFinancialTransaction = respond(async (req) => service.getFinancialTransaction(String(req.params.id), actorId(req)));
