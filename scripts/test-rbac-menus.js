const { getMenus, getUserPermissions } = require("../dist/modules/rbac/rbac.service");
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function run() {
  console.log("=== TESTING RBAC GETMENUS ===");

  // 1. Admin fetchAll=true (Access Control Matrix)
  const adminMenusMatrix = await getMenus(["ADMIN"], ["coupons.view"], true, false);
  const adminCouponMatrix = adminMenusMatrix.find(m => m.path === "/coupons");
  console.log("Admin Matrix - Coupons Menu:", {
    label: adminCouponMatrix.label,
    path: adminCouponMatrix.path,
    children: adminCouponMatrix.children
  });

  // 2. Admin fetchAll=false (Admin Sidebar)
  const adminMenusSidebar = await getMenus(["ADMIN"], ["coupons.view"], false, true);
  const adminCouponSidebar = adminMenusSidebar.find(m => m.path === "/coupons");
  console.log("Admin Sidebar - Coupons Menu:", {
    label: adminCouponSidebar.label,
    path: adminCouponSidebar.path,
    children: adminCouponSidebar.children
  });

  // 3. Vendor fetchAll=false (Vendor Sidebar)
  const vendorUser = await prisma.user.findFirst({
    where: { roles: { some: { role: { name: "VENDOR" } } } }
  });
  if (vendorUser) {
    const vendorPerms = await getUserPermissions(vendorUser.id);
    const vendorMenusSidebar = await getMenus(["VENDOR"], vendorPerms, false, true);
    const vendorCouponSidebar = vendorMenusSidebar.find(m => m.path === "/coupons");
    console.log(`Vendor (${vendorUser.email}) Sidebar - Coupons Menu:`, vendorCouponSidebar ? {
      label: vendorCouponSidebar.label,
      path: vendorCouponSidebar.path,
      children: vendorCouponSidebar.children
    } : "Not visible");
  }

  console.log("=== TEST FINISHED SUCCESSFULLY ===");
}

run().catch(console.error).finally(async () => {
  await prisma.$disconnect();
});

