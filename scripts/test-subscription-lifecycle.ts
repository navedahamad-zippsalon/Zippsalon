import crypto from "crypto";
import { prisma } from "../src/infrastructure/database/prisma";
import { checkout, verifyPayment, cancel, currentSubscription, getSubscriptionPermissionActions, subscriptionMenuIds } from "../src/modules/subscription/subscription.service";
import { createClient as createRazorpayClient } from "../src/modules/payment-gateway/razorpay.service";
import { getUserPermissions, getMenus } from "../src/modules/rbac/rbac.service";

async function runTest() {
  console.log("==================================================");
  console.log("   TESTING COMPLETE SUBSCRIPTION LIFECYCLE");
  console.log("==================================================");

  // 1. Pick a test vendor
  const vendor = await prisma.user.findFirst({
    where: {
      email: "suraj@zippsalon.com",
      roles: { some: { role: { name: "VENDOR" } } },
    },
    include: { roles: { include: { role: true } } },
  });

  if (!vendor) {
    throw new Error("Test vendor suraj@zippsalon.com not found!");
  }
  console.log(`Using test vendor: ${vendor.email} (${vendor.id})`);

  const [freePlan, basicPlan, advancePlan] = await Promise.all([
    prisma.subscriptionPlan.findUniqueOrThrow({ where: { slug: "FREE" } }),
    prisma.subscriptionPlan.findUniqueOrThrow({ where: { slug: "BASIC" } }),
    prisma.subscriptionPlan.findUniqueOrThrow({ where: { slug: "ADVANCE" } }),
  ]);

  // Reset vendor to FREE plan initially
  console.log("\n--- STEP 1: RESETTING VENDOR TO FREE PLAN ---");
  await cancel(vendor.id, "Reset to Free for test");
  const initialSub = await currentSubscription(vendor.id);
  console.log(`Initial Subscription: Plan=${initialSub?.plan.name} (${initialSub?.plan.slug}), Status=${initialSub?.status}`);
  if (initialSub?.plan.slug !== "FREE") {
    throw new Error(`Expected initial plan to be FREE, got ${initialSub?.plan.slug}`);
  }

  const freePermissions = await getUserPermissions(vendor.id);
  console.log(`Free Permissions count: ${freePermissions.length}`);

  // 2. Vendor clicks BASIC and initiates checkout
  console.log("\n--- STEP 2: VENDOR INITIATES CHECKOUT FOR BASIC ---");
  const checkoutRes = await checkout(vendor.id, basicPlan.id, "MONTHLY") as any;
  console.log("Checkout result:", JSON.stringify(checkoutRes, null, 2));

  // Verify plan in DB is STILL FREE before payment
  const subBeforePayment = await currentSubscription(vendor.id);
  console.log(`Subscription BEFORE payment verification: Plan=${subBeforePayment?.plan.name}, Status=${subBeforePayment?.status}`);
  if (subBeforePayment?.plan.slug !== "FREE") {
    throw new Error("Plan was changed before payment verification!");
  }

  // 3. Complete payment and verify
  console.log("\n--- STEP 3: VERIFYING PAYMENT FOR BASIC ---");
  const { config } = await createRazorpayClient("PLATFORM");
  const dummyPaymentId = `pay_test_${Date.now()}`;
  const validSignature = crypto
    .createHmac("sha256", config.keySecret)
    .update(`${checkoutRes.orderId}|${dummyPaymentId}`)
    .digest("hex");

  const verifyRes = await verifyPayment(vendor.id, {
    razorpayOrderId: checkoutRes.orderId,
    razorpayPaymentId: dummyPaymentId,
    razorpaySignature: validSignature,
  });

  console.log("Payment verification response:", {
    paymentStatus: verifyRes.payment?.status,
    planName: verifyRes.subscription?.plan?.name,
    planSlug: verifyRes.subscription?.plan?.slug,
    status: verifyRes.subscription?.status,
    startsAt: verifyRes.subscription?.startsAt,
    expiresAt: verifyRes.subscription?.expiresAt,
    salonId: verifyRes.subscription?.salonId,
  });

  if (verifyRes.subscription?.plan?.slug !== "BASIC" || verifyRes.subscription?.status !== "ACTIVE") {
    throw new Error(`Expected active BASIC subscription, got ${verifyRes.subscription?.plan?.slug} / ${verifyRes.subscription?.status}`);
  }

  // 4. Verify current subscription from DB
  console.log("\n--- STEP 4: VERIFY CURRENT SUBSCRIPTION FROM DB ---");
  const activeBasicSub = await currentSubscription(vendor.id);
  console.log(`Current DB Subscription: Plan=${activeBasicSub?.plan.name}, Status=${activeBasicSub?.status}`);
  if (activeBasicSub?.plan.slug !== "BASIC") {
    throw new Error("Database does not reflect BASIC plan!");
  }

  // 5. Verify Effective Permissions & Menus
  console.log("\n--- STEP 5: VERIFY EFFECTIVE PERMISSIONS & MENUS ---");
  const basicPermissions = await getUserPermissions(vendor.id);
  const basicSubPermissions = await getSubscriptionPermissionActions(vendor.id, "VENDOR");
  const basicMenuIds = await subscriptionMenuIds(vendor.id, "VENDOR");
  const basicMenus = await getMenus(
    vendor.roles.map((r) => r.role.name),
    basicPermissions,
    false,
    true,
    basicSubPermissions,
    basicMenuIds
  );

  console.log(`Basic Permissions count: ${basicPermissions.length}`);
  console.log(`Basic Sub Permissions count: ${basicSubPermissions.length}`);
  console.log(`Basic Visible Menus count: ${basicMenus.length}`);
  console.log("Visible Menu Labels:", basicMenus.map((m: any) => m.label));

  if (basicMenus.length === 0) {
    throw new Error("Basic menus are completely empty!");
  }

  // 6. Test Idempotency (calling verifyPayment again)
  console.log("\n--- STEP 6: TEST IDEMPOTENT PAYMENT VERIFICATION ---");
  const duplicateVerify = await verifyPayment(vendor.id, {
    razorpayOrderId: checkoutRes.orderId,
    razorpayPaymentId: dummyPaymentId,
    razorpaySignature: validSignature,
  });
  console.log(`Duplicate verification: Plan=${duplicateVerify.subscription?.plan?.name}, Status=${duplicateVerify.subscription?.status}`);
  if (duplicateVerify.subscription?.plan?.slug !== "BASIC") {
    throw new Error("Idempotent verify returned unexpected plan!");
  }

  // 7. Test cancellation back to FREE
  console.log("\n--- STEP 7: TEST CANCEL SUBSCRIPTION BACK TO FREE ---");
  const cancelRes = await cancel(vendor.id, "Vendor requested cancel");
  const finalSub = await currentSubscription(vendor.id);
  console.log(`After Cancel: Plan=${finalSub?.plan.name} (${finalSub?.plan.slug}), Status=${finalSub?.status}`);
  if (finalSub?.plan.slug !== "FREE") {
    throw new Error("Plan was not reverted to FREE after cancellation!");
  }

  console.log("\n==================================================");
  console.log("   ALL SUBSCRIPTION LIFECYCLE TESTS PASSED!   ");
  console.log("==================================================");
}

runTest()
  .catch((err) => {
    console.error("TEST FAILED:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
