import "dotenv/config";
import bcrypt from "bcrypt";
import { PrismaClient } from "@prisma/client";
import { whatsappTemplateDefinitions } from "./whatsapp-templates";
import { encrypt } from "../src/modules/whatsapp/utils/encryption";
import { SUBSCRIPTION_FEATURE_DEFINITIONS } from "../src/modules/subscription/subscription-features";
import { cacheInvalidate } from "../src/infrastructure/redis/cache";
const prisma = new PrismaClient();

const APP_CONSTANTS = {
    ROLES: {
        ADMIN: "ADMIN",
        CUSTOMER: "CUSTOMER",
        VENDOR: "VENDOR",
        STAFF: "STAFF",
    },
    DEFAULTS: {
        ADMIN_EMAIL: "admin@zippsalon.com",
        ADMIN_PASSWORD: "Admin@123",
        ADMIN_PHONE: "9999999999",
        COUNTRY_CODE: "+91",
    },
};

async function main() {
    if (process.env.NODE_ENV === "production") {
        console.error("CRITICAL: Seed script execution aborted! Cannot seed database in production environment.");
        process.exit(1);
    }

    console.log("Cleaning database...");
    // Order matters due to foreign keys
    await prisma.lead.deleteMany();
    await prisma.whatsAppAuditLog.deleteMany();
    await prisma.whatsAppWebhookEvent.deleteMany();
    await prisma.whatsAppUsageLedger.deleteMany();
    await prisma.whatsAppCampaignBilling.deleteMany();
    await prisma.whatsAppMessage.deleteMany();
    await prisma.whatsAppCampaignRecipient.deleteMany();
    await prisma.whatsAppCampaign.deleteMany();
    await prisma.whatsAppContact.deleteMany();
    await prisma.whatsAppConnection.deleteMany();
    await prisma.whatsAppTemplate.deleteMany();
    await prisma.whatsAppPricing.deleteMany();
    await prisma.whatsAppIdempotencyKey.deleteMany();
    await prisma.whatsAppAutomationSettings.deleteMany();
    await prisma.whatsAppConfiguration.deleteMany();
    await prisma.payment.deleteMany();
    await prisma.bookingService.deleteMany();
    await prisma.booking.deleteMany();
    await prisma.attendance.deleteMany();
    await prisma.salonStaff.deleteMany();
    await prisma.comboItem.deleteMany();
    await prisma.combo.deleteMany();
    await prisma.serviceImage.deleteMany();
    await prisma.service.deleteMany();
    await prisma.serviceCategory.deleteMany();
    await prisma.salonContact.deleteMany();
    await prisma.address.deleteMany();
    await prisma.salonImage.deleteMany();
    await prisma.salonCustomer.deleteMany();
    await prisma.gSTConfiguration.deleteMany();
    await prisma.salon.deleteMany();
    await prisma.userRole.deleteMany();
    await prisma.rolePermission.deleteMany();
    await prisma.staffRolePermission.deleteMany();
    await prisma.staffRole.deleteMany();
    await prisma.menuPermission.deleteMany();
    await prisma.menu.deleteMany();
    await prisma.permission.deleteMany();
    await prisma.role.deleteMany();
    await prisma.user.deleteMany();

    console.log("Seeding Roles...");
    const roles = Object.values(APP_CONSTANTS.ROLES);
    for (const role of roles) {
        await prisma.role.create({ data: { name: role } });
    }

    console.log("Seeding Admin...");
    const hashedPassword = await bcrypt.hash(APP_CONSTANTS.DEFAULTS.ADMIN_PASSWORD, 10);
    const admin = await prisma.user.create({
        data: {
            firstName: "Super",
            lastName: "Admin",
            email: APP_CONSTANTS.DEFAULTS.ADMIN_EMAIL,
            phone: APP_CONSTANTS.DEFAULTS.ADMIN_PHONE,
            countryCode: APP_CONSTANTS.DEFAULTS.COUNTRY_CODE,
            password: hashedPassword,
        },
    });

    const adminRole = await prisma.role.findUnique({ where: { name: APP_CONSTANTS.ROLES.ADMIN } });
    if (adminRole) {
        await prisma.userRole.create({
            data: { userId: admin.id, roleId: adminRole.id },
        });
    }

    await prisma.whatsAppTemplate.createMany({
        data: whatsappTemplateDefinitions.map(([name, body, category]) => ({
            name,
            body,
            category: category as "MARKETING" | "UTILITY" | "AUTHENTICATION" | "SERVICE",
            language: "en_US",
            status: "DRAFT" as const,
            providerStatus: "NOT_SUBMITTED",
            createdBy: admin.id,
        })),
    });

    console.log("Seeding Permissions...");
    const permissions = [
        { action: "dashboard.view", description: "View Dashboard" },
        { action: "tracking.view", description: "Access Admin tracking" },
        { action: "tracking.overview", description: "View tracking overview" },
        { action: "tracking.activity", description: "View user activity" },
        { action: "tracking.sessions", description: "View login sessions" },
        { action: "tracking.menu_usage", description: "View CRM menu usage" },
        { action: "tracking.customer_app", description: "View customer app usage" },
        { action: "tracking.vendor", description: "View vendor tracking" },
        { action: "tracking.staff", description: "View staff tracking" },
        { action: "tracking.customer", description: "View customer tracking" },
        { action: "tracking.location", description: "View approximate location and device history" },
        { action: "tracking.analytics", description: "View tracking analytics" },
        { action: "tracking.export", description: "Export tracking data" },
        { action: "feed.view", description: "View Feed" },
        { action: "feed.create", description: "Create Feed content" },
        { action: "feed.edit", description: "Edit Feed content" },
        { action: "feed.delete", description: "Delete Feed content" },
        { action: "feed.navbar", description: "Show Feed in navigation" },
        { action: "feed.posts.view", description: "View feed posts" },
        { action: "feed.posts.create", description: "Create feed posts" },
        { action: "feed.posts.update_own", description: "Update own feed posts" },
        { action: "feed.posts.delete_own", description: "Delete own feed posts" },
        { action: "feed.stories.view", description: "View feed stories" },
        { action: "feed.stories.create", description: "Create feed stories" },
        { action: "feed.stories.update_own", description: "Update own feed stories" },
        { action: "feed.stories.delete_own", description: "Delete own feed stories" },
        { action: "feed.media.upload", description: "Upload feed media" },
        { action: "whatsapp.view", description: "View WhatsApp" },
        { action: "whatsapp.create", description: "Create WhatsApp records" },
        { action: "whatsapp.edit", description: "Edit WhatsApp records" },
        { action: "whatsapp.delete", description: "Delete WhatsApp records" },
        { action: "whatsapp.navbar", description: "Show WhatsApp in navigation" },
        { action: "inventory.view", description: "View Inventory" },
        { action: "inventory.create", description: "Create Inventory records" },
        { action: "inventory.edit", description: "Edit Inventory records" },
        { action: "inventory.delete", description: "Delete Inventory records" },
        { action: "inventory.navbar", description: "Show Inventory in navigation" },
        { action: "salons.view", description: "View Salons" },
        { action: "salons.create", description: "Create Salons" },
        { action: "salons.edit", description: "Edit Salons" },
        { action: "salons.delete", description: "Delete Salons" },
        { action: "branch.view", description: "View Branches" },
        { action: "branch.create", description: "Create Branches" },
        { action: "branch.edit", description: "Edit Branches" },
        { action: "branch.delete", description: "Delete Branches" },
        { action: "staff.view", description: "View Staff" },
        { action: "staff.create", description: "Create Staff" },
        { action: "staff.edit", description: "Edit Staff" },
        { action: "staff.delete", description: "Delete Staff" },
        { action: "users.view", description: "View Users" },
        { action: "users.create", description: "Create Users" },
        { action: "users.update", description: "Update Users" },
        { action: "users.delete", description: "Deactivate Users" },
        { action: "attendance.view", description: "View Attendance" },
        { action: "attendance.create", description: "Create Attendance" },
        { action: "attendance.edit", description: "Edit Attendance" },
        { action: "attendance.delete", description: "Delete Attendance" },
        { action: "services.view", description: "View Services" },
        { action: "services.create", description: "Create Services" },
        { action: "services.edit", description: "Edit Services" },
        { action: "services.delete", description: "Delete Services" },
        { action: "services.ai-image.generate", description: "Generate service images with AI" },
        { action: "advertisement.view", description: "View advertisements" },
        { action: "advertisement.create", description: "Create advertisements" },
        { action: "advertisement.update", description: "Update advertisements" },
        { action: "advertisement.delete", description: "Delete advertisements" },
        { action: "advertisement.status", description: "Activate or deactivate advertisements" },
        { action: "advertisement.reorder", description: "Reorder advertisements" },
        { action: "coupons.view", description: "View Coupons" },
        { action: "coupons.create", description: "Create Coupons" },
        { action: "coupons.update", description: "Update Coupons" },
        { action: "coupons.delete", description: "Archive Coupons" },
        { action: "coupons.status", description: "Change Coupon Status" },
        { action: "coupons.manage", description: "Manage Coupons" },
        { action: "categories.view", description: "View Categories" },
        { action: "categories.create", description: "Create Categories" },
        { action: "categories.edit", description: "Edit Categories" },
        { action: "categories.delete", description: "Delete Categories" },
        { action: "customers.view", description: "View Customers" },
        { action: "customers.create", description: "Create Customers" },
        { action: "customers.edit", description: "Edit Customers" },
        { action: "customers.delete", description: "Delete Customers" },
        { action: "bookings.view", description: "View Bookings" },
        { action: "bookings.create", description: "Create Bookings" },
        { action: "bookings.edit", description: "Edit Bookings" },
        { action: "bookings.delete", description: "Delete Bookings" },
        { action: "booking-finance.view", description: "View booking financial transactions and settlements" },
        { action: "payment-wallet.overview.view", description: "View payment and wallet overview" },
        { action: "payment-wallet.payments.view", description: "View booking payments" },
        { action: "payment-wallet.payments.create", description: "Create booking payments" },
        { action: "payment-wallet.payments.update", description: "Update booking payments" },
        { action: "payment-wallet.transactions.view", description: "View payment transaction ledger" },
        { action: "payment-wallet.refunds.view", description: "View payment refunds" },
        { action: "payment-wallet.refunds.create", description: "Create payment refunds" },
        { action: "payment-wallet.refunds.update", description: "Update payment refunds" },
        { action: "payment-wallet.customer-wallet.view", description: "View customer wallets" },
        { action: "payment-wallet.customer-wallet.create", description: "Create customer wallet transactions" },
        { action: "payment-wallet.customer-wallet.update", description: "Update customer wallet transactions" },
        { action: "booking-finance.configure", description: "Configure commissions and settlement settings" },
        { action: "booking-finance.update", description: "Update booking commission and settlement settings" },
        { action: "booking-finance.approve", description: "Approve, reject, or hold booking financial transactions" },
        { action: "booking-finance.settle", description: "Initiate vendor settlements" },
        { action: "booking-finance.wallet.view", description: "View own vendor wallet and transaction history" },
        { action: "booking-finance.payout-account.manage", description: "Manage own vendor payout account" },
        { action: "leads.view", description: "View Leads" },
        { action: "leads.create", description: "Create Leads" },
        { action: "leads.edit", description: "Edit Leads" },
        { action: "leads.delete", description: "Delete Leads" },
        { action: "access-control.view", description: "View Access Control" },
        { action: "access-control.create", description: "Create Access Control" },
        { action: "access-control.edit", description: "Edit Access Control" },
        { action: "access-control.delete", description: "Delete Access Control" },
        { action: "settings.view", description: "View Settings" },
        { action: "settings.create", description: "Create Settings" },
        { action: "settings.edit", description: "Edit Settings" },
        { action: "settings.delete", description: "Delete Settings" },
        { action: "communication.smtp.view", description: "View communication SMTP configuration" },
        { action: "communication.smtp.manage", description: "Manage communication SMTP configuration" },
        { action: "communication.smtp.test", description: "Test communication SMTP configuration" },
        { action: "communication.whatsapp.view", description: "View communication WhatsApp configuration" },
        { action: "communication.whatsapp.manage", description: "Manage communication WhatsApp configuration" },
        { action: "communication.whatsapp.test", description: "Test communication WhatsApp configuration" },
        { action: "settings.smtp.view", description: "View SMTP configuration" },
        { action: "settings.smtp.create", description: "Create SMTP configuration" },
        { action: "settings.smtp.update", description: "Update SMTP configuration" },
        { action: "settings.smtp.delete", description: "Delete SMTP configuration" },
        { action: "settings.smtp.test", description: "Test SMTP configuration" },
        { action: "settings.whatsapp.view", description: "View platform WhatsApp configuration" },
        { action: "settings.whatsapp.create", description: "Create platform WhatsApp configuration" },
        { action: "settings.whatsapp.update", description: "Update platform WhatsApp configuration" },
        { action: "settings.whatsapp.delete", description: "Delete platform WhatsApp configuration" },
        { action: "settings.whatsapp.test", description: "Test platform WhatsApp configuration" },
        { action: "payment-gateway.view", description: "View payment gateway configuration" },
        { action: "payment-gateway.manage", description: "Manage payment gateway configuration" },
        { action: "payment-gateway.navbar", description: "Show Payment Integration in navigation" },
        { action: "subscriptions.view", description: "View subscription management" },
        { action: "subscriptions.manage", description: "Manage subscription plans and subscribers" },
        { action: "staff_bank_details.view", description: "View own staff bank details" },
        { action: "staff_bank_details.create", description: "Create own staff bank details" },
        { action: "staff_bank_details.update", description: "Update own staff bank details" },
        { action: "staff_bank_details.delete", description: "Delete own staff bank details" },
        { action: "staff_bank_details.qr", description: "Generate own staff UPI QR code" },
        { action: "reports.view", description: "View Reports & Analytics" },
        { action: "reports.overview", description: "View Overview" },
        { action: "reports.revenue", description: "View Revenue" },
        { action: "reports.customers", description: "View Customers" },
        { action: "reports.services", description: "View Services" },
        { action: "reports.staff", description: "View Staff Performance" },
        { action: "reports.bookings", description: "View Bookings" },
        { action: "reports.reviews", description: "View Reviews" },
        { action: "reports.export", description: "Export Reports" },
        { action: "reports.revenue.view", description: "View Revenue Reports" },
        { action: "reports.customers.view", description: "View Customer Reports" },
        { action: "reports.services.view", description: "View Service Reports" },
        { action: "reports.staff.view", description: "View Staff Reports" },
        { action: "reports.bookings.view", description: "View Booking Reports" },
        { action: "reports.reviews.view", description: "View Review Reports" },
    ];

    for (const perm of permissions) {
        await prisma.permission.upsert({ where: { action: perm.action }, update: { description: perm.description }, create: perm });
    }

    const paymentWalletDefinition = SUBSCRIPTION_FEATURE_DEFINITIONS.find(({ key }) => key === "payment_wallet");
    if (paymentWalletDefinition) {
        await prisma.$transaction(async (tx) => {
            const [existing, legacy] = await Promise.all([
                tx.subscriptionFeature.findUnique({ where: { key: paymentWalletDefinition.key } }),
                tx.subscriptionFeature.findUnique({ where: { key: "payments" } }),
            ]);
            let feature = existing;
            if (!feature && legacy) {
                feature = await tx.subscriptionFeature.update({
                    where: { id: legacy.id },
                    data: {
                        key: paymentWalletDefinition.key,
                        displayName: paymentWalletDefinition.displayName,
                        description: paymentWalletDefinition.description,
                        featureText: paymentWalletDefinition.displayName,
                        isActive: true,
                    },
                });
            } else if (!feature) {
                feature = await tx.subscriptionFeature.create({
                    data: {
                        key: paymentWalletDefinition.key,
                        displayName: paymentWalletDefinition.displayName,
                        description: paymentWalletDefinition.description,
                        featureText: paymentWalletDefinition.displayName,
                        isActive: true,
                        sortOrder: 13,
                    },
                });
            } else if (legacy) {
                const legacyPlanFeatures = await tx.subscriptionPlanFeature.findMany({ where: { featureId: legacy.id } });
                for (const item of legacyPlanFeatures) {
                    await tx.subscriptionPlanFeature.upsert({
                        where: { planId_featureId: { planId: item.planId, featureId: feature.id } },
                        update: { enabled: item.enabled ? true : undefined },
                        create: { planId: item.planId, featureId: feature.id, enabled: item.enabled, limits: item.limits, sortOrder: item.sortOrder },
                    });
                }
                const legacyPermissions = await tx.subscriptionFeaturePermission.findMany({ where: { featureId: legacy.id } });
                for (const item of legacyPermissions) {
                    await tx.subscriptionFeaturePermission.upsert({
                        where: { featureId_permissionId: { featureId: feature.id, permissionId: item.permissionId } },
                        update: {},
                        create: { featureId: feature.id, permissionId: item.permissionId },
                    });
                }
                await tx.subscriptionFeature.delete({ where: { id: legacy.id } });
            }
            feature = await tx.subscriptionFeature.update({
                where: { id: feature.id },
                data: {
                    displayName: paymentWalletDefinition.displayName,
                    description: paymentWalletDefinition.description,
                    featureText: paymentWalletDefinition.displayName,
                    isActive: true,
                },
            });
            for (const action of paymentWalletDefinition.permissions) {
                const permission = await tx.permission.findUnique({ where: { action } });
                if (permission) {
                    await tx.subscriptionFeaturePermission.upsert({
                        where: { featureId_permissionId: { featureId: feature.id, permissionId: permission.id } },
                        update: {},
                        create: { featureId: feature.id, permissionId: permission.id },
                    });
                }
            }
            const plans = await tx.subscriptionPlan.findMany({ select: { id: true, slug: true } });
            for (const plan of plans) {
                await tx.subscriptionPlanFeature.upsert({
                    where: { planId_featureId: { planId: plan.id, featureId: feature.id } },
                    update: plan.slug === "FREE" ? { enabled: true } : {},
                    create: { planId: plan.id, featureId: feature.id, enabled: plan.slug === "FREE", sortOrder: 13 },
                });
            }
        });
    }

    // Assign all permissions to ADMIN role
    const allPerms = await prisma.permission.findMany();
    if (adminRole) {
        for (const perm of allPerms) {
            await prisma.rolePermission.create({
                data: { roleId: adminRole.id, permissionId: perm.id }
            });
        }
    }

    // Assign default permissions to VENDOR role (all except access-control)
    const vendorRoleSeed = await prisma.role.findUnique({ where: { name: APP_CONSTANTS.ROLES.VENDOR } });
    if (vendorRoleSeed) {
        for (const perm of allPerms) {
            if (!perm.action.startsWith("access-control.") && perm.action !== "subscriptions.manage"
                && !perm.action.startsWith("tracking.")
                && !perm.action.startsWith("payment-wallet.")
                && (!perm.action.startsWith("booking-finance.") || [
                    "booking-finance.wallet.view",
                    "booking-finance.payout-account.manage",
                ].includes(perm.action))
                ) {
                await prisma.rolePermission.create({
                    data: { roleId: vendorRoleSeed.id, permissionId: perm.id }
                });
            }
        }
    }

    console.log("Seeding Menus...");
    const menus = [
        { label: 'Dashboard', path: '/dashboard', icon: 'LayoutDashboard', order: 1, permissions: [] },
        { label: 'Feed', path: '/feed', icon: 'Newspaper', order: 2, permissions: ['feed.view'] },
        { label: 'WhatsApp', path: '/whatsapp', icon: 'MessageCircle', order: 3, permissions: ['whatsapp.view'] },
        { label: 'Inventory', path: '/inventory', icon: 'Package', order: 4, permissions: ['inventory.view'] },
        { label: 'Salons', path: '/salons', icon: 'Store', order: 2, permissions: ["salons.view"] },
        { label: 'Branches', path: '/branch', icon: 'GitBranch', order: 3, permissions: ["branch.view"] },
        { label: 'Staff', path: '/staff', icon: 'Users', order: 4, permissions: ["staff.view"] },
        { label: 'Attendance', path: '/attendance', icon: 'CalendarCheck', order: 5, permissions: ["attendance.view"] },
        { label: 'Services', path: '/services', icon: 'Scissors', order: 6, permissions: ["services.view"] },
        { label: 'Coupons', path: '/coupons', icon: 'TicketPercent', order: 10, permissions: ["coupons.view"] },
        { label: 'Categories', path: '/categories', icon: 'Tags', order: 7, permissions: ["categories.view"] },
        { label: 'Customers', path: '/customers', icon: 'UserGroup', order: 8, permissions: ["customers.view"] },
        { label: 'Bookings', path: '/bookings', icon: 'Calendar', order: 9, permissions: ["bookings.view"] },
        { label: 'Leads', path: '/leads', icon: 'UserPlus', order: 10, permissions: ["leads.view"] },
        { label: 'Access Control', path: '/access-control', icon: 'Shield', order: 11, permissions: ["access-control.view"] },
        { label: 'Settings', path: '/settings', icon: 'Settings', order: 12, permissions: ["settings.view"] },
        { label: 'Subscription', path: '/subscriptions', icon: 'CreditCard', order: 14, permissions: ["subscriptions.view"] },
        { label: 'Subscription Plans', path: '/admin/subscriptions', icon: 'CreditCard', order: 15, permissions: ["subscriptions.manage"] },
        { label: 'Reports & Analytics', path: '/reports-analytics', icon: 'BarChart3', order: 14, permissions: ['reports.view'] },
        { label: 'Advertisements', path: '/advertisements', icon: 'Megaphone', order: 16, permissions: ['advertisement.view'] },
        { label: 'Payment & Wallet', path: '/booking-finance', icon: 'WalletCards', order: 17, permissions: ['booking-finance.view'] },
        { label: 'Tracking', path: '/tracking', icon: 'Activity', order: 18, permissions: ['tracking.view'] },
    ];

    for (const menu of menus) {
        const existingMenu = await prisma.menu.findFirst({ where: { path: menu.path, parentId: null } });
        const newMenu = existingMenu ?? await prisma.menu.create({
            data: { label: menu.label, path: menu.path, icon: menu.icon, order: menu.order },
        });
        if (existingMenu) {
            await prisma.menu.update({ where: { id: existingMenu.id }, data: { label: menu.label, icon: menu.icon, order: menu.order } });
        }

        for (const permAction of menu.permissions) {
            const permission = await prisma.permission.findUnique({ where: { action: permAction } });
            if (permission) {
                await prisma.menuPermission.upsert({
                    where: { menuId_permissionId: { menuId: newMenu.id, permissionId: permission.id } },
                    update: {},
                    create: { menuId: newMenu.id, permissionId: permission.id },
                });
            }
        }
    }

    const moduleSubmenus = [
        { parent: 'Tracking', label: 'Tracking Overview', path: '/tracking', icon: 'LayoutDashboard', order: 1, permissions: ['tracking.overview'] },
        { parent: 'Tracking', label: 'User Activity', path: '/tracking/activity', icon: 'List', order: 2, permissions: ['tracking.activity'] },
        { parent: 'Tracking', label: 'Login Sessions', path: '/tracking/sessions', icon: 'Monitor', order: 3, permissions: ['tracking.sessions'] },
        { parent: 'Tracking', label: 'CRM Menu Usage', path: '/tracking/menu-usage', icon: 'PanelsTopLeft', order: 4, permissions: ['tracking.menu_usage'] },
        { parent: 'Tracking', label: 'Customer App Usage', path: '/tracking/customer-app', icon: 'Smartphone', order: 5, permissions: ['tracking.customer_app'] },
        { parent: 'Tracking', label: 'Vendor Tracking', path: '/tracking/vendors', icon: 'Store', order: 6, permissions: ['tracking.vendor'] },
        { parent: 'Tracking', label: 'Staff Tracking', path: '/tracking/staff', icon: 'Users', order: 7, permissions: ['tracking.staff'] },
        { parent: 'Tracking', label: 'Customer Tracking', path: '/tracking/customers', icon: 'UserRound', order: 8, permissions: ['tracking.customer'] },
        { parent: 'Tracking', label: 'Location & Device', path: '/tracking/location-device', icon: 'MapPin', order: 9, permissions: ['tracking.location'] },
        { parent: 'Tracking', label: 'Tracking Analytics', path: '/tracking/analytics', icon: 'ChartNoAxesCombined', order: 10, permissions: ['tracking.analytics'] },
        { parent: 'Feed', label: 'Posts', path: '/feed/posts', icon: 'Images', order: 1, permissions: ['feed.view'] },
        { parent: 'Feed', label: 'Stories', path: '/feed/stories', icon: 'CirclePlay', order: 2, permissions: ['feed.view'] },
        { parent: 'WhatsApp', label: 'WhatsApp Dashboard', path: '/whatsapp', icon: 'LayoutDashboard', order: 1, permissions: ['whatsapp.view'] },
        { parent: 'WhatsApp', label: 'Connections', path: '/whatsapp/connections', icon: 'Wifi', order: 2, permissions: ['whatsapp.view'] },
        { parent: 'WhatsApp', label: 'Campaigns', path: '/whatsapp/campaigns', icon: 'Send', order: 3, permissions: ['whatsapp.view'] },
        { parent: 'WhatsApp', label: 'Templates', path: '/whatsapp/templates', icon: 'FileText', order: 4, permissions: ['whatsapp.view'] },
        { parent: 'WhatsApp', label: 'Contacts', path: '/whatsapp/contacts', icon: 'Users', order: 5, permissions: ['whatsapp.view'] },
        { parent: 'WhatsApp', label: 'Messages', path: '/whatsapp/messages', icon: 'MessageSquare', order: 6, permissions: ['whatsapp.view'] },
        { parent: 'WhatsApp', label: 'Automation', path: '/whatsapp/automation', icon: 'Zap', order: 7, permissions: ['whatsapp.view'] },
        { parent: 'WhatsApp', label: 'Usage', path: '/whatsapp/usage', icon: 'ChartNoAxesCombined', order: 8, permissions: ['whatsapp.view'] },
        { parent: 'WhatsApp', label: 'Settings', path: '/whatsapp/settings', icon: 'Settings', order: 9, permissions: ['whatsapp.view'] },
        { parent: 'Inventory', label: 'Products', path: '/inventory/products', icon: 'Package', order: 1, permissions: ['inventory.view'] },
        { parent: 'Inventory', label: 'Categories', path: '/inventory/categories', icon: 'Tags', order: 2, permissions: ['inventory.view'] },
        { parent: 'Inventory', label: 'Stock', path: '/inventory/stock', icon: 'Warehouse', order: 3, permissions: ['inventory.view'] },
        { parent: 'Inventory', label: 'Reports', path: '/inventory/reports', icon: 'ChartNoAxesCombined', order: 4, permissions: ['inventory.view'] },
        { parent: 'Payment & Wallet', label: 'Payment Overview', path: '/payment-wallet/overview', icon: 'ChartNoAxesCombined', order: 1, permissions: ['payment-wallet.overview.view'] },
        { parent: 'Payment & Wallet', label: 'Payments', path: '/payments', icon: 'CreditCard', order: 2, permissions: ['payment-wallet.payments.view', 'payment-wallet.payments.create', 'payment-wallet.payments.update'] },
        { parent: 'Payment & Wallet', label: 'Payment Transactions', path: '/payments/transactions', icon: 'Receipt', order: 3, permissions: ['payment-wallet.transactions.view'] },
        { parent: 'Payment & Wallet', label: 'Payment Gateway', path: '/payment-gateway', icon: 'CreditCard', order: 4, permissions: ['payment-gateway.view', 'payment-gateway.manage', 'payment-gateway.navbar'] },
        { parent: 'Payment & Wallet', label: 'Refunds', path: '/refunds', icon: 'Undo2', order: 5, permissions: ['payment-wallet.refunds.view', 'payment-wallet.refunds.create', 'payment-wallet.refunds.update'] },
        { parent: 'Payment & Wallet', label: 'Customer Wallet', path: '/customer-wallet', icon: 'Wallet', order: 6, permissions: ['payment-wallet.customer-wallet.view', 'payment-wallet.customer-wallet.create', 'payment-wallet.customer-wallet.update'] },
        { parent: 'Payment & Wallet', label: 'Wallet Overview', path: '/booking/commission/dashboard', icon: 'Wallet', order: 7, permissions: ['booking-finance.view'] },
        { parent: 'Payment & Wallet', label: 'Wallet Transactions', path: '/booking/commission/wallet-transactions', icon: 'Receipt', order: 8, permissions: ['booking-finance.view'] },
        { parent: 'Payment & Wallet', label: 'Booking Commission', path: '/booking/commission/summary', icon: 'Percent', order: 9, permissions: ['booking-finance.view', 'booking-finance.configure', 'booking-finance.update'] },
        { parent: 'Payment & Wallet', label: 'Commission Transactions', path: '/booking/commission/transactions', icon: 'ListChecks', order: 10, permissions: ['booking-finance.view'] },
        { parent: 'Payment & Wallet', label: 'Pending Settlements', path: '/booking/commission/pending-settlement', icon: 'Clock3', order: 11, permissions: ['booking-finance.view', 'booking-finance.approve', 'booking-finance.settle'] },
        { parent: 'Payment & Wallet', label: 'Settlement History', path: '/booking/commission/settlements', icon: 'Landmark', order: 12, permissions: ['booking-finance.view'] },
        { parent: 'Payment & Wallet', label: 'Settlement Settings', path: '/booking/commission/settlement-settings', icon: 'Settings', order: 13, permissions: ['booking-finance.view', 'booking-finance.configure', 'booking-finance.update'] },
        { parent: 'Payment & Wallet', label: 'Financial Reports', path: '/booking/commission/reports', icon: 'ChartNoAxesCombined', order: 14, permissions: ['booking-finance.view'] },
        { parent: 'Payment & Wallet', label: 'Commission Settings', path: '/booking/commission/settings', icon: 'Percent', order: 17, permissions: ['booking-finance.view', 'booking-finance.configure', 'booking-finance.update'] },
        { parent: 'Payment & Wallet', label: 'Wallet & Transactions', path: '/vendor/finance/wallet', icon: 'Wallet', order: 15, audience: 'VENDOR', permissions: ['booking-finance.wallet.view'] },
        { parent: 'Payment & Wallet', label: 'Payout Account', path: '/vendor/finance/payout-account', icon: 'Landmark', order: 16, audience: 'VENDOR', permissions: ['booking-finance.payout-account.manage'] },
    ];
    for (const submenu of moduleSubmenus) {
        const parent = await prisma.menu.findFirst({ where: { label: submenu.parent, parentId: null } });
        if (parent) {
            const existingChild = await prisma.menu.findFirst({ where: { path: submenu.path, parentId: parent.id } });
            const audience = (submenu as any).audience ?? "ALL";
            const child = existingChild ?? await prisma.menu.create({ data: { label: submenu.label, path: submenu.path, icon: submenu.icon, parentId: parent.id, order: submenu.order, audience } });
            if (existingChild) {
                await prisma.menu.update({ where: { id: existingChild.id }, data: { label: submenu.label, icon: submenu.icon, parentId: parent.id, order: submenu.order, showInSidebar: true, audience } });
            }
            if ((submenu as any).permissions) {
                for (const permAction of (submenu as any).permissions) {
                    const permission = await prisma.permission.findUnique({ where: { action: permAction } });
                    if (permission) {
                        await prisma.menuPermission.upsert({
                            where: { menuId_permissionId: { menuId: child.id, permissionId: permission.id } },
                            update: {},
                            create: { menuId: child.id, permissionId: permission.id },
                        });
                    }
                }
            }
        }
    }
    await prisma.menuPermission.deleteMany({
        where: {
            permission: { action: "booking-finance.wallet.view" },
            menu: { path: "/vendor/finance/payout-account" },
        },
    });
    const vendorWalletPermission = await prisma.permission.findUnique({ where: { action: "booking-finance.wallet.view" } });
    if (vendorWalletPermission) {
        await prisma.menuPermission.deleteMany({
            where: {
                permissionId: vendorWalletPermission.id,
                menu: {
                    path: {
                        in: [
                            "/booking-finance",
                            "/booking/commission/summary",
                            "/booking/commission/dashboard",
                            "/booking/commission/wallet-transactions",
                            "/booking/commission/transactions",
                            "/booking/commission/pending-settlement",
                            "/booking/commission/settlements",
                        ],
                    },
                },
            },
        });
    }
    await prisma.menu.updateMany({
        where: { path: '/vendor/finance', parentId: null },
        data: { showInSidebar: false },
    });
    await cacheInvalidate("menus:*");
    await cacheInvalidate("rbac:perms:*");

    console.log("Seeding Sample Vendor & 4 Salons with Branches...");
    const vendorPassword = await bcrypt.hash("Vendor@123", 10);
    const vendor = await prisma.user.create({
        data: {
            firstName: "John",
            lastName: "Vendor",
            email: "vendor@example.com",
            phone: "9876543210",
            countryCode: "+91",
            password: vendorPassword,
        }
    });

    const vendorRole = await prisma.role.findUnique({ where: { name: APP_CONSTANTS.ROLES.VENDOR } });
    if (vendorRole) {
        await prisma.userRole.create({ data: { userId: vendor.id, roleId: vendorRole.id } });
    }

    const defaultTimings = {
        monday: { open: "09:00", close: "21:00" },
        tuesday: { open: "09:00", close: "21:00" },
        wednesday: { open: "09:00", close: "21:00" },
        thursday: { open: "09:00", close: "21:00" },
        friday: { open: "09:00", close: "21:00" },
        saturday: { open: "10:00", close: "22:00" },
        sunday: { open: "10:00", close: "22:00" },
    };

    const salonsData = [
        {
            name: "Zipp Delhi Premium Salon",
            region: "Delhi",
            city: "New Delhi",
            pincode: "110001",
            branches: [
                { name: "Zipp Delhi Premium - Saket", pincode: "110017", email: "saket_admin@example.com" },
                { name: "Zipp Delhi Premium - Connaught Place", pincode: "110001", email: "cp_admin@example.com" },
                { name: "Zipp Delhi Premium - Karol Bagh", pincode: "110005", email: "kb_admin@example.com" }
            ]
        },
        {
            name: "Zipp Delhi Elite Salon",
            region: "Delhi",
            city: "New Delhi",
            pincode: "110020",
            branches: [
                { name: "Zipp Delhi Elite - Vasant Kunj", pincode: "110070", email: "vk_admin@example.com" },
                { name: "Zipp Delhi Elite - Dwarka", pincode: "110075", email: "dwarka_admin@example.com" }
            ]
        },
        {
            name: "Zipp Jaipur Royal Salon",
            region: "Jaipur",
            city: "Jaipur",
            pincode: "302001",
            branches: [
                { name: "Zipp Jaipur Royal - Vaishali Nagar", pincode: "302021", email: "vaishali_admin@example.com" },
                { name: "Zipp Jaipur Royal - Malviya Nagar", pincode: "302017", email: "malviya_admin@example.com" },
                { name: "Zipp Jaipur Royal - C-Scheme", pincode: "302001", email: "cscheme_admin@example.com" }
            ]
        },
        {
            name: "Zipp Jaipur Heritage Salon",
            region: "Jaipur",
            city: "Jaipur",
            pincode: "302015",
            branches: [
                { name: "Zipp Jaipur Heritage - Mansarovar", pincode: "302020", email: "mansarovar_admin@example.com" },
                { name: "Zipp Jaipur Heritage - Raja Park", pincode: "302004", email: "rajapark_admin@example.com" }
            ]
        }
    ];

    console.log("Seeding Categories...");
    const haircutCat = await prisma.serviceCategory.create({ data: { name: "Haircut" } });
    const facialCat = await prisma.serviceCategory.create({ data: { name: "Facial" } });
    const massageCat = await prisma.serviceCategory.create({ data: { name: "Massage" } });

    let phoneCounter = 9000000001;

    for (const sData of salonsData) {
        console.log(`Creating Head Office: ${sData.name}`);
        const hoPhone = String(phoneCounter++);
        const hoSalon = await prisma.salon.create({
            data: {
                name: sData.name,
                ownerId: vendor.id,
                description: `Head office of ${sData.name} located in ${sData.region} Region.`,
                avgPrice: 500,
                avgWaitTime: 15,
                timings: defaultTimings,
                isActive: true,
                isProfileCompleted: true,
                address: {
                    create: {
                        line1: `HO Address, ${sData.city}`,
                        city: sData.city,
                        state: sData.region === "Delhi" ? "Delhi" : "Rajasthan",
                        country: "India",
                        pincode: sData.pincode
                    }
                },
                contacts: {
                    create: [
                        { phone: hoPhone, countryCode: "91", isPrimary: true }
                    ]
                }
            }
        });

        // Add some services to head office
        await prisma.service.createMany({
            data: [
                {
                    salonId: hoSalon.id,
                    name: "Signature Haircut",
                    description: "Premium stylist haircut with wash",
                    categoryId: haircutCat.id,
                    basePrice: 400,
                    baseDuration: 30,
                    isActive: true,
                    createdById: vendor.id
                },
                {
                    salonId: hoSalon.id,
                    name: "Express Facial",
                    description: "Quick clean-up and hydration",
                    categoryId: facialCat.id,
                    basePrice: 600,
                    baseDuration: 45,
                    isActive: true,
                    createdById: vendor.id
                }
            ]
        });

        // Seed Branches
        for (const bData of sData.branches) {
            console.log(`Creating Branch: ${bData.name} under ${sData.name}`);
            
            // Create branch owner user
            const branchOwnerPhone = String(phoneCounter++);
            const branchAdminUser = await prisma.user.create({
                data: {
                    firstName: bData.name.split(" - ")[1],
                    lastName: "Manager",
                    email: bData.email,
                    phone: branchOwnerPhone,
                    countryCode: "+91",
                    password: vendorPassword,
                }
            });

            if (vendorRole) {
                await prisma.userRole.create({ data: { userId: branchAdminUser.id, roleId: vendorRole.id } });
            }

            const branchPhone = String(phoneCounter++);
            const branchSalon = await prisma.salon.create({
                data: {
                    name: bData.name,
                    parentId: hoSalon.id,
                    ownerId: branchAdminUser.id,
                    description: `Branch salon located at ${bData.name.split(" - ")[1]}.`,
                    avgPrice: 450,
                    avgWaitTime: 20,
                    timings: defaultTimings,
                    isActive: true,
                    isProfileCompleted: true,
                    address: {
                        create: {
                            line1: `${bData.name.split(" - ")[1]} Market`,
                            city: sData.city,
                            state: sData.region === "Delhi" ? "Delhi" : "Rajasthan",
                            country: "India",
                            pincode: bData.pincode
                        }
                    },
                    contacts: {
                        create: [
                            { phone: branchPhone, countryCode: "91", isPrimary: true }
                        ]
                    }
                }
            });

            // Seed services for branch
            await prisma.service.createMany({
                data: [
                    {
                        salonId: branchSalon.id,
                        name: "Standard Haircut",
                        description: "Classic clipper or scissor haircut",
                        categoryId: haircutCat.id,
                        basePrice: 300,
                        baseDuration: 30,
                        isActive: true,
                        createdById: branchAdminUser.id
                    },
                    {
                        salonId: branchSalon.id,
                        name: "Gold Facial",
                        description: "Premium exfoliating and massage facial",
                        categoryId: facialCat.id,
                        basePrice: 1200,
                        baseDuration: 60,
                        isActive: true,
                        createdById: branchAdminUser.id
                    },
                    {
                        salonId: branchSalon.id,
                        name: "Deep Tissue Massage",
                        description: "Therapeutic full body massage",
                        categoryId: massageCat.id,
                        basePrice: 1500,
                        baseDuration: 60,
                        isActive: true,
                        createdById: branchAdminUser.id
                    }
                ]
            });

            // Create some staff for the branch
            const staffEmail = `${bData.name.split(" - ")[1].toLowerCase().replace(/\s+/g, "")}_staff@example.com`;
            const staffPhone = String(phoneCounter++);
            const staffUser = await prisma.user.create({
                data: {
                    firstName: bData.name.split(" - ")[1] + " Stylist",
                    lastName: "Staff",
                    email: staffEmail,
                    phone: staffPhone,
                    countryCode: "+91",
                    password: vendorPassword,
                }
            });

            const staffRole = await prisma.role.findUnique({ where: { name: APP_CONSTANTS.ROLES.STAFF } });
            if (staffRole) {
                await prisma.userRole.create({ data: { userId: staffUser.id, roleId: staffRole.id } });
            }

            await prisma.salonStaff.create({
                data: {
                    userId: staffUser.id,
                    salonId: branchSalon.id,
                    role: "Stylist",
                    isActive: true,
                    createdById: branchAdminUser.id
                }
            });
        }
    }

    console.log("Seeding Standard Test Accounts (Admin@12345)...");
    const testPasswordHash = await bcrypt.hash("Admin@12345", 10);

    const testAdmin = await prisma.user.create({
        data: {
            firstName: "System",
            lastName: "Admin",
            email: "admin@example.test",
            phone: "9810000001",
            countryCode: "+91",
            password: testPasswordHash,
        }
    });
    if (adminRole) {
        await prisma.userRole.create({ data: { userId: testAdmin.id, roleId: adminRole.id } });
    }

    const testOwner = await prisma.user.create({
        data: {
            firstName: "Salon",
            lastName: "Owner",
            email: "owner@example.test",
            phone: "9810000002",
            countryCode: "+91",
            password: testPasswordHash,
        }
    });
    if (vendorRole) {
        await prisma.userRole.create({ data: { userId: testOwner.id, roleId: vendorRole.id } });
    }

    const testManager = await prisma.user.create({
        data: {
            firstName: "Branch",
            lastName: "Manager",
            email: "manager@example.test",
            phone: "9810000003",
            countryCode: "+91",
            password: testPasswordHash,
        }
    });
    if (vendorRole) {
        await prisma.userRole.create({ data: { userId: testManager.id, roleId: vendorRole.id } });
    }

    const testStaff = await prisma.user.create({
        data: {
            firstName: "Senior",
            lastName: "Stylist",
            email: "staff@example.test",
            phone: "9810000004",
            countryCode: "+91",
            password: testPasswordHash,
        }
    });
    const staffRoleSeed = await prisma.role.findUnique({ where: { name: APP_CONSTANTS.ROLES.STAFF } });
    if (staffRoleSeed) {
        await prisma.userRole.create({ data: { userId: testStaff.id, roleId: staffRoleSeed.id } });
    }

    const customerRoleSeed = await prisma.role.findUnique({ where: { name: APP_CONSTANTS.ROLES.CUSTOMER } });
    const testCustomer = await prisma.user.create({
        data: {
            firstName: "Demo",
            lastName: "Customer",
            email: "customer@example.test",
            phone: "9810000005",
            countryCode: "+91",
            password: testPasswordHash,
        }
    });
    if (customerRoleSeed) {
        await prisma.userRole.create({ data: { userId: testCustomer.id, roleId: customerRoleSeed.id } });
    }

    console.log("Seeding GST Configurations...");
    const allSalons = await prisma.salon.findMany();
    for (const s of allSalons) {
        await prisma.gSTConfiguration.create({
            data: {
                salonId: s.id,
                cgstRate: 9.0,
                sgstRate: 9.0,
                igstRate: 18.0,
                isActive: true,
            }
        });
    }

    console.log("Seeding 20 Customers and Mappings...");
    const customers = [testCustomer];
    for (let i = 1; i <= 19; i++) {
        const cust = await prisma.user.create({
            data: {
                firstName: `Customer${i}`,
                lastName: `User`,
                email: `customer${i}@example.test`,
                phone: `982000${String(i).padStart(4, "0")}`,
                countryCode: "+91",
                password: testPasswordHash,
            }
        });
        if (customerRoleSeed) {
            await prisma.userRole.create({ data: { userId: cust.id, roleId: customerRoleSeed.id } });
        }
        customers.push(cust);
    }

    for (let i = 0; i < customers.length; i++) {
        const s = allSalons[i % allSalons.length];
        await prisma.salonCustomer.create({
            data: {
                salonId: s.id,
                userId: customers[i].id,
            }
        });
    }

    console.log("Seeding 30 Bookings with Services and Payments...");
    const branchSalons = allSalons.filter(s => s.parentId !== null);
    const targetSalons = branchSalons.length > 0 ? branchSalons : allSalons;
    const allStaff = await prisma.salonStaff.findMany();
    const allServices = await prisma.service.findMany();

    const bookingStatuses = [
        "CONFIRMED", "CHECKED_IN", "DONE", "PENDING", "CANCELLED", "NO_SHOW"
    ] as const;

    for (let i = 0; i < 30; i++) {
        const salon = targetSalons[i % targetSalons.length];
        const customer = customers[i % customers.length];
        const staff = allStaff.find(st => st.salonId === salon.id) || allStaff[0];
        const salonServices = allServices.filter(sv => sv.salonId === salon.id || sv.salonId === salon.parentId);
        const selectedService = salonServices.length > 0 ? salonServices[i % salonServices.length] : allServices[0];
        const gst = await prisma.gSTConfiguration.findUnique({ where: { salonId: salon.id } });

        const price = selectedService ? selectedService.basePrice : 500;
        const cgst = (price * 0.09);
        const sgst = (price * 0.09);
        const totalTax = cgst + sgst;
        const finalAmt = price + totalTax;
        const status = bookingStatuses[i % bookingStatuses.length];

        const daysOffset = (i % 15) - 7;
        const bookingDate = new Date(Date.now() + daysOffset * 86400000);

        const booking = await prisma.booking.create({
            data: {
                salonId: salon.id,
                customerId: customer.id,
                staffId: staff ? staff.id : undefined,
                gstConfigurationId: gst ? gst.id : undefined,
                bookingDate,
                status,
                totalAmount: price,
                discount: 0,
                discountAmount: 0,
                taxableAmount: price,
                cgstAmount: cgst,
                sgstAmount: sgst,
                igstAmount: 0,
                totalTaxAmount: totalTax,
                finalAmount: finalAmt,
                totalPaid: status === "DONE" || status === "CHECKED_IN" || status === "CONFIRMED" ? finalAmt : 0,
                notes: `Seeded booking #${i + 1}`,
                services: {
                    create: [
                        {
                            serviceId: selectedService ? selectedService.id : undefined,
                            name: selectedService ? selectedService.name : "Haircut",
                            price,
                        }
                    ]
                }
            }
        });

        if (status === "DONE" || status === "CONFIRMED" || status === "CHECKED_IN") {
            await prisma.payment.create({
                data: {
                    bookingId: booking.id,
                    amount: finalAmt,
                    method: i % 3 === 0 ? "UPI" : i % 3 === 1 ? "CARD" : "CASH",
                    status: "COMPLETED",
                    transactionId: `TXN-SEED-${i + 1}`,
                }
            });
        }
    }

    console.log("Seeding 10 Leads...");
    const leadStatuses = ["NEW", "CONTACTED", "QUALIFIED", "CONVERTED", "REJECTED"] as const;
    for (let i = 1; i <= 10; i++) {
        await prisma.lead.create({
            data: {
                name: `Prospective Partner ${i}`,
                email: `lead${i}@example.test`,
                phone: `983000${String(i).padStart(4, "0")}`,
                countryCode: "+91",
                status: leadStatuses[i % leadStatuses.length],
                message: `Inquiring about onboarding salon chain with 3 branches (#${i}).`,
                metadata: { source: "website_landing_page", campaign: "autumn_2026" },
            }
        });
    }

    console.log("Seeding WhatsApp demo data...");
    const seededSalons = await prisma.salon.findMany({
        where: { OR: [{ ownerId: vendor.id }, { parent: { ownerId: vendor.id } }] },
        orderBy: { createdAt: "asc" },
        take: 6,
    });
    const seededTemplates = await prisma.whatsAppTemplate.findMany({ orderBy: { createdAt: "asc" }, take: 20 });
    const utilityTemplate = seededTemplates.find((template) => template.category === "UTILITY") ?? seededTemplates[0];
    const marketingTemplate = seededTemplates.find((template) => template.category === "MARKETING") ?? utilityTemplate;
    if (!process.env.WHATSAPP_ENCRYPTION_KEY) process.env.WHATSAPP_ENCRYPTION_KEY = "development-only-whatsapp-seed-key";

    if (seededSalons.length && utilityTemplate && marketingTemplate) {
        await prisma.whatsAppPricing.createMany({
            data: [
                { messageCategory: "UTILITY", costPerMessage: 0.8, currency: "INR", effectiveFrom: new Date("2026-09-01"), createdBy: admin.id },
                { messageCategory: "MARKETING", costPerMessage: 1.2, currency: "INR", effectiveFrom: new Date("2026-09-01"), createdBy: admin.id },
                { messageCategory: "AUTHENTICATION", costPerMessage: 0.5, currency: "INR", effectiveFrom: new Date("2026-09-01"), createdBy: admin.id },
                { messageCategory: "SERVICE", costPerMessage: 0.8, currency: "INR", effectiveFrom: new Date("2026-09-01"), createdBy: admin.id },
            ],
        });

        const connections = [];
        for (let index = 0; index < seededSalons.length; index += 1) {
            const salon = seededSalons[index];
            const branch = salon.parentId ? salon : await prisma.salon.findFirst({ where: { parentId: salon.id }, orderBy: { createdAt: "asc" } });
            connections.push(await prisma.whatsAppConnection.create({
                data: {
                    vendorId: vendor.id,
                    salonId: salon.parentId ?? salon.id,
                    branchId: branch?.parentId ? branch.id : undefined,
                    businessAccountId: `demo-business-${index + 1}`,
                    phoneNumberId: `demo-phone-${index + 1}`,
                    displayPhoneNumber: `+9198765432${String(index).padStart(2, "0")}`,
                    verifiedName: salon.name,
                    encryptedAccessToken: encrypt(`demo-access-token-${index + 1}`),
                    apiVersion: "v20.0",
                    status: "CONNECTED",
                    qualityRating: "GREEN",
                    messagingLimit: "1000",
                    lastHealthCheckAt: new Date(),
                    lastConnectedAt: new Date(),
                },
            }));
        }

        const contacts = [];
        for (let index = 0; index < 20; index += 1) {
            const connection = connections[index % connections.length];
            const phone = `+91980000${String(index + 1).padStart(4, "0")}`;
            const contact = await prisma.whatsAppContact.create({
                data: {
                    vendorId: vendor.id,
                    salonId: connection.salonId,
                    branchId: connection.branchId,
                    name: `Demo Customer ${index + 1}`,
                    phoneNumber: phone,
                    normalizedPhoneNumber: phone,
                    countryCode: "+91",
                    optInStatus: index % 5 === 0 ? "UNKNOWN" : index % 7 === 0 ? "OPTED_OUT" : "OPTED_IN",
                    tags: index % 2 === 0 ? ["regular", "demo"] : ["demo"],
                },
            });
            contacts.push(contact);
        }

        const campaign = await prisma.whatsAppCampaign.create({
            data: {
                vendorId: vendor.id,
                salonId: connections[0].salonId,
                branchId: connections[0].branchId,
                name: "September appointment reminders",
                description: "Seeded campaign for local development.",
                templateId: utilityTemplate.id,
                connectionId: connections[0].id,
                campaignType: "SEND_NOW",
                audienceType: "OPTED_IN",
                status: "COMPLETED",
                totalRecipients: 12,
                queuedCount: 0,
                sentCount: 11,
                deliveredCount: 11,
                readCount: 8,
                failedCount: 1,
                estimatedCost: 9.6,
                actualCost: 8.8,
                currency: "INR",
                pricingSnapshot: { messageCategory: "UTILITY", perMessageRate: 0.8, campaignCharge: 0, currency: "INR" },
                createdBy: vendor.id,
                startedAt: new Date(Date.now() - 86400000),
                completedAt: new Date(Date.now() - 82800000),
            },
        });

        const optedInContacts = contacts.filter((contact) => contact.optInStatus === "OPTED_IN").slice(0, 12);
        await prisma.whatsAppCampaignRecipient.createMany({
            data: optedInContacts.map((contact, index) => ({
                campaignId: campaign.id,
                contactId: contact.id,
                customerId: contact.customerId,
                phoneNumberSnapshot: contact.normalizedPhoneNumber,
                nameSnapshot: contact.name,
                status: index === 11 ? "FAILED" : index < 8 ? "READ" : "DELIVERED",
                unitCost: 0.8,
                currency: "INR",
                sentAt: index === 11 ? undefined : new Date(Date.now() - 86400000),
                deliveredAt: index === 11 ? undefined : new Date(Date.now() - 86000000),
                readAt: index < 8 ? new Date(Date.now() - 85000000) : undefined,
                failedAt: index === 11 ? new Date(Date.now() - 84000000) : undefined,
                failureCode: index === 11 ? "PROVIDER_TIMEOUT" : undefined,
                failureReason: index === 11 ? "Demo provider timeout" : undefined,
            })),
        });

        for (let index = 0; index < 12; index += 1) {
            const contact = contacts[index];
            const message = await prisma.whatsAppMessage.create({
                data: {
                    vendorId: vendor.id,
                    salonId: connections[0].salonId,
                    branchId: connections[0].branchId,
                    campaignId: campaign.id,
                    contactId: contact.id,
                    connectionId: connections[0].id,
                    templateId: utilityTemplate.id,
                    direction: "OUTBOUND",
                    messageType: "TEMPLATE",
                    phoneNumber: contact.normalizedPhoneNumber,
                    messageBody: utilityTemplate.body,
                    templatePayload: { "1": contact.name, "2": "10 September 2026" },
                    status: index === 11 ? "FAILED" : index < 8 ? "READ" : "DELIVERED",
                    messageCategory: "UTILITY",
                    unitCost: 0.8,
                    currency: "INR",
                    sentAt: index === 11 ? undefined : new Date(Date.now() - index * 3600000),
                    deliveredAt: index === 11 ? undefined : new Date(Date.now() - index * 3600000 + 60000),
                    readAt: index < 8 ? new Date(Date.now() - index * 3600000 + 120000) : undefined,
                    failedAt: index === 11 ? new Date() : undefined,
                    failureCode: index === 11 ? "PROVIDER_TIMEOUT" : undefined,
                    failureReason: index === 11 ? "Demo provider timeout" : undefined,
                },
            });
            if (index !== 11) await prisma.whatsAppUsageLedger.create({
                data: {
                    vendorId: vendor.id,
                    salonId: connections[0].salonId,
                    branchId: connections[0].branchId,
                    campaignId: campaign.id,
                    messageId: message.id,
                    messageCategory: "UTILITY",
                    unitCost: 0.8,
                    totalCost: 0.8,
                    currency: "INR",
                    status: "PENDING",
                    idempotencyKey: `whatsapp-message:${message.id}`,
                },
            });
        }
        await prisma.whatsAppCampaignBilling.create({
            data: {
                campaignId: campaign.id,
                vendorId: vendor.id,
                salonId: connections[0].salonId,
                branchId: connections[0].branchId,
                messageCount: 11,
                billableMessageCount: 11,
                perMessageRate: 0.8,
                campaignCharge: 0,
                totalCharge: 8.8,
                currency: "INR",
                pricingSnapshot: { messageCategory: "UTILITY", perMessageRate: 0.8, campaignCharge: 0, currency: "INR" },
                billingStatus: "CALCULATED",
            },
        });
    }

    console.log("\n=======================================================");
    console.log("  TEST CREDENTIALS (Password: Admin@12345 for all)");
    console.log("=======================================================");
    console.log("  Super Admin:  admin@example.test / Admin@12345");
    console.log("  Salon Owner:  owner@example.test / Admin@12345");
    console.log("  Manager:      manager@example.test / Admin@12345");
    console.log("  Staff:        staff@example.test / Admin@12345");
    console.log("  Customer:     customer@example.test / Admin@12345");
    console.log("=======================================================\n");

    console.log("Seeding complete!");
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
