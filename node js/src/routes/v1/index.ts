import { Router } from "express";
import { prisma } from "../../infrastructure/database/prisma";
import authRoutes from "../../modules/auth/auth.routes";
import { authenticate, authorizeRoles } from "../../common/middleware/auth.middleware";
import salonRoutes, { branchDirectoryRouter } from "../../modules/salon/salon.routes";
import adminRoutes from "../../modules/admin/admin.routes";
import staffRoutes from "../../modules/staff/staff.routes";
import uploadRoutes from "../../modules/upload/upload.routes";
import serviceRoutes from "../../modules/service/service.routes";
import customerRoutes from "../../modules/customer/customer.routes";
import bookingRoutes from "../../modules/booking/booking.routes";
import { bookingCommissionAdminRouter, bookingFinanceAdminRouter, bookingFinanceVendorRouter, bookingVendorWalletRouter } from "../../modules/booking/booking-finance.routes";
import paymentWalletAdminRouter from "../../modules/booking/payment-wallet.routes";
import paymentWalletResourceRouter from "../../modules/booking/payment-wallet-resource.routes";
import generativeRoutes from "../../modules/generative/generative.routes";
import rbacRoutes, { accessControlRouter } from "../../modules/rbac/rbac.routes";
import userRoutes from "../../modules/user/user.routes";
import leadRoutes from "../../modules/lead/lead.routes";
import masterRoutes from "../../modules/master/master.routes";
import dashboardRoutes from "../../modules/dashboard/dashboard.routes";
import reportsRoutes from "../../modules/reports/reports.routes";
import gstRoutes from "../../modules/gst/gst.routes";
import inventoryRoutes from "../../modules/inventory/inventory.routes";
import feedRoutes from "../../modules/feed/feed.routes";
import vendorRoutes, { vendorDirectoryRouter } from "../../modules/vendor/vendor.routes";
import whatsappRoutes, { whatsappAdminRoutes } from "../../modules/whatsapp/whatsapp.routes";
import { subscriptionRoutes, subscriptionAdminRoutes, subscriptionPlanEntitlementRoutes } from "../../modules/subscription/subscription.routes";
import paymentGatewayRoutes, { vendorRazorpayRouter } from "../../modules/payment-gateway/razorpay.routes";
import customerAuthRoutes from "../../modules/customer-auth/customer-auth.routes";
import customerApiRoutes from "../../modules/customer/customer-api.routes";
import { audienceAdvertisements } from "../../modules/customer/customer-api.controller";
import deliveryConfigRoutes from "../../modules/delivery/delivery-config.routes";
import communicationConfigRoutes from "../../modules/config/communication-config.routes";
import { getUserPermissions } from "../../modules/rbac/rbac.service";
import { currentSubscription, ensureDefaultVendorSubscription } from "../../modules/subscription/subscription.service";
import * as subscriptionController from "../../modules/subscription/subscription.controller";
import trackingRoutes from "../../modules/tracking/tracking.routes";

const router = Router();

router.use("/auth", authRoutes);
router.use("/tracking", trackingRoutes);
router.use("/customer/auth", customerAuthRoutes);
router.use("/customer", customerApiRoutes);
router.use("/users", userRoutes);
router.use("/leads", leadRoutes);
router.use("/master", masterRoutes);

router.get("/advertisements", authenticate, authorizeRoles("CUSTOMER", "VENDOR"), audienceAdvertisements);

