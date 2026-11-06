import crypto from "crypto";
import { isIP } from "net";
import axios from "axios";
import { Prisma, TrackingActorType, TrackingSessionStatus } from "@prisma/client";
import type { Request } from "express";
import { prisma } from "../../infrastructure/database/prisma";
import logger from "../../infrastructure/logger/logger";

const ACTIVE_WINDOW_SECONDS = Math.max(30, Number(process.env.TRACKING_ACTIVE_WINDOW_SECONDS) || 120);
const STALE_SESSION_SECONDS = Math.max(ACTIVE_WINDOW_SECONDS, Number(process.env.TRACKING_SESSION_TIMEOUT_SECONDS) || 1800);
const GEO_URL = process.env.TRACKING_GEOLOCATION_URL?.trim();
const geoCache = new Map<string, { expiresAt: number; location: GeoLocation | null }>();
let lastCleanupAt = 0;
let lastRetentionCleanupAt = 0;

type GeoLocation = {
  country?: string;
  countryCode?: string;
  state?: string;
  city?: string;
  latitude?: number;
  longitude?: number;
  timezone?: string;
  provider?: string;
};

type ActorContext = {
  userId: string;
  actorType: TrackingActorType;
  vendorId: string | null;
  staffId: string | null;
  customerId: string | null;
  salonId: string | null;
  branchId: string | null;
  roleId: string | null;
};

export type TrackingEvent = {
  eventType: string;
  action?: string;
  menuId?: string;
  route?: string;
  screenName?: string;
  method?: string;
  entityType?: string;
  entityId?: string;
  status?: string;
  durationMs?: number;
  metadata?: Record<string, string | number | boolean | null>;
};

const requestIp = (req: Request) => {
  const ip = req.ip?.replace(/^::ffff:/, "");
  return ip && ip.length <= 64 ? ip : null;
};

export function isPublicIpAddress(ip: string) {
  const version = isIP(ip);
  if (version === 4) {
    const [a, b, c] = ip.split(".").map(Number);
    return !(a === 0 || a === 10 || a === 127 || a >= 224 || (a === 100 && b >= 64 && b <= 127) ||
      (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && (b === 168 || b === 0 || (b === 88 && c === 99))) ||
      (a === 198 && (b === 18 || b === 19 || (b === 51 && c === 100))) ||
      (a === 203 && b === 0 && c === 113));
  }
  if (version === 6) {
    const normalized = ip.toLowerCase();
    return (normalized.startsWith("2") || normalized.startsWith("3")) && !normalized.startsWith("2001:db8");
  }
  return false;
}

export const parseClientInfo = (req: Request) => {
  const rawUserAgent = req.get("user-agent")?.slice(0, 512) ?? null;
  const userAgent = rawUserAgent
    ?.replace(/bearer\s+[a-z0-9._-]+/gi, "[redacted]")
    .replace(/eyJ[a-z0-9_-]+\.[a-z0-9_-]+\.[a-z0-9_-]+/gi, "[redacted]")
    .replace(/(token|secret|key)=([^;\s]+)/gi, "$1=[redacted]") ?? null;
  const ua = userAgent ?? "";
  const deviceType = /iPad|Tablet|PlayBook|Silk/i.test(ua) ? "TABLET"
    : /Mobile|Android|iPhone|iPod|Windows Phone/i.test(ua) ? "MOBILE" : "DESKTOP";
  const operatingSystem = /Windows/i.test(ua) ? "Windows"
    : /Android/i.test(ua) ? "Android"
    : /iPhone|iPad|iPod/i.test(ua) ? "iOS"
    : /Mac OS X|Macintosh/i.test(ua) ? "macOS"
    : /Linux/i.test(ua) ? "Linux" : "Unknown";
  const browser = /Edg\//i.test(ua) ? "Edge"
    : /Firefox\//i.test(ua) ? "Firefox"
    : /CriOS|Chrome\//i.test(ua) ? "Chrome"
    : /Safari\//i.test(ua) && !/Chrome|CriOS/i.test(ua) ? "Safari"
    : /; wv\)|WebView/i.test(ua) ? "WebView" : null;
  return {
    userAgent,
    deviceType,
    operatingSystem,
    browser,
    appVersion: /^[A-Za-z0-9.+_-]{1,64}$/.test(req.get("x-app-version") ?? "")
      ? req.get("x-app-version")! : null,
    deviceName: null,
  };
};

