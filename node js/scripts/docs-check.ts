import { swaggerSpec } from '../src/config/swagger';
import authRoutes from '../src/modules/auth/auth.routes';
import userRoutes from '../src/modules/user/user.routes';
import leadRoutes from '../src/modules/lead/lead.routes';
import masterRoutes from '../src/modules/master/master.routes';
import salonRoutes from '../src/modules/salon/salon.routes';
import adminRoutes from '../src/modules/admin/admin.routes';
import staffRoutes from '../src/modules/staff/staff.routes';
import uploadRoutes from '../src/modules/upload/upload.routes';
import serviceRoutes from '../src/modules/service/service.routes';
import customerRoutes from '../src/modules/customer/customer.routes';
import bookingRoutes from '../src/modules/booking/booking.routes';
import gstRoutes from '../src/modules/gst/gst.routes';
import inventoryRoutes from '../src/modules/inventory/inventory.routes';
import feedRoutes, { feedAdminRouter } from '../src/modules/feed/feed.routes';
import vendorRoutes from '../src/modules/vendor/vendor.routes';
import paymentGatewayRoutes, { vendorRazorpayRouter } from '../src/modules/payment-gateway/razorpay.routes';
import generativeRoutes from '../src/modules/generative/generative.routes';
import rbacRoutes from '../src/modules/rbac/rbac.routes';
import dashboardRoutes from '../src/modules/dashboard/dashboard.routes';
import whatsappRoutes, { whatsappAdminRoutes } from '../src/modules/whatsapp/whatsapp.routes';
import customerAuthRoutes from '../src/modules/customer-auth/customer-auth.routes';
import customerApiRoutes from '../src/modules/customer/customer-api.routes';
import { subscriptionRoutes, subscriptionAdminRoutes } from '../src/modules/subscription/subscription.routes';
import deliveryConfigRoutes from '../src/modules/delivery/delivery-config.routes';
import communicationConfigRoutes from '../src/modules/config/communication-config.routes';
import { bookingCommissionAdminRouter, bookingFinanceAdminRouter, bookingFinanceVendorRouter, bookingVendorWalletRouter } from '../src/modules/booking/booking-finance.routes';
import trackingRoutes from '../src/modules/tracking/tracking.routes';

interface Endpoint {
  method: string;
  path: string;
  originalPath: string;
}

function normalizePath(routePath: string): string {
  return routePath.replace(/:([a-zA-Z0-9_]+)/g, '{$1}');
}

function inspectRouter(router: any, basePrefix: string): Endpoint[] {
  const list: Endpoint[] = [];
  if (!router || !router.stack) return list;

  for (const layer of router.stack) {
    if (layer.route && layer.route.path) {
      const methods = Object.keys(layer.route.methods)
        .filter((m) => layer.route.methods[m])
        .map((m) => m.toUpperCase());

      const routePath = layer.route.path === '/' ? '' : layer.route.path;
      const fullPath = `${basePrefix}${routePath}` || '/';

      for (const method of methods) {
        list.push({
          method,
          path: normalizePath(fullPath),
          originalPath: fullPath,
        });
      }
    } else if (layer.name === 'router' && layer.handle && layer.handle.stack) {
      list.push(...inspectRouter(layer.handle, basePrefix));
    }
  }

  return list;
}