router.get("/me", authenticate, async (req, res) => {
    try {
        const userId = (req as any).user?.userId;
        if (!userId) {
            return res.status(200).json({ success: true, message: "You are authenticated", data: (req as any).user });
        }

        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                phone: true,
                countryCode: true,
                isActive: true,
                gender: true,
                dob: true,
                createdAt: true,
                updatedAt: true,
                roles: {
                    select: {
                        role: { select: { id: true, name: true } }
                    }
                },
                staffIn: {
                    select: {
                        id: true,
                        salonId: true,
                        role: true,
                        isActive: true,
                        staffRoleId: true,
                        salon: {
                            select: {
                                id: true,
                                name: true,
                                parentId: true,
                                timings: true,
                                address: true
                            }
                        },
                        staffRole: {
                            select: {
                                id: true,
                                name: true,
                                description: true
                            }
                        }
                    }
                },
                ownedSalons: {
                    where: { isActive: true },
                    select: { id: true, name: true, parentId: true }
                }
            }
        });

        if (!user) {
            return res.status(200).json({ success: true, message: "You are authenticated", data: (req as any).user });
        }

        const roleNames = user.roles.map(r => r.role.name);
        const salonId = roleNames.includes("VENDOR")
            ? user.ownedSalons[0]?.id
            : user.staffIn.find((staff) => staff.isActive)?.salonId;
        if (roleNames.includes("VENDOR")) await ensureDefaultVendorSubscription(user.id, salonId);
        const [permissions, subscription] = await Promise.all([
            getUserPermissions(user.id, salonId),
            roleNames.includes("VENDOR") ? currentSubscription(user.id) : Promise.resolve(null),
        ]);
        return res.status(200).json({
            success: true,
            message: "You are authenticated",
            data: {
                ...user,
                userId: user.id,
                roles: roleNames,
                role: roleNames[0] ?? null,
                permissions,
                vendorId: roleNames.includes("VENDOR") ? user.id : null,
                salonId: salonId ?? null,
                onboardingRequired: roleNames.includes("VENDOR") && !salonId,
                subscription,
            }
        });
    } catch (error) {
        // Never return a partial successful initialization payload.
        return res.status(500).json({ success: false, message: "Unable to load current user", error: (error as Error).message });
    }
});

router.use("/salons", salonRoutes);
router.use("/branches", branchDirectoryRouter);
router.use("/admin", adminRoutes);
router.use("/staff", staffRoutes);
router.use("/upload", uploadRoutes);
router.use("/services", serviceRoutes);
router.use("/customers", customerRoutes);
router.use("/bookings", bookingRoutes);
router.use("/admin/booking-finance", bookingFinanceAdminRouter);
router.use("/admin/payment-wallet", paymentWalletAdminRouter);
router.use(paymentWalletResourceRouter);
router.use("/booking/commission", bookingCommissionAdminRouter);
router.use("/vendor/finance", bookingFinanceVendorRouter);
router.use("/vendor/wallet", bookingVendorWalletRouter);
router.use("/gst", gstRoutes);
router.use("/inventory", inventoryRoutes);
router.use("/feed", feedRoutes);
router.use("/vendor", vendorRoutes);
router.use("/vendors", vendorDirectoryRouter);
router.use("/vendor", vendorRazorpayRouter);
router.use("/generate", generativeRoutes);
router.use("/rbac", rbacRoutes);
router.use("/access-control", accessControlRouter);
router.use("/dashboard", dashboardRoutes);
router.use("/reports", reportsRoutes);
router.use("/whatsapp", whatsappRoutes);
router.use("/admin/whatsapp", whatsappAdminRoutes);
router.use("/subscriptions", subscriptionRoutes);
router.use("/admin/subscriptions", subscriptionAdminRoutes);
router.use("/admin/subscription-plans", subscriptionPlanEntitlementRoutes);
router.get("/admin/access-control", authenticate, authorizeRoles("ADMIN", "SUPER_ADMIN"), subscriptionController.adminAccessControl);
router.put("/admin/access-control", authenticate, authorizeRoles("ADMIN", "SUPER_ADMIN"), subscriptionController.adminUpdateAccessControl);
router.get("/subscription-plans", authenticate, authorizeRoles("ADMIN", "SUPER_ADMIN"), subscriptionController.adminPlans);
router.use("/admin/payment-gateway", paymentGatewayRoutes);
router.use("/admin/settings", deliveryConfigRoutes);
router.use("/settings", communicationConfigRoutes);
// Backwards-compatible alias; it uses the same Settings permission model and services.
router.use("/config", communicationConfigRoutes);

export default router;