async function actorContext(userId: string): Promise<ActorContext | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      roles: { where: { role: { isActive: true } }, select: { roleId: true, role: { select: { name: true } } } },
      ownedSalons: { where: { isActive: true, parentId: null }, take: 1, select: { id: true } },
      staffIn: {
        where: { isActive: true },
        orderBy: { createdAt: "asc" },
        take: 1,
        select: { id: true, staffRoleId: true, salonId: true, salon: { select: { ownerId: true, parentId: true } } },
      },
      salonCustomers: { take: 1, select: { id: true, salonId: true, salon: { select: { parentId: true, ownerId: true } } } },
    },
  });
  if (!user) return null;
  const adminRole = user.roles.find(({ role }) => role.name === "ADMIN" || role.name === "SUPER_ADMIN");
  if (adminRole) return { userId, actorType: TrackingActorType.ADMIN, vendorId: null, staffId: null, customerId: null, salonId: null, branchId: null, roleId: adminRole.roleId };
  const role = user.roles.find(({ role }) => role.name === "VENDOR");
  if (role) return { userId, actorType: TrackingActorType.VENDOR, vendorId: userId, staffId: null, customerId: null, salonId: user.ownedSalons[0]?.id ?? null, branchId: null, roleId: role.roleId };
  const membership = user.staffIn[0];
  if (membership) {
    return {
      userId,
      actorType: TrackingActorType.STAFF,
      vendorId: membership.salon.ownerId,
      staffId: membership.id,
      customerId: null,
      salonId: membership.salon.parentId ?? membership.salonId,
      branchId: membership.salon.parentId ? membership.salonId : null,
      roleId: membership.staffRoleId ?? user.roles[0]?.roleId ?? null,
    };
  }
  if (user.salonCustomers.length || user.roles.some(({ role }) => role.name === "CUSTOMER")) {
    const membership = user.salonCustomers[0];
    return { userId, actorType: TrackingActorType.CUSTOMER, vendorId: membership?.salon.ownerId ?? null, staffId: null, customerId: userId, salonId: membership ? membership.salon.parentId ?? membership.salonId : null, branchId: membership?.salon.parentId ? membership.salonId : null, roleId: user.roles.find(({ role }) => role.name === "CUSTOMER")?.roleId ?? null };
  }
  return null;
}

async function resolveLocation(ipAddress: string): Promise<GeoLocation | null> {
  if (!GEO_URL || !isPublicIpAddress(ipAddress)) return null;
  const cached = geoCache.get(ipAddress);
  if (cached && cached.expiresAt > Date.now()) return cached.location;
  const url = GEO_URL.split("{ip}").join(encodeURIComponent(ipAddress));
  let response;
  try {
    response = await axios.get(url, { timeout: 3000, headers: { Accept: "application/json" } });
  } catch (error) {
    geoCache.set(ipAddress, { expiresAt: Date.now() + 5 * 60 * 1000, location: null });
    throw error;
  }
  const data = response.data as Record<string, unknown>;
  const numeric = (value: unknown) => typeof value === "number" && Number.isFinite(value) ? value : undefined;
  const text = (value: unknown) => typeof value === "string" && value.length <= 120 ? value : undefined;
  const timezoneValue = data.timezone;
  const timezone = typeof timezoneValue === "string"
    ? text(timezoneValue)
    : timezoneValue && typeof timezoneValue === "object"
      ? text((timezoneValue as Record<string, unknown>).id)
      : undefined;
  const location: GeoLocation = {
    country: text(data.country_name) ?? text(data.country),
    countryCode: text(data.country_code) ?? text(data.countryCode),
    state: text(data.region) ?? text(data.region_name) ?? text(data.regionName),
    city: text(data.city),
    latitude: numeric(data.latitude) ?? numeric(data.lat),
    longitude: numeric(data.longitude) ?? numeric(data.lon),
    timezone,
    provider: new URL(url).hostname,
  };
  const hasLocation = Boolean(location.country || location.city || location.state || location.latitude !== undefined);
  geoCache.set(ipAddress, { expiresAt: Date.now() + 60 * 60 * 1000, location: hasLocation ? location : null });
  if (!hasLocation) return null;
  return location;
}

