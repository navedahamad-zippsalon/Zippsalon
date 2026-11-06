const test = require("node:test");
const assert = require("node:assert/strict");
const jwt = require("jsonwebtoken");

process.env.NODE_ENV = "test";
process.env.CUSTOMER_OTP_EXPOSE_TEST = "true";
process.env.JWT_SECRET ||= "customer-otp-test-secret";

const { prisma } = require("../dist/infrastructure/database/prisma");
const smtp = require("../dist/modules/delivery/smtp.service");
const whatsapp = require("../dist/modules/delivery/whatsapp-config.service");
smtp.sendMail = async () => undefined;
whatsapp.sendOtp = async () => undefined;
const customerAuth = require("../dist/modules/customer-auth/customer-auth.service");

const suffix = `${Date.now()}-${Math.floor(Math.random() * 100000)}`;
const email = `customer-otp-${suffix}@example.test`;
const phone = `+9198${String(Date.now()).slice(-8)}`;
let customerId;

test.before(async () => {
  const salon = await prisma.salon.findFirst({ where: { isActive: true }, select: { id: true } });
  assert.ok(salon, "An active salon is required for the customer OTP test");
  const customer = await prisma.user.create({
    data: {
      firstName: "OTP", lastName: "Customer", email, phone, countryCode: "+91",
      password: "not-used-for-otp", source: "CUSTOMER", isActive: false,
      salonCustomers: { create: { salonId: salon.id } },
    },
  });
  customerId = customer.id;
});

test.after(async () => {
  if (!customerId) return;
  await prisma.customerOtpChallenge.deleteMany({ where: { userId: customerId } });
  await prisma.userRole.deleteMany({ where: { userId: customerId } });
  await prisma.salonCustomer.deleteMany({ where: { userId: customerId } });
  await prisma.user.delete({ where: { id: customerId } });
  await prisma.$disconnect();
});

test("customer email and WhatsApp OTPs authenticate the customer bound to their challenge", async () => {
  const emailChallenge = await customerAuth.requestOtp("EMAIL", `  ${email.toUpperCase()}  `);
  assert.match(emailChallenge.testOtp, /^\d{6}$/);
  const emailLogin = await customerAuth.verifyOtp("EMAIL", email.toUpperCase(), emailChallenge.testOtp, emailChallenge.challengeId);
  assert.equal(emailLogin.customer.id, customerId);
  assert.equal(emailLogin.customer.email, email);
  assert.equal(jwt.verify(emailLogin.accessToken, process.env.JWT_SECRET).userId, customerId);

  await assert.rejects(
    () => customerAuth.requestOtp("EMAIL", email),
    (error) => error.code === "OTP_RATE_LIMITED",
  );

  const whatsappChallenge = await customerAuth.requestOtp("WHATSAPP", phone.slice(1));
  const whatsappLogin = await customerAuth.verifyOtp("WHATSAPP", phone, whatsappChallenge.testOtp, whatsappChallenge.challengeId);
  assert.equal(whatsappLogin.customer.id, customerId);
  assert.equal(whatsappLogin.customer.phone, phone);
  assert.ok(whatsappLogin.permissions.includes("customer.profile.view"));
});

test("incorrect and expired OTPs remain rejected", async () => {
  await prisma.customerOtpChallenge.updateMany({
    where: { userId: customerId },
    data: { createdAt: new Date(Date.now() - 31_000) },
  });
  const invalid = await customerAuth.requestOtp("EMAIL", email);
  await assert.rejects(
    () => customerAuth.verifyOtp("EMAIL", email, invalid.testOtp === "000000" ? "000001" : "000000"),
    (error) => error.code === "INVALID_OTP" && error.message === "Invalid verification code",
  );

  await prisma.customerOtpChallenge.updateMany({
    where: { userId: customerId, channel: "EMAIL", consumedAt: null },
    data: { expiresAt: new Date(Date.now() - 1_000) },
  });
  await assert.rejects(
    () => customerAuth.verifyOtp("EMAIL", email, invalid.testOtp),
    (error) => error.code === "OTP_EXPIRED" && error.message === "Verification code has expired. Please request a new code.",
  );
});