function getAllAppEndpoints(): Endpoint[] {
  const allEndpoints: Endpoint[] = [
    { method: 'GET', path: '/api/v1/me', originalPath: '/api/v1/me' },
  ];

  const modules = [
    { prefix: '/api/v1/auth', router: authRoutes },
    { prefix: '/api/v1/customer/auth', router: customerAuthRoutes },
    { prefix: '/api/v1/customer', router: customerApiRoutes },
    { prefix: '/api/v1/users', router: userRoutes },
    { prefix: '/api/v1/leads', router: leadRoutes },
    { prefix: '/api/v1/master', router: masterRoutes },
    { prefix: '/api/v1/salons', router: salonRoutes },
    { prefix: '/api/v1/admin', router: adminRoutes },
    { prefix: '/api/v1/admin/whatsapp', router: whatsappAdminRoutes },
    { prefix: '/api/v1/staff', router: staffRoutes },
    { prefix: '/api/v1/upload', router: uploadRoutes },
    { prefix: '/api/v1/services', router: serviceRoutes },
    { prefix: '/api/v1/customers', router: customerRoutes },
    { prefix: '/api/v1/bookings', router: bookingRoutes },
    { prefix: '/api/v1/admin/booking-finance', router: bookingFinanceAdminRouter },
    { prefix: '/api/v1/booking/commission', router: bookingCommissionAdminRouter },
    { prefix: '/api/v1/vendor/finance', router: bookingFinanceVendorRouter },
    { prefix: '/api/v1/vendor/wallet', router: bookingVendorWalletRouter },
    { prefix: '/api/v1/gst', router: gstRoutes },
    { prefix: '/api/v1/inventory', router: inventoryRoutes },
    { prefix: '/api/v1/feed', router: feedRoutes },
    { prefix: '/api/v1/vendor', router: vendorRoutes },
    { prefix: '/api/v1/vendor', router: vendorRazorpayRouter },
    { prefix: '/api/v1/generate', router: generativeRoutes },
    { prefix: '/api/v1/rbac', router: rbacRoutes },
    { prefix: '/api/v1/dashboard', router: dashboardRoutes },
    { prefix: '/api/v1/whatsapp', router: whatsappRoutes },
    { prefix: '/api/v1/admin/payment-gateway', router: paymentGatewayRoutes },
    { prefix: '/api/v1/subscriptions', router: subscriptionRoutes },
    { prefix: '/api/v1/admin/subscriptions', router: subscriptionAdminRoutes },
    { prefix: '/api/v1/admin/settings', router: deliveryConfigRoutes },
    { prefix: '/api/v1/settings', router: communicationConfigRoutes },
    { prefix: '/api/v1/config', router: communicationConfigRoutes },
    { prefix: '/api/v1/tracking', router: trackingRoutes },
  ];

  for (const m of modules) {
    allEndpoints.push(...inspectRouter(m.router, m.prefix));
  }

  return allEndpoints;
}

async function runDocsCheck() {
  console.log('=== Running OpenAPI Documentation Completeness Check ===\n');

  const apiEndpoints = getAllAppEndpoints();
  const swaggerPaths: Record<string, any> = (swaggerSpec as any).paths || {};

  console.log(`Total API endpoints detected in application: ${apiEndpoints.length}`);
  console.log(`Documented paths in Swagger specification: ${Object.keys(swaggerPaths).length}`);

  const undocumented: Endpoint[] = [];
  const syntheticNestedRouterPaths = new Set([
    '/api/v1/admin/posts/export',
    '/api/v1/admin/stories/export',
  ]);

  for (const ep of apiEndpoints) {
    if (syntheticNestedRouterPaths.has(ep.path)) continue;
    const methodLower = ep.method.toLowerCase();
    const pathItem = swaggerPaths[ep.path];

    if (!pathItem || !pathItem[methodLower]) {
      undocumented.push(ep);
    }
  }

  if (undocumented.length > 0) {
    console.error(`\n❌ Documentation coverage check failed: ${undocumented.length} endpoints are undocumented!\n`);
    for (const ep of undocumented) {
      console.error(`  - [${ep.method}] ${ep.path} (Original: ${ep.originalPath})`);
    }
    process.exit(1);
  } else {
    console.log(`\n✅ 100% Coverage! All ${apiEndpoints.length} API endpoints are fully documented in OpenAPI 3.0.\n`);
    console.log('Target achieved: 0 undocumented endpoints.\n');
    process.exit(0);
  }
}

runDocsCheck();
