const test = require("node:test");
const assert = require("node:assert/strict");
const { filterMenuTree } = require("../dist/modules/rbac/rbac.service");

const parentId = "payment-wallet-parent";
const actions = [
  "payment-wallet.overview.view",
  "payment-wallet.payments.view",
  "payment-wallet.transactions.view",
  "payment-gateway.view",
  "payment-wallet.refunds.view",
  "payment-wallet.customer-wallet.view",
  "booking-finance.view",
  "booking-finance.wallet.view",
  "booking-finance.configure",
  "booking-finance.approve",
  "booking-finance.settle",
];

const makeMenu = (id, label, permissionActions, parentIdValue = null) => ({
  id,
  label,
  icon: "Wallet",
  path: `/${id}`,
  parentId: parentIdValue,
  order: 1,
  showInSidebar: true,
  audience: "ALL",
  menuPermissions: permissionActions.map((action, index) => ({
    id: `${id}-permission-${index}`,
    menuId: id,
    permissionId: `${action}-id`,
    permission: { id: `${action}-id`, action, description: action },
  })),
});

const financeMenuTree = () => {
  const children = [
    ["Payment Overview", ["payment-wallet.overview.view"], "ADMIN"],
    ["Payments", ["payment-wallet.payments.view"], "ADMIN"],
    ["Payment Transactions", ["payment-wallet.transactions.view"], "ADMIN"],
    ["Payment Gateway", ["payment-gateway.view"], "ADMIN"],
    ["Refunds", ["payment-wallet.refunds.view"], "ADMIN"],
    ["Customer Wallet", ["payment-wallet.customer-wallet.view"], "ADMIN"],
    ["Wallet Overview", ["booking-finance.view", "booking-finance.wallet.view"], "ADMIN"],
    ["Wallet Transactions", ["booking-finance.view", "booking-finance.wallet.view"], "ADMIN"],
    ["Booking Commission", ["booking-finance.view", "booking-finance.configure", "booking-finance.update"], "ADMIN"],
    ["Commission Transactions", ["booking-finance.view"], "ADMIN"],
    ["Pending Settlements", ["booking-finance.view", "booking-finance.wallet.view", "booking-finance.approve", "booking-finance.settle"], "ADMIN"],
    ["Settlement History", ["booking-finance.view"], "ADMIN"],
    ["Settlement Settings", ["booking-finance.view"], "ADMIN"],
    ["Financial Reports", ["booking-finance.view"], "ADMIN"],
    ["Wallet & Transactions", ["booking-finance.wallet.view"], "VENDOR"],
    ["Payout Account", ["booking-finance.payout-account.view"], "VENDOR"],
    ["Payment Gateway", ["payment-gateway.view"], "ADMIN"],
  ].map(([label, permissions, audience], index) => ({
    ...makeMenu(`finance-child-${index}`, label, permissions, parentId),
    order: index + 1,
    audience,
  }));
  return [{
    ...makeMenu(parentId, "Payment & Wallet", ["booking-finance.view", "booking-finance.wallet.view"]),
    path: "/booking-finance",
    children,
  }];
};

test("Payment & Wallet menus require both role and subscription permission", () => {
  const menuIds = [parentId, ...financeMenuTree()[0].children.map(({ id }) => id)];
  const enabled = filterMenuTree(
    financeMenuTree(),
    ["VENDOR"],
    ["payment-wallet.overview.view", "booking-finance.wallet.view"],
    false,
    ["payment-wallet.overview.view", "booking-finance.wallet.view"],
    menuIds,
  );
  assert.equal(enabled.length, 1);
  assert.deepEqual(enabled[0].children.map(({ label }) => label), ["Wallet & Transactions"]);

  const featureDisabled = filterMenuTree(
    financeMenuTree(),
    ["VENDOR"],
    ["payment-wallet.overview.view", "booking-finance.wallet.view"],
    false,
    [],
    menuIds,
  );
  assert.deepEqual(featureDisabled, []);
});

