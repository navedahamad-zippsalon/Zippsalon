const test = require("node:test");
const assert = require("node:assert/strict");
const { registerSchema } = require("../dist/modules/auth/auth.validation");
const {
  createManagedUserSchema,
  replaceUserAccessSchema,
} = require("../dist/modules/user-management/user-management.validation");

test("public registration accepts salon details and strips any client role", () => {
  const parsed = registerSchema.parse({
    firstName: "Rahul",
    email: "Rahul@example.test",
    password: "StrongPassword@123",
    confirmPassword: "StrongPassword@123",
    phone: "9876543210",
    countryCode: "+91",
    source: "WEBSITE",
    role: "ADMIN",
    salonName: "Glow Studio",
    salonType: "Salon",
    address: "12 Main Road",
    city: "Mumbai",
    state: "Maharashtra",
    country: "India",
    postalCode: "400001",
  });

  assert.equal(parsed.email, "rahul@example.test");
  assert.equal(parsed.role, undefined);
  assert.equal(parsed.salonName, "Glow Studio");
});

test("public registration rejects mismatched confirmation and incomplete salon address", () => {
  const base = {
    firstName: "Rahul",
    email: "rahul@example.test",
    password: "StrongPassword@123",
    phone: "9876543210",
    countryCode: "+91",
  };

  assert.equal(registerSchema.safeParse({ ...base, confirmPassword: "different" }).success, false);
  assert.equal(registerSchema.safeParse({ ...base, address: "12 Main Road", city: "Mumbai" }).success, false);
});

test("managed users require a salon, safe role, password, and unique branch scope", () => {
  const user = {
    firstName: "Rahul",
    email: "Rahul@example.test",
    phone: "9876543210",
    countryCode: "+91",
    password: "StrongPassword@123",
    roleName: "MANAGER",
    salonId: "00000000-0000-4000-8000-000000000001",
  };

  const parsed = createManagedUserSchema.parse(user);
  assert.equal(parsed.email, "rahul@example.test");
  assert.deepEqual(parsed.branchIds, []);
  assert.equal(createManagedUserSchema.safeParse({ ...user, roleName: "ADMIN" }).success, false);
  assert.equal(createManagedUserSchema.safeParse({ ...user, branchIds: [user.salonId, user.salonId] }).success, false);
});

test("access scope rejects duplicate or self-referential branch assignments", () => {
  const salonId = "00000000-0000-4000-8000-000000000001";
  assert.equal(replaceUserAccessSchema.safeParse({ salonId, branchIds: [salonId] }).success, false);
  assert.equal(replaceUserAccessSchema.safeParse({ salonId, branchIds: [salonId, salonId] }).success, false);
});