function updateLocationLater(sessionId: string, ipAddress: string | null) {
  if (!ipAddress || !GEO_URL) return;
  void resolveLocation(ipAddress).then(async (location) => {
    if (!location) return;
    await prisma.userTrackingSession.updateMany({
      where: { sessionId, locationSource: "UNKNOWN" },
      data: {
        country: location.country,
        countryCode: location.countryCode,
        state: location.state,
        city: location.city,
        latitude: location.latitude,
        longitude: location.longitude,
        timezone: location.timezone,
        locationProvider: location.provider,
        locationSource: "IP_GEOLOCATION",
      },
    });
    await prisma.userTrackingActivity.updateMany({
      where: { sessionId },
      data: {
        country: location.country,
        state: location.state,
        city: location.city,
      },
    });
  }).catch(() => logger.warn("tracking_geolocation_failed", { sessionId }));
}

async function cleanupStaleSessions(force = false) {
  const now = Date.now();
  if (!force && now - lastCleanupAt < 15 * 60 * 1000) return;
  lastCleanupAt = now;
  const cutoff = new Date(now - STALE_SESSION_SECONDS * 1000);
  await prisma.$executeRaw`
    WITH expired AS (
      UPDATE "UserTrackingSession"
      SET "status" = 'EXPIRED',
          "logoutAt" = "lastActivityAt",
          "totalDurationSeconds" = GREATEST(0, FLOOR(EXTRACT(EPOCH FROM ("lastActivityAt" - "loginAt")))::int),
          "updatedAt" = CURRENT_TIMESTAMP
      WHERE "status" = 'ACTIVE' AND "lastActivityAt" < ${cutoff}
      RETURNING "userId", "actorType", "vendorId", "staffId", "customerId", "salonId", "branchId", "roleId", "sessionId", "ipAddress", "country", "state", "city"
    )
    INSERT INTO "UserTrackingActivity" ("id", "userId", "actorType", "vendorId", "staffId", "customerId", "salonId", "branchId", "roleId", "sessionId", "eventType", "action", "status", "ipAddress", "country", "state", "city", "createdAt")
    SELECT gen_random_uuid()::text, "userId", "actorType", "vendorId", "staffId", "customerId", "salonId", "branchId", "roleId", "sessionId", 'SESSION_EXPIRED', 'SESSION_EXPIRED', 'EXPIRED', "ipAddress", "country", "state", "city", CURRENT_TIMESTAMP
    FROM expired
  `;
  const retentionDays = Number(process.env.TRACKING_RETENTION_DAYS);
  if (Number.isInteger(retentionDays) && retentionDays > 0 && now - lastRetentionCleanupAt >= 24 * 60 * 60 * 1000) {
    lastRetentionCleanupAt = now;
    const retentionCutoff = new Date(now - retentionDays * 86400000);
    await prisma.$executeRaw`
      DELETE FROM "UserTrackingActivity" a
      WHERE a."createdAt" < ${retentionCutoff}
        AND NOT EXISTS (
          SELECT 1 FROM "UserTrackingSession" s
          WHERE s."sessionId" = a."sessionId" AND s."status" = 'ACTIVE'
        )
    `;
    await prisma.userTrackingSession.deleteMany({ where: { status: { in: [TrackingSessionStatus.LOGGED_OUT, TrackingSessionStatus.EXPIRED] }, loginAt: { lt: retentionCutoff } } });
  }
}

