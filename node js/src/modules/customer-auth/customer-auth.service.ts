import crypto from "crypto";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { prisma } from "../../infrastructure/database/prisma";
import { getUserPermissions } from "../rbac/rbac.service";
import { normalizePhone as normalizeE164Phone } from "../whatsapp/utils/phone";
import { sendMail } from "../delivery/smtp.service";
import { sendOtp as sendWhatsAppOtp } from "../delivery/whatsapp-config.service";
import { ConfigurationScope } from "../delivery/smtp.service";

const JWT_SECRET = process.env.JWT_SECRET as string;
const OTP_TTL_MS = 5 * 60 * 1000;
const OTP_MAX_ATTEMPTS = 5;
const CUSTOMER_PERMISSIONS = [
  "customer.profile.view", "customer.profile.update", "customer.services.view", "customer.products.view",
  "customer.bookings.view", "customer.bookings.create", "customer.bookings.cancel", "customer.feed.view", "customer.stories.view",
] as const;

const hashOtp = (code: string) => crypto.createHmac("sha256", JWT_SECRET).update(code).digest("hex");
const randomOtp = () => String(crypto.randomInt(100000, 1000000));
const normalizeEmail = (email?: string) => email?.trim().toLowerCase() || undefined;
/**
 * Customer contact numbers are stored in E.164 form.  In particular, accept
 * the common Indian representations `9876543210`, `919876543210`, and
 * `+919876543210` as the same identifier.  The generic WhatsApp helper treats
 * a number without `+` as local, so passing `91...` to it directly would add
 * the country code a second time.
 */
const normalizePhone = (phone?: string) => {
  if (!phone) return undefined;
  const compact = phone.trim().replace(/[\s().-]/g, "");
  const digits = compact.replace(/^\+/, "").replace(/^00/, "");
  const canonical = compact.startsWith("+") || compact.startsWith("00")
    ? `+${digits}`
    : /^91\d{10}$/.test(digits) ? `+${digits}` : compact;
  return normalizeE164Phone(canonical);
};
const ipRequests = new Map<string, number[]>();
function enforceIpRateLimit(ip?: string) {
  if (!ip) return;
  const now = Date.now(); const recent = (ipRequests.get(ip) ?? []).filter((time) => time > now - 15 * 60 * 1000);
  if (recent.length >= 10) throw { status: 429, code: "OTP_RATE_LIMITED", message: "Too many OTP requests. Please try again later." };
  recent.push(now); ipRequests.set(ip, recent);
}

async function ensureCustomerRole() {
  const role = await prisma.role.upsert({ where: { name: "CUSTOMER" }, update: { isActive: true }, create: { name: "CUSTOMER" } });
  const permissions = await Promise.all(CUSTOMER_PERMISSIONS.map((action) => prisma.permission.upsert({ where: { action }, update: {}, create: { action, description: `Customer access: ${action}` } })));
  await prisma.rolePermission.createMany({ data: permissions.map((permission) => ({ roleId: role.id, permissionId: permission.id })), skipDuplicates: true });
  return role;
}

async function validateSalon(vendorId: string, branchId?: string) {
  const salon = branchId
    ? await prisma.salon.findFirst({ where: { id: branchId, parentId: { not: null }, isActive: true, parent: { ownerId: vendorId, isActive: true } } })
    : await prisma.salon.findFirst({ where: { ownerId: vendorId, parentId: null, isActive: true } });
  if (!salon) throw { status: 400, code: "INVALID_SALON_OR_BRANCH", message: "The selected salon or branch is invalid." };
  return salon;
}

