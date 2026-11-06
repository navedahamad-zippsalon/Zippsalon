import { NextFunction, Request, Response } from "express";
import * as service from "./subscription.service";
import { accessControlQuerySchema, accessControlSaveSchema, accessUserTypeSchema, assignSubscriptionSchema, billingCycleSchema, cancelSubscriptionSchema, changeDummyPlanSchema, checkoutSchema, extendSubscriptionSchema, featureSchema, paymentVerificationSchema, planAccessSchema, planMenuAssignmentsSchema, planModuleAssignmentsSchema, planSchema, subscriptionQuerySchema } from "./subscription.validation";
import { sendCsv } from "../../common/utils/csv.util";
import { getEffectivePermissions, getMenus } from "../rbac/rbac.service";
import { processRazorpayXPayoutWebhook } from "../booking/booking-finance.service";

const run = (fn: (req: Request) => Promise<unknown>) => (req: Request, res: Response, next: NextFunction) => Promise.resolve(fn(req)).then((data) => res.json({ success: true, data })).catch(next);
const userId = (req: Request) => (req as any).user.userId as string;

export const plans = run(async () => service.listPlans());
export const features = run(async (req) => service.featureAccess(userId(req)));
export const myAccess = run(async (req) => {
	const actor = (req as any).user;
	const userType = accessUserTypeSchema.parse(String(req.query.userType ?? (actor.roles?.includes("STAFF") ? "STAFF" : "VENDOR")));
	const ownerId = await service.subscriptionOwnerIdForUser(userId(req), userType, actor.salonId);
	const subscription = ownerId ? await service.currentSubscription(ownerId) : null;
	const permissions = await getEffectivePermissions(userId(req), actor.salonId, userType);
	const subscriptionPermissions = ownerId ? await service.getSubscriptionPermissionActions(ownerId, userType) : [];
	const menuIds = ownerId ? await service.subscriptionMenuIds(ownerId, userType) : [];
	const menus = await getMenus(actor.roles ?? [], permissions, false, false, subscriptionPermissions, menuIds);
	return {
		userType,
		subscription: subscription ? { planId: subscription.planId, planName: subscription.plan.name, status: subscription.status } : null,
		menus,
		modules: menus.flatMap((menu: any) => menu.children ?? []),
		permissions,
		capabilities: {
			canUploadManualImage: true,
			canGenerateAIImage: permissions.includes("services.ai-image.generate"),
		},
	};
});
export const current = run(async (req) => {
	const actor = (req as any).user;
	if (actor.roles?.includes("VENDOR")) await service.ensureDefaultVendorSubscription(actor.userId);
	const subscription = await service.currentSubscription(userId(req));
	return { status: subscription?.status ?? "INACTIVE", subscription, plansAvailable: true };
});
export const checkout = run(async (req) => { const input = checkoutSchema.parse(req.body); return service.checkout(userId(req), input.planId, input.billingCycle); });
export const changeDummyPlan = run(async (req) => { const input = changeDummyPlanSchema.parse(req.body); return service.changeDummyPlan(userId(req), input.planId, input.billingCycle); });
export const verifyPayment = async (req: Request, res: Response, next: NextFunction) => {
	try {
		const data = await service.verifyPayment(userId(req), paymentVerificationSchema.parse(req.body));
		return res.json({
			success: true,
			message: "Subscription activated successfully",
			data,
		});
	} catch (err) {
		next(err);
	}
};
export const cancel = run(async (req) => service.cancel(userId(req), cancelSubscriptionSchema.parse(req.body).reason));
export const payments = run(async (req) => service.listPayments(userId(req)));
export const invoices = run(async (req) => service.listInvoices(userId(req)));
export const adminPlans = run(async () => service.listPlans(true));
export const adminGetPlan = run(async (req) => service.getPlan(String(req.params.id)));
export const adminCreatePlan = run(async (req) => service.createPlan(planSchema.parse(req.body)));
export const adminUpdatePlan = run(async (req) => service.updatePlan(String(req.params.id), planSchema.parse(req.body)));
export const adminStatus = run(async (req) => service.setPlanStatus(String(req.params.id), Boolean(req.body.isActive)));
export const adminDeletePlan = run(async (req) => service.deletePlan(String(req.params.id)));
export const adminFeatures = run(async () => service.listFeatures(true));
export const adminCreateFeature = run(async (req) => service.createFeature(featureSchema.parse(req.body), userId(req)));
export const adminUpdateFeature = run(async (req) => service.updateFeature(String(req.params.id), featureSchema.parse(req.body)));
export const adminPlanMenus = run(async (req) => service.listPlanMenus(String(req.params.planId)));
export const adminPlanModules = run(async (req) => service.listPlanModules(String(req.params.planId)));
export const adminPlanAccess = run(async (req) => service.getPlanAccess(String(req.params.planId)));
export const adminUpdatePlanAccess = run(async (req) => service.replacePlanAccess(userId(req), String(req.params.planId), planAccessSchema.parse(req.body)));
export const adminAccessControl = run(async (req) => { const query = accessControlQuerySchema.parse(req.query); return service.getAccessControl(query.planId, query.roleId, query.userType); });
export const adminUpdateAccessControl = run(async (req) => { const input = accessControlSaveSchema.parse(req.body); return service.replaceAccessControl(userId(req), input.planId, input.roleId, input.permissions, input.userType); });
export const adminUpdatePlanMenus = run(async (req) => service.replacePlanMenus(userId(req), String(req.params.planId), planMenuAssignmentsSchema.parse(req.body).menus));
export const adminUpdatePlanModules = run(async (req) => service.replacePlanModules(userId(req), String(req.params.planId), planModuleAssignmentsSchema.parse(req.body).modules));
export const adminDashboard = run(async () => service.dashboard());
export const adminSubscribers = run(async (req) => service.listSubscribers(subscriptionQuerySchema.parse(req.query)));
export const adminSubscribersExport = async (req: Request, res: Response, next: NextFunction) => { try { const result = await service.listSubscribers(subscriptionQuerySchema.parse({ ...req.query, page: 1, limit: 100 })); return sendCsv(res, `subscriptions_filtered_${new Date().toISOString().slice(0, 10)}.csv`, ['ID', 'Vendor', 'Email', 'Plan', 'Status', 'Billing Cycle', 'Amount', 'Created At'], result.items.map((item: any) => [item.id, `${item.vendor?.firstName || ''} ${item.vendor?.lastName || ''}`.trim(), item.vendor?.email, item.plan?.name, item.status, item.billingCycle, item.amount, item.createdAt])); } catch (err) { next(err); } };
export const adminSubscriber = run(async (req) => service.adminSubscription(String(req.params.id)));
export const adminAssign = run(async (req) => service.assignToSubscriber(userId(req), String(req.params.id), assignSubscriptionSchema.parse(req.body)));
export const adminCancel = run(async (req) => service.adminCancel(userId(req), String(req.params.id), cancelSubscriptionSchema.parse(req.body).reason));
export const adminExtend = run(async (req) => service.extend(userId(req), String(req.params.id), extendSubscriptionSchema.parse(req.body).expiresAt));
export const adminPayments = run(async (req) => service.adminPayments(req.query));
export const adminInvoices = run(async (req) => service.adminInvoices(req.query));
export const adminAuditLogs = run(async (req) => service.auditLogs(req.query));
export const webhook = (req: Request, res: Response, next: NextFunction) => {
	const rawBody = (req as any).rawBody ?? Buffer.from(JSON.stringify(req.body));
	const eventType = typeof req.body?.event === "string" ? req.body.event : "";
	const process = eventType.startsWith("payout.")
		? processRazorpayXPayoutWebhook(rawBody, req.header("x-razorpay-signature"), req.header("x-razorpay-event-id") ?? undefined)
		: service.processWebhook(rawBody, req.header("x-razorpay-signature"), req.header("x-razorpay-event-id") ?? undefined);
	return process.then((data) => res.json({ success: true, data })).catch(next);
};