export async function createLoginSession(userId: string, sessionId: string, req: Request) {
  const actor = await actorContext(userId);
  if (!actor) return null;
  await cleanupStaleSessions();
  const ipAddress = requestIp(req);
  const client = parseClientInfo(req);
  const created = await prisma.userTrackingSession.create({
    data: { ...actor, sessionId, ipAddress, ...client },
  });
  await prisma.userTrackingActivity.create({
    data: {
      ...actor,
      sessionId,
      eventType: "LOGIN",
      action: "LOGIN",
      ipAddress,
      createdAt: created.loginAt,
    },
  });
  updateLocationLater(sessionId, ipAddress);
  return created;
}

async function ensureSession(userId: string, sessionId: string | undefined, req: Request, createMissing = true) {
  const active = sessionId ? await prisma.userTrackingSession.findFirst({
    where: { userId, sessionId, status: TrackingSessionStatus.ACTIVE },
  }) : null;
  if (active) return active;
  if (!createMissing) return null;
  const recent = await prisma.userTrackingSession.findFirst({
    where: { userId, status: TrackingSessionStatus.ACTIVE },
    orderBy: { lastActivityAt: "desc" },
  });
  if (recent) return recent;
  if (!createMissing) return null;
  const nextSessionId = crypto.randomUUID();
  const created = await createLoginSession(userId, nextSessionId, req);
  return created;
}

async function touchSession(session: NonNullable<Awaited<ReturnType<typeof ensureSession>>>, now: Date, heartbeat: boolean) {
  const deltaSeconds = Math.floor((now.getTime() - session.lastActivityAt.getTime()) / 1000);
  const addActiveSeconds = deltaSeconds > 0 && deltaSeconds <= ACTIVE_WINDOW_SECONDS ? deltaSeconds : 0;
  const update = await prisma.userTrackingSession.updateMany({
    where: { id: session.id, status: TrackingSessionStatus.ACTIVE, lastActivityAt: session.lastActivityAt },
    data: {
      lastActivityAt: now,
      ...(heartbeat ? { lastHeartbeatAt: now } : {}),
      totalDurationSeconds: Math.max(0, Math.floor((now.getTime() - session.loginAt.getTime()) / 1000)),
      ...(addActiveSeconds ? { activeDurationSeconds: { increment: addActiveSeconds } } : {}),
    },
  });
  if (update.count === 0) return prisma.userTrackingSession.findUnique({ where: { id: session.id } });
  return prisma.userTrackingSession.findUnique({ where: { id: session.id } });
}

export async function heartbeat(userId: string, sessionId: string | undefined, req: Request) {
  await cleanupStaleSessions();
  const session = await ensureSession(userId, sessionId, req);
  if (!session) throw Object.assign(new Error("Unable to establish a tracking session"), { status: 409 });
  const touched = await touchSession(session, new Date(), true);
  const changedIp = requestIp(req);
  if (touched?.status === TrackingSessionStatus.ACTIVE && changedIp && changedIp !== touched.ipAddress) {
    await prisma.userTrackingSession.update({ where: { id: touched.id }, data: { ipAddress: changedIp, locationSource: "UNKNOWN", country: null, countryCode: null, state: null, city: null, latitude: null, longitude: null, timezone: null, locationProvider: null } });
    updateLocationLater(touched.sessionId, changedIp);
  }
  return { sessionId: touched?.sessionId ?? session.sessionId, status: touched?.status ?? session.status, lastActivityAt: touched?.lastActivityAt ?? session.lastActivityAt };
}