test("Payment & Wallet hides children without role permissions and removes empty parents", () => {
  const menuIds = [parentId, ...financeMenuTree()[0].children.map(({ id }) => id)];
  const unauthorized = filterMenuTree(
    financeMenuTree(),
    ["STAFF"],
    [],
    false,
    actions,
    menuIds,
  );
  assert.deepEqual(unauthorized, []);

  const singlePermission = filterMenuTree(
    financeMenuTree(),
    ["ADMIN"],
    ["payment-wallet.overview.view"],
    false,
    actions,
    menuIds,
  );
  assert.deepEqual(singlePermission.map(({ label, children }) => ({
    label,
    children: children.map(({ label: childLabel }) => childLabel),
  })), [{
    label: "Payment & Wallet",
    children: ["Payment Overview"],
  }]);

  const adminOnlyGrant = filterMenuTree(
    financeMenuTree(),
    ["VENDOR"],
    ["payment-wallet.overview.view"],
  );
  assert.deepEqual(adminOnlyGrant, []);
});

test("vendor finance menu audience excludes Admin and requires its specific permission", () => {
  const menus = [{
    ...makeMenu(parentId, "Payment & Wallet", ["booking-finance.view"]),
    path: "/booking-finance",
    children: [
      { ...makeMenu("vendor-wallet", "Wallet & Transactions", ["booking-finance.wallet.view"], parentId), path: "/vendor/finance/wallet", audience: "VENDOR" },
      { ...makeMenu("vendor-payout", "Payout Account", ["booking-finance.payout-account.view"], parentId), path: "/vendor/finance/payout-account", audience: "VENDOR" },
      { ...makeMenu("vendor-gateway", "Payment Gateway", ["payment-gateway.view"], parentId), path: "/vendor/payment-gateway", audience: "ADMIN" },
      { ...makeMenu("admin-wallet", "Wallet Overview", ["booking-finance.view"], parentId), audience: "ADMIN" },
    ],
  }];

  const vendorMenus = filterMenuTree(
    menus,
    ["VENDOR"],
    ["booking-finance.wallet.view", "booking-finance.payout-account.manage", "booking-finance.payout-account.view", "booking-finance.view"],
  );
  assert.deepEqual(vendorMenus[0].children.map(({ label }) => label), [
    "Wallet & Transactions",
    "Payout Account",
  ]);

  const vendorWithoutPayoutPermission = filterMenuTree(
    menus,
    ["VENDOR"],
    ["booking-finance.wallet.view", "booking-finance.view"],
  );
  assert.deepEqual(vendorWithoutPayoutPermission[0].children.map(({ label }) => label), [
    "Wallet & Transactions",
  ]);

  const vendorGatewayOnly = filterMenuTree(
    menus,
    ["VENDOR"],
    ["payment-gateway.view"],
  );
  assert.deepEqual(vendorGatewayOnly, []);

  const adminMenus = filterMenuTree(
    menus,
    ["ADMIN"],
    ["booking-finance.wallet.view", "booking-finance.payout-account.manage", "booking-finance.payout-account.view", "booking-finance.view"],
  );
  assert.deepEqual(adminMenus[0].children.map(({ label }) => label), ["Wallet Overview"]);

  const superAdminMenus = filterMenuTree(
    menus,
    ["SUPER_ADMIN"],
    ["booking-finance.wallet.view", "booking-finance.payout-account.manage", "booking-finance.payout-account.view", "booking-finance.view"],
  );
  assert.deepEqual(superAdminMenus[0].children.map(({ label }) => label), ["Wallet Overview"]);
});

test("admin fetchAll retains the complete menu tree and permission metadata", () => {
  const menus = financeMenuTree();
  const result = filterMenuTree(menus, ["ADMIN"], [], true);
  assert.equal(result[0].children.length, 17);
  assert.deepEqual(result[0].children.map(({ label }) => label), [
    "Payment Overview",
    "Payments",
    "Payment Transactions",
    "Payment Gateway",
    "Refunds",
    "Customer Wallet",
    "Wallet Overview",
    "Wallet Transactions",
    "Booking Commission",
    "Commission Transactions",
    "Pending Settlements",
    "Settlement History",
    "Settlement Settings",
    "Financial Reports",
    "Wallet & Transactions",
    "Payout Account",
    "Payment Gateway",
  ]);
  assert.equal(result[0].children[10].menuPermissions.length, 4);
});