async function issueChallenge(userId: string, channel: "EMAIL" | "WHATSAPP", email?: string, phone?: string, ip?: string, configurationScope: ConfigurationScope = {}) {
  enforceIpRateLimit(ip);
  const identifierWhere = email ? { email } : { phone };
  const cooldown = await prisma.customerOtpChallenge.findFirst({ where: { userId, channel, ...identifierWhere }, orderBy: { createdAt: "desc" } });
  if (cooldown && cooldown.createdAt > new Date(Date.now() - 30 * 1000)) throw { status: 429, code: "OTP_RATE_LIMITED", message: "Please wait before requesting another OTP." };
  const recent = await prisma.customerOtpChallenge.count({ where: { userId, channel, ...(email ? { email } : { phone }), createdAt: { gt: new Date(Date.now() - 15 * 60 * 1000) } } });
  if (recent >= 3) throw { status: 429, code: "OTP_RATE_LIMITED", message: "Too many OTP requests. Please try again later." };
  const code = randomOtp();
  await prisma.customerOtpChallenge.updateMany({ where: { userId, channel, ...(email ? { email } : { phone }), consumedAt: null }, data: { consumedAt: new Date() } });
  const challenge = await prisma.customerOtpChallenge.create({ data: { userId, channel, email, phone, codeHash: hashOtp(code), expiresAt: new Date(Date.now() + OTP_TTL_MS) } });
  try {
    if (channel === "WHATSAPP") {
      await sendWhatsAppOtp(phone!, code, configurationScope);
    } else {
      await sendMail({ to: email!, subject: "Your Zippsalon verification code", text: `Your Zippsalon verification code is ${code}. It expires in 5 minutes.`, html: `<p>Your Zippsalon verification code is <strong>${code}</strong>.</p><p>It expires in 5 minutes.</p>` }, configurationScope);
    }
  } catch (error: any) {
    await prisma.customerOtpChallenge.update({ where: { id: challenge.id }, data: { consumedAt: new Date() } });
    throw error?.code ? error : { status: 503, code: "OTP_PROVIDER_UNAVAILABLE", message: "OTP delivery is temporarily unavailable." };
  }
  return { accepted: true, challengeId: challenge.id, expiresInSeconds: OTP_TTL_MS / 1000, ...(process.env.NODE_ENV === "test" && process.env.CUSTOMER_OTP_EXPOSE_TEST === "true" ? { testOtp: code } : {}) };
}

export async function register(input: { firstName: string; lastName?: string; email: string; phone: string; countryCode: string; vendorId: string; branchId?: string }) {
  const email = normalizeEmail(input.email)!; const phone = normalizePhone(input.phone)!;
  const salon = await validateSalon(input.vendorId, input.branchId);
  const existing = await prisma.user.findFirst({ where: { OR: [{ email }, { phone }] }, include: { roles: { include: { role: true } } } });
  if (existing) throw { status: 409, code: "CUSTOMER_ALREADY_EXISTS", message: "A customer account already exists for this email or phone." };
  const role = await ensureCustomerRole();
  const password = await bcrypt.hash(crypto.randomBytes(32).toString("hex"), 10);
  const user = await prisma.$transaction(async (tx) => {
    const created = await tx.user.create({ data: { firstName: input.firstName, lastName: input.lastName, email, phone, countryCode: input.countryCode, password, source: "CUSTOMER", isActive: false } });
    await tx.userRole.create({ data: { userId: created.id, roleId: role.id } });
    await tx.salonCustomer.create({ data: { userId: created.id, salonId: salon.id } });
    return created;
  });
  return { userId: user.id, ...(await issueChallenge(user.id, "EMAIL", email)) };
}

export async function requestOtp(channel: "EMAIL" | "WHATSAPP", identifier: string, ip?: string) {
  const email = channel === "EMAIL" ? normalizeEmail(identifier) : undefined;
  const phone = channel === "WHATSAPP" ? normalizePhone(identifier) : undefined;
  const user = await prisma.user.findFirst({
    // Resolve a contact only within an active customer-salon relationship.
    // A staff/vendor record with the same non-unique phone must not shadow the
    // intended customer record.
    where: { AND: [email ? { email } : { phone }, { salonCustomers: { some: { salon: { isActive: true } } } }] },
    include: { roles: { include: { role: true } }, salonCustomers: { where: { salon: { isActive: true } }, select: { salonId: true, salon: { select: { ownerId: true } } }, take: 1 } },
  });
  // A salon-customer mapping is the source of truth for customer eligibility.
  // Do not issue an unbound challenge and then try to discover/create an
  // account during verification.
  if (!user || !user.salonCustomers.length) {
    throw { status: 404, code: "CUSTOMER_NOT_FOUND", message: "No customer account is registered for these contact details." };
  }
  const membership = user.salonCustomers[0];
  return issueChallenge(user.id, channel, email, phone, ip, membership ? { vendorId: membership.salon.ownerId, salonId: membership.salonId } : {});
}

