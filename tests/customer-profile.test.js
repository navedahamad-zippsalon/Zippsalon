const test = require("node:test");
const assert = require("node:assert/strict");
const { Gender } = require("@prisma/client");
const { getMissingCustomerProfileFields } = require("../dist/modules/customer/customer-profile.service");
const { swaggerSpec } = require("../dist/config/swagger");

const completeProfile = {
  firstName: "Asha",
  lastName: "Sharma",
  dob: new Date("1990-04-15T00:00:00.000Z"),
  gender: Gender.FEMALE,
  passwordConfigured: true,
  customerAddresses: [{
    addressLine1: "12 Example Road",
    city: "Pune",
    state: "Maharashtra",
    country: "India",
    postalCode: "411001",
  }],
};

test("a persisted complete customer profile has no missing onboarding fields", () => {
  assert.deepEqual(getMissingCustomerProfileFields(completeProfile), []);
});

test("profile completion rejects invalid dates, names, Indian PINs, and unset passwords", () => {
  const missing = getMissingCustomerProfileFields({
    ...completeProfile,
    firstName: " A ",
    dob: new Date(Date.now() + 24 * 60 * 60 * 1000),
    passwordConfigured: false,
    customerAddresses: [{ ...completeProfile.customerAddresses[0], postalCode: "12345" }],
  });
  assert.deepEqual(missing, ["firstName", "dob", "primaryAddress", "password"]);
});

test("the authenticated initial password API is present in OpenAPI docs", () => {
  const operation = swaggerSpec.paths["/api/v1/customer/auth/setup-password"].post;
  assert.ok(operation);
  assert.deepEqual(operation.requestBody.content["application/json"].schema.required, ["password", "confirmPassword"]);
  assert.deepEqual(operation.security, [{ bearerAuth: [] }]);

  const otpVerification = swaggerSpec.paths["/api/v1/customer/auth/otp/email/verify"].post;
  assert.deepEqual(otpVerification.security, []);
  assert.match(otpVerification.responses["200"].description, /profileCompleted/);
  assert.match(swaggerSpec.paths["/api/v1/customer/me"].get.responses["200"].description, /missingFields/);
});