export async function recordActivity(userId: string, sessionId: string | undefined, req: Request, input: TrackingEvent) {
  const session = await ensureSession(userId, sessionId, req);
  if (!session) throw Object.assign(new Error("Unable to establish a tracking session"), { status: 409 });
  if (session.status !== TrackingSessionStatus.ACTIVE) throw Object.assign(new Error("Tracking session is not active"), { status: 409 });
  const now = new Date();
  await touchSession(session, now, false);
  let menu: { id: string; label: string; parentId: string | null; parent: { label: string } | null } | null = null;
  if (input.eventType === "MENU_VIEW" || (input.eventType === "PAGE_VIEW" && input.menuId)) {
    if (!input.menuId) throw Object.assign(new Error("menuId is required for MENU_VIEW"), { status: 400 });
    if (session.actorType === TrackingActorType.CUSTOMER) throw Object.assign(new Error("Customer app screens must not use CRM menus"), { status: 400 });
    menu = await prisma.menu.findUnique({ where: { id: input.menuId }, select: { id: true, label: true, parentId: true, parent: { select: { label: true } } } });
    if (!menu) throw Object.assign(new Error("Unknown CRM menu"), { status: 400 });
  }
  if (input.eventType === "SCREEN_VIEW" && session.actorType !== TrackingActorType.CUSTOMER) {
    throw Object.assign(new Error("SCREEN_VIEW is only available to customer sessions"), { status: 403 });
  }
  if (input.eventType === "MENU_VIEW" && session.actorType === TrackingActorType.CUSTOMER) {
    throw Object.assign(new Error("Customer app screens must use SCREEN_VIEW"), { status: 400 });
  }
  const ipAddress = requestIp(req);
  const activity = await prisma.userTrackingActivity.create({
    data: {
      userId: session.userId,
      actorType: session.actorType,
      vendorId: session.vendorId,
      staffId: session.staffId,
      customerId: session.customerId,
      salonId: session.salonId,
      branchId: session.branchId,
      roleId: session.roleId,
      sessionId: session.sessionId,
      menuId: menu?.id,
      parentMenuId: menu?.parentId ?? undefined,
      menuNameSnapshot: menu?.label,
      moduleName: menu ? menu.parent?.label ?? menu.label : input.metadata?.moduleName ? String(input.metadata.moduleName).slice(0, 100) : undefined,
      eventType: input.eventType,
      action: input.action?.slice(0, 100),
      route: input.route?.slice(0, 300),
      screenName: input.screenName?.slice(0, 120),
      method: input.method?.slice(0, 10),
      entityType: input.entityType?.slice(0, 100),
      entityId: input.entityId?.slice(0, 100),
      status: input.status?.slice(0, 40),
      durationMs: input.durationMs,
      metadata: input.metadata ? input.metadata as Prisma.InputJsonObject : undefined,
      ipAddress,
      country: session.country,
      state: session.state,
      city: session.city,
      createdAt: now,
    },
  });
  if (ipAddress && ipAddress !== session.ipAddress) {
    await prisma.userTrackingSession.update({
      where: { id: session.id },
      data: { ipAddress, locationSource: "UNKNOWN", country: null, countryCode: null, state: null, city: null, latitude: null, longitude: null, timezone: null, locationProvider: null },
    });
    updateLocationLater(session.sessionId, ipAddress);
  }
  return activity;
}

export async function logout(userId: string, sessionId: string | undefined, req: Request) {
  const session = await ensureSession(userId, sessionId, req, false);
  if (!session) return { status: "NO_SESSION" };
  const now = new Date();
  const deltaSeconds = Math.floor((now.getTime() - session.lastActivityAt.getTime()) / 1000);
  const addActiveSeconds = deltaSeconds > 0 && deltaSeconds <= ACTIVE_WINDOW_SECONDS ? deltaSeconds : 0;
  const closed = await prisma.userTrackingSession.updateMany({
    where: { id: session.id, status: TrackingSessionStatus.ACTIVE },
    data: {
      status: TrackingSessionStatus.LOGGED_OUT,
      logoutAt: now,
      lastActivityAt: now,
      totalDurationSeconds: Math.max(0, Math.floor((now.getTime() - session.loginAt.getTime()) / 1000)),
      ...(addActiveSeconds ? { activeDurationSeconds: { increment: addActiveSeconds } } : {}),
    },
  });
  if (closed.count) {
    await prisma.userTrackingActivity.create({
      data: { userId: session.userId, actorType: session.actorType, vendorId: session.vendorId, staffId: session.staffId, customerId: session.customerId, salonId: session.salonId, branchId: session.branchId, roleId: session.roleId, sessionId: session.sessionId, eventType: "LOGOUT", action: "LOGOUT", ipAddress: requestIp(req) },
    });
  }
  return { status: closed.count ? TrackingSessionStatus.LOGGED_OUT : session.status };
}

export async function expireStaleSessions() {
  await cleanupStaleSessions(true);
}