export async function verifyOtp(channel: "EMAIL" | "WHATSAPP", identifier: string, code: string, challengeId?: string) {
  const email = channel === "EMAIL" ? normalizeEmail(identifier) : undefined;
  const phone = channel === "WHATSAPP" ? normalizePhone(identifier) : undefined;
  const challenge = challengeId
    ? await prisma.customerOtpChallenge.findUnique({ where: { id: challengeId } })
    : await prisma.customerOtpChallenge.findFirst({ where: { channel, ...(email ? { email } : { phone }), consumedAt: null }, orderBy: { createdAt: "desc" } });
  const matchesIdentifier = challenge && challenge.channel === channel && (email ? challenge.email === email : challenge.phone === phone);
  if (!challenge || !matchesIdentifier || challenge.consumedAt) throw { status: 400, code: "INVALID_OTP", message: "Invalid verification code" };
  if (challenge.expiresAt <= new Date()) throw { status: 400, code: "OTP_EXPIRED", message: "Verification code has expired. Please request a new code." };
  if (challenge.attempts >= OTP_MAX_ATTEMPTS) throw { status: 400, code: "OTP_MAX_ATTEMPTS", message: "Maximum OTP verification attempts exceeded." };
  if (challenge.codeHash !== hashOtp(code)) {
    const updated = await prisma.customerOtpChallenge.update({ where: { id: challenge.id }, data: { attempts: { increment: 1 } } });
    if (updated.attempts >= OTP_MAX_ATTEMPTS) throw { status: 400, code: "OTP_MAX_ATTEMPTS", message: "Maximum OTP verification attempts exceeded." };
    throw { status: 400, code: "INVALID_OTP", message: "Invalid verification code" };
  }
  // The challenge's userId was fixed when the OTP was requested.  Never run a
  // second email/phone lookup here: it could select a different account and
  // was the source of the false account-conflict error.
  const user = challenge.userId
    ? await prisma.user.findUnique({ where: { id: challenge.userId }, include: { roles: { include: { role: true } }, salonCustomers: { where: { salon: { isActive: true } }, select: { salonId: true } } } })
    : null;
  if (!user || !user.salonCustomers.length) {
    throw { status: 403, code: "CUSTOMER_SALON_ACCESS_DENIED", message: "This customer is not associated with an active salon." };
  }
  const customerRole = await ensureCustomerRole();
  if (!user.roles.some(({ role }) => role.name === "CUSTOMER")) {
    await prisma.userRole.createMany({ data: [{ userId: user.id, roleId: customerRole.id }], skipDuplicates: true });
  }
  // Claim the one-time challenge atomically so simultaneous verify requests
  // cannot both receive a session from the same code.
  await prisma.$transaction(async (tx) => {
    const claimed = await tx.customerOtpChallenge.updateMany({ where: { id: challenge.id, consumedAt: null }, data: { consumedAt: new Date() } });
    if (claimed.count !== 1) throw { status: 400, code: "INVALID_OTP", message: "Invalid verification code" };
    await tx.user.update({ where: { id: user.id }, data: { isActive: true } });
  });
  const permissions = await getUserPermissions(user.id);
  const trackingSessionId = crypto.randomUUID();
  const token = jwt.sign({ userId: user.id, roles: ["CUSTOMER"], trackingSessionId }, JWT_SECRET, { expiresIn: "7d" });
  const customer = { id: user.id, accountType: "CUSTOMER", firstName: user.firstName, lastName: user.lastName, email: user.email, phone: user.phone, countryCode: user.countryCode };
  return { accessToken: token, token, user: customer, customer, permissions, trackingSessionId };
}

export const customerPermissions = [...CUSTOMER_PERMISSIONS];
