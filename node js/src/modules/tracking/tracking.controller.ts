import { Prisma, TrackingActorType, TrackingSessionStatus } from "@prisma/client";
import { Request, Response } from "express";
import { AuthRequest } from "../../common/middleware/auth.middleware";
import { prisma } from "../../infrastructure/database/prisma";
import { TrackingEvent, heartbeat as recordHeartbeat, logout as closeSession, recordActivity } from "./tracking.service";

const PAGE_DEFAULT = 25;
const PAGE_MAX = 100;
const now = () => new Date();
const activeWindowMs = () => Math.max(30, Number(process.env.TRACKING_ACTIVE_WINDOW_SECONDS) || 120) * 1000;

function queryText(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function dateRange(req: Request, defaultDays = 30) {
  const to = queryText(req.query.dateTo) ?? queryText(req.query.endDate);
  const from = queryText(req.query.dateFrom) ?? queryText(req.query.startDate);
  const dateTo = to ? new Date(to) : now();
  if (to && /^\d{4}-\d{2}-\d{2}$/.test(to)) dateTo.setHours(23, 59, 59, 999);
  const dateFrom = from ? new Date(from) : new Date(dateTo.getTime() - defaultDays * 86400000);
  if (Number.isNaN(dateFrom.getTime()) || Number.isNaN(dateTo.getTime()) || dateFrom > dateTo) {
    throw Object.assign(new Error("dateFrom and dateTo must be valid dates and dateFrom must not exceed dateTo"), { status: 400 });
  }
  return { gte: dateFrom, lte: dateTo };
}

function pagination(req: Request, max = PAGE_MAX) {
  const page = Math.max(1, Math.floor(Number(req.query.page) || 1));
  const pageSize = Math.min(max, Math.max(1, Math.floor(Number(req.query.pageSize) || PAGE_DEFAULT)));
  return { page, pageSize, skip: (page - 1) * pageSize };
}

function paginatedResponse<T>(data: T[], page: number, pageSize: number, total: number) {
  const totalPages = Math.ceil(total / pageSize);
  return {
    success: true,
    data,
    pagination: { page, currentPage: page, pageSize, total, totalRecords: total, totalPages },
    total,
    page,
    pageSize,
    totalPages,
  };
}

function sortOrder(req: Request, fields: Record<string, string>, fallback: string) {
  const field = queryText(req.query.sortBy) ?? queryText(req.query.sort);
  const column = field ? fields[field] : fallback;
  if (field && !column) throw Object.assign(new Error("Unsupported sort field"), { status: 400 });
  const direction = (queryText(req.query.sortOrder) ?? queryText(req.query.order) ?? "desc").toLowerCase();
  if (direction !== "asc" && direction !== "desc") throw Object.assign(new Error("sortOrder must be asc or desc"), { status: 400 });
  return { [column ?? fallback]: direction } as Prisma.UserTrackingSessionOrderByWithRelationInput;
}

function userSortOrder(req: Request): Prisma.UserOrderByWithRelationInput {
  const fields = { userName: "firstName", firstName: "firstName", lastName: "lastName", email: "email", createdAt: "createdAt", updatedAt: "updatedAt" } as const;
  const field = queryText(req.query.sortBy) ?? queryText(req.query.sort);
  const column = field ? fields[field as keyof typeof fields] : "updatedAt";
  const direction = (queryText(req.query.sortOrder) ?? queryText(req.query.order) ?? "desc").toLowerCase();
  if (!column || !["asc", "desc"].includes(direction)) throw Object.assign(new Error("Unsupported user sort field or order"), { status: 400 });
  return { [column]: direction };
}

function stringFilter(value: unknown) {
  const text = queryText(value);
  return text ? { contains: text, mode: "insensitive" as const } : undefined;
}

function actorType(value: unknown): TrackingActorType | undefined {
  const type = queryText(value)?.toUpperCase();
  if (type && !Object.values(TrackingActorType).includes(type as TrackingActorType)) {
    throw Object.assign(new Error("actorType must be ADMIN, VENDOR, STAFF, or CUSTOMER"), { status: 400 });
  }
  return type as TrackingActorType | undefined;
}

function sessionFilters(req: Request, includeDate = true) {
  const type = actorType(req.query.actorType);
  const where: Prisma.UserTrackingSessionWhereInput = {};
  if (type) where.actorType = type;
  const userId = queryText(req.query.userId);
  if (userId) where.userId = userId;
  if (includeDate) where.loginAt = dateRange(req);
  if (queryText(req.query.vendorId)) where.vendorId = queryText(req.query.vendorId);
  if (queryText(req.query.staffId)) where.staffId = queryText(req.query.staffId);
  if (queryText(req.query.customerId)) where.customerId = queryText(req.query.customerId);
  if (queryText(req.query.salonId)) where.salonId = queryText(req.query.salonId);
  if (queryText(req.query.branchId)) where.branchId = queryText(req.query.branchId);
  if (queryText(req.query.roleId)) where.roleId = queryText(req.query.roleId);
  const deviceType = queryText(req.query.deviceType) ?? queryText(req.query.device);
  if (deviceType) where.deviceType = stringFilter(deviceType);
  const browser = queryText(req.query.browser);
  if (browser) where.browser = stringFilter(browser);
  const operatingSystem = queryText(req.query.os) ?? queryText(req.query.operatingSystem);
  if (operatingSystem) where.operatingSystem = stringFilter(operatingSystem);
  const city = queryText(req.query.city);
  if (city) where.city = stringFilter(city);
  const state = queryText(req.query.state);
  if (state) where.state = stringFilter(state);
  const search = queryText(req.query.search);
  if (search) where.user = { OR: [
    { firstName: stringFilter(search) }, { lastName: stringFilter(search) },
    { email: stringFilter(search) }, { phone: stringFilter(search) },
  ] };
  const role = queryText(req.query.role);
  if (role) {
    const roleType = actorType(role);
    if (roleType) where.actorType = roleType;
    else where.roleId = role;
  }
  if (queryText(req.query.status)) {
    const enteredStatus = queryText(req.query.status)?.toUpperCase();
    const status = enteredStatus === "COMPLETED" ? TrackingSessionStatus.LOGGED_OUT : enteredStatus;
    if (!Object.values(TrackingSessionStatus).includes(status as TrackingSessionStatus)) throw Object.assign(new Error("Invalid session status"), { status: 400 });
    where.status = status as TrackingSessionStatus;
  }
  const online = onlineFilter(req);
  if (online === "true") where.AND = [{ status: "ACTIVE" }, { lastActivityAt: { gte: new Date(Date.now() - activeWindowMs()) } }];
  if (online === "false") where.OR = [{ status: { not: "ACTIVE" } }, { lastActivityAt: { lt: new Date(Date.now() - activeWindowMs()) } }];
  return where;
}

function onlineFilter(req: Request) {
  const value = queryText(req.query.online);
  if (value && value !== "true" && value !== "false") throw Object.assign(new Error("online must be true or false"), { status: 400 });
  return value;
}

async function activityFilters(req: Request) {
  const type = actorType(req.query.actorType);
  const where: Prisma.UserTrackingActivityWhereInput = { createdAt: dateRange(req) };
  if (type) where.actorType = type;
  const userId = queryText(req.query.userId);
  if (userId) where.userId = userId;
  if (queryText(req.query.vendorId)) where.vendorId = queryText(req.query.vendorId);
  if (queryText(req.query.staffId)) where.staffId = queryText(req.query.staffId);
  if (queryText(req.query.customerId)) where.customerId = queryText(req.query.customerId);
  if (queryText(req.query.salonId)) where.salonId = queryText(req.query.salonId);
  if (queryText(req.query.branchId)) where.branchId = queryText(req.query.branchId);
  if (queryText(req.query.roleId)) where.roleId = queryText(req.query.roleId);
  if (queryText(req.query.menuId)) where.menuId = queryText(req.query.menuId);
  const screenName = queryText(req.query.screen) ?? queryText(req.query.screenName);
  if (screenName) where.screenName = { equals: screenName, mode: "insensitive" };
  const eventType = queryText(req.query.eventType) ?? queryText(req.query.event);
  if (eventType) where.eventType = eventType.toUpperCase();
  if (queryText(req.query.action)) where.action = { equals: queryText(req.query.action), mode: "insensitive" };
  if (queryText(req.query.status)) where.status = queryText(req.query.status)?.toUpperCase();
  const role = queryText(req.query.role);
  if (role) {
    const roleType = actorType(role);
    if (roleType) where.actorType = roleType;
    else where.roleId = role;
  }
  const deviceType = queryText(req.query.deviceType) ?? queryText(req.query.device);
  const browser = queryText(req.query.browser);
  const operatingSystem = queryText(req.query.os) ?? queryText(req.query.operatingSystem);
  const city = queryText(req.query.city);
  const state = queryText(req.query.state);
  const sessionWhere: Prisma.UserTrackingSessionWhereInput = {};
  if (deviceType) sessionWhere.deviceType = stringFilter(deviceType);
  if (browser) sessionWhere.browser = stringFilter(browser);
  if (operatingSystem) sessionWhere.operatingSystem = stringFilter(operatingSystem);
  if (city) sessionWhere.city = stringFilter(city);
  if (state) sessionWhere.state = stringFilter(state);
  if (Object.keys(sessionWhere).length) {
    const sessions = await prisma.userTrackingSession.findMany({ where: sessionWhere, select: { sessionId: true } });
    where.sessionId = { in: sessions.map(({ sessionId }) => sessionId) };
  }
  const search = queryText(req.query.search);
  if (search) {
    const matchingMenus = await prisma.menu.findMany({ where: { label: stringFilter(search) }, select: { id: true } });
    where.OR = [
    { user: { firstName: stringFilter(search) } },
    { user: { lastName: stringFilter(search) } },
    { user: { email: stringFilter(search) } },
    ...(matchingMenus.length ? [{ menuId: { in: matchingMenus.map(({ id }) => id) } }] : []),
    { menuNameSnapshot: stringFilter(search) },
    { screenName: stringFilter(search) },
    { route: stringFilter(search) },
    { entityId: stringFilter(search) },
    { sessionId: stringFilter(search) },
    ];
  }
  return where;
}

function sessionSqlFilters(req: Request, alias = "s") {
  const filters: Prisma.Sql[] = [];
  for (const key of ["vendorId", "staffId", "customerId", "salonId", "branchId", "roleId"] as const) {
    const value = queryText(req.query[key]);
    if (value) filters.push(Prisma.sql`${Prisma.raw(`${alias}."${key}"`)} = ${value}`);
  }
  const type = actorType(req.query.actorType);
  if (type) filters.push(Prisma.sql`${Prisma.raw(`${alias}."actorType"`)} = ${type}`);
  const userId = queryText(req.query.userId);
  if (userId) filters.push(Prisma.sql`${Prisma.raw(`${alias}."userId"`)} = ${userId}`);
  for (const [queryKey, column] of [
    ["deviceType", "deviceType"], ["device", "deviceType"], ["browser", "browser"],
    ["os", "operatingSystem"], ["operatingSystem", "operatingSystem"], ["city", "city"], ["state", "state"],
  ] as const) {
    const value = queryText(req.query[queryKey]);
    if (value) filters.push(Prisma.sql`${Prisma.raw(`${alias}."${column}"`)} ILIKE ${`%${value}%`}`);
  }
  const statusInput = queryText(req.query.status)?.toUpperCase();
  const status = statusInput === "COMPLETED" ? "LOGGED_OUT" : statusInput;
  if (status) {
    if (!Object.values(TrackingSessionStatus).includes(status as TrackingSessionStatus)) throw Object.assign(new Error("Invalid session status"), { status: 400 });
    filters.push(Prisma.sql`${Prisma.raw(`${alias}."status"`)} = ${status}`);
  }
  const role = queryText(req.query.role);
  if (role) {
    const roleType = actorType(role);
    if (roleType) filters.push(Prisma.sql`${Prisma.raw(`${alias}."actorType"`)} = ${roleType}`);
    else filters.push(Prisma.sql`${Prisma.raw(`${alias}."roleId"`)} = ${role}`);
  }
  const online = onlineFilter(req);
  if (online === "true") filters.push(Prisma.sql`${Prisma.raw(`${alias}."status"`)} = 'ACTIVE' AND ${Prisma.raw(`${alias}."lastActivityAt"`)} >= ${new Date(Date.now() - activeWindowMs())}`);
  if (online === "false") filters.push(Prisma.sql`(${Prisma.raw(`${alias}."status"`)} <> 'ACTIVE' OR ${Prisma.raw(`${alias}."lastActivityAt"`)} < ${new Date(Date.now() - activeWindowMs())})`);
  const search = queryText(req.query.search);
  if (search) filters.push(Prisma.sql`EXISTS (SELECT 1 FROM "User" u WHERE u."id" = ${Prisma.raw(`${alias}."userId"`)} AND (u."firstName" ILIKE ${`%${search}%`} OR COALESCE(u."lastName", '') ILIKE ${`%${search}%`} OR u."email" ILIKE ${`%${search}%`}))`);
  return filters.length ? Prisma.join(filters, " AND ") : Prisma.sql`TRUE`;
}

const includeUser = { user: { select: { id: true, firstName: true, lastName: true, email: true, phone: true } } } as const;

type SessionWithUser = Prisma.UserTrackingSessionGetPayload<{ include: typeof includeUser }>;

async function enrichSessions(rows: SessionWithUser[]) {
  const vendorIds = [...new Set(rows.map((row) => row.vendorId).filter((id): id is string => Boolean(id)))];
  const salonIds = [...new Set(rows.flatMap((row) => [row.salonId, row.branchId]).filter((id): id is string => Boolean(id)))];
  const roleIds = [...new Set(rows.map((row) => row.roleId).filter((id): id is string => Boolean(id)))];
  const sessionIds = rows.map((row) => row.sessionId);
  const [vendors, salons, roles, staffRoles, counts] = await Promise.all([
    vendorIds.length ? prisma.user.findMany({ where: { id: { in: vendorIds } }, select: { id: true, firstName: true, lastName: true } }) : [],
    salonIds.length ? prisma.salon.findMany({ where: { id: { in: salonIds } }, select: { id: true, name: true } }) : [],
    roleIds.length ? prisma.role.findMany({ where: { id: { in: roleIds } }, select: { id: true, name: true } }) : [],
    roleIds.length ? prisma.staffRole.findMany({ where: { id: { in: roleIds } }, select: { id: true, name: true } }) : [],
    sessionIds.length ? prisma.userTrackingActivity.groupBy({ by: ["sessionId"], where: { sessionId: { in: sessionIds } }, _count: { id: true } }) : [],
  ]);
  const vendorNames = new Map(vendors.map((item) => [item.id, `${item.firstName} ${item.lastName ?? ""}`.trim()]));
  const salonNames = new Map(salons.map((item) => [item.id, item.name]));
  const roleNames = new Map([...roles, ...staffRoles].map((item) => [item.id, item.name]));
  const activityCounts = new Map(counts.map((item) => [item.sessionId, item._count.id]));
  return rows.map((row) => {
    const { latitude: _latitude, longitude: _longitude, ...safeRow } = row;
    return {
      ...safeRow,
      userName: `${row.user.firstName} ${row.user.lastName ?? ""}`.trim(),
      roleName: roleNames.get(row.roleId ?? "") ?? row.actorType,
      vendorName: vendorNames.get(row.vendorId ?? "") ?? (row.actorType === TrackingActorType.VENDOR ? `${row.user.firstName} ${row.user.lastName ?? ""}`.trim() : "N/A"),
      salonName: salonNames.get(row.salonId ?? "") ?? "N/A",
      branchName: salonNames.get(row.branchId ?? "") ?? "N/A",
      sessionReference: row.sessionId.slice(0, 8).toUpperCase(),
      loginDate: row.loginAt.toISOString().slice(0, 10),
      loginTime: row.loginAt.toISOString().slice(11, 19),
      logoutDate: row.logoutAt?.toISOString().slice(0, 10) ?? null,
      logoutTime: row.logoutAt?.toISOString().slice(11, 19) ?? null,
      status: row.status === TrackingSessionStatus.LOGGED_OUT ? "COMPLETED" : row.status,
      trackingStatus: row.status,
      deviceType: row.deviceType ?? "N/A",
      totalDurationSeconds: row.status === TrackingSessionStatus.ACTIVE
        ? Math.max(0, Math.floor((Date.now() - row.loginAt.getTime()) / 1000))
        : row.totalDurationSeconds,
      device: row.deviceName ?? row.deviceType ?? "N/A",
      browser: row.browser ?? "N/A",
      operatingSystem: row.operatingSystem ?? "N/A",
      appVersion: row.appVersion ?? "N/A",
      ipAddress: row.ipAddress ?? "N/A",
      country: row.country ?? "N/A",
      state: row.state ?? "N/A",
      city: row.city ?? "N/A",
      lastActivityAt: row.lastActivityAt ?? row.loginAt,
      activityCount: activityCounts.get(row.sessionId) ?? 0,
    };
  });
}

type ActivityWithUser = Prisma.UserTrackingActivityGetPayload<{ include: typeof includeUser }>;

async function enrichActivities(rows: ActivityWithUser[]) {
  const sessionIds = [...new Set(rows.map((row) => row.sessionId).filter((id): id is string => Boolean(id)))];
  const vendorIds = [...new Set(rows.map((row) => row.vendorId).filter((id): id is string => Boolean(id)))];
  const salonIds = [...new Set(rows.flatMap((row) => [row.salonId, row.branchId]).filter((id): id is string => Boolean(id)))];
  const roleIds = [...new Set(rows.map((row) => row.roleId).filter((id): id is string => Boolean(id)))];
  const [sessionsData, vendors, salons, roles, staffRoles, menus] = await Promise.all([
    sessionIds.length ? prisma.userTrackingSession.findMany({ where: { sessionId: { in: sessionIds } }, select: { sessionId: true, deviceType: true, deviceName: true, browser: true, operatingSystem: true, appVersion: true } }) : [],
    vendorIds.length ? prisma.user.findMany({ where: { id: { in: vendorIds } }, select: { id: true, firstName: true, lastName: true } }) : [],
    salonIds.length ? prisma.salon.findMany({ where: { id: { in: salonIds } }, select: { id: true, name: true } }) : [],
    roleIds.length ? prisma.role.findMany({ where: { id: { in: roleIds } }, select: { id: true, name: true } }) : [],
    roleIds.length ? prisma.staffRole.findMany({ where: { id: { in: roleIds } }, select: { id: true, name: true } }) : [],
    rows.some((row) => row.menuId) ? prisma.menu.findMany({ where: { id: { in: rows.map((row) => row.menuId).filter((id): id is string => Boolean(id)) } }, select: { id: true, label: true } }) : [],
  ]);
  const sessionMap = new Map(sessionsData.map((item) => [item.sessionId, item]));
  const vendorMap = new Map(vendors.map((item) => [item.id, `${item.firstName} ${item.lastName ?? ""}`.trim()]));
  const salonMap = new Map(salons.map((item) => [item.id, item.name]));
  const roleMap = new Map([...roles, ...staffRoles].map((item) => [item.id, item.name]));
  const menuMap = new Map(menus.map((item) => [item.id, item.label]));
  return rows.map((row) => {
    const session = sessionMap.get(row.sessionId ?? "");
    return {
      ...row,
      userName: `${row.user.firstName} ${row.user.lastName ?? ""}`.trim(),
      roleName: roleMap.get(row.roleId ?? "") ?? row.actorType,
      vendorName: vendorMap.get(row.vendorId ?? "") ?? (row.actorType === TrackingActorType.VENDOR ? `${row.user.firstName} ${row.user.lastName ?? ""}`.trim() : "N/A"),
      salonName: salonMap.get(row.salonId ?? "") ?? "N/A",
      branchName: salonMap.get(row.branchId ?? "") ?? "N/A",
      menuName: row.menuNameSnapshot ?? menuMap.get(row.menuId ?? "") ?? "N/A",
      sessionReference: row.sessionId?.slice(0, 8).toUpperCase() ?? "N/A",
      screenName: row.screenName ?? "N/A",
      route: row.route ?? "N/A",
      action: row.action ?? "N/A",
      entityType: row.entityType ?? "N/A",
      entityId: row.entityId ?? "N/A",
      ipAddress: row.ipAddress ?? "N/A",
      city: row.city ?? "N/A",
      state: row.state ?? "N/A",
      device: session?.deviceName ?? session?.deviceType ?? "N/A",
      browser: session?.browser ?? "N/A",
      operatingSystem: session?.operatingSystem ?? "N/A",
      appVersion: session?.appVersion ?? "N/A",
      date: row.createdAt.toISOString().slice(0, 10),
      time: row.createdAt.toISOString().slice(11, 19),
      durationMs: row.durationMs ?? 0,
      status: row.status ?? "N/A",
    };
  });
}

export const heartbeat = async (req: Request, res: Response) => {
  const sessionId = getSessionId(req);
  const result = await recordHeartbeat(authenticatedUser(req).userId, sessionId, req);
  res.json({ success: true, data: result });
};

function authenticatedUser(req: Request) {
  const user = (req as AuthRequest).user;
  if (!user) throw Object.assign(new Error("Unauthorized"), { status: 401 });
  return user;
}

function getSessionId(req: Request) {
  const user = authenticatedUser(req);
  const requested = typeof req.body?.sessionId === "string" ? req.body.sessionId : user.trackingSessionId;
  if (requested !== undefined && !/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/.test(requested)) {
    throw Object.assign(new Error("sessionId must be a valid tracking session UUID"), { status: 400 });
  }
  return requested;
}

export const logout = async (req: Request, res: Response) => {
  const sessionId = getSessionId(req);
  const result = await closeSession(authenticatedUser(req).userId, sessionId, req);
  res.json({ success: true, data: result });
};

const eventTypes = new Set([
  "MENU_VIEW", "SCREEN_VIEW", "PAGE_VIEW", "VIEW", "CREATE", "UPDATE", "DELETE", "SEARCH", "FILTER",
  "EXPORT", "IMPORT", "DOWNLOAD", "PRINT", "BOOKING_CREATE", "BOOKING_CANCEL", "BOOKING_CONFIRM",
  "PAYMENT", "REFUND", "STATUS_CHANGE", "APP_OPEN", "APP_BACKGROUND", "APP_FOREGROUND",
]);

export function parseTrackingEvent(body: Record<string, unknown>): TrackingEvent {
  const eventType = typeof body.eventType === "string" ? body.eventType.toUpperCase() : "";
  if (!eventTypes.has(eventType)) throw Object.assign(new Error("Unsupported tracking eventType"), { status: 400 });
  const metadata: TrackingEvent["metadata"] = {};
  if (body.metadata && typeof body.metadata === "object" && !Array.isArray(body.metadata)) {
    const allowed = ["moduleName", "source", "resultCount", "screenCategory"];
    for (const key of allowed) {
      const value = (body.metadata as Record<string, unknown>)[key];
      if (typeof value === "number" && Number.isFinite(value)) metadata[key] = value;
      else if (typeof value === "boolean") metadata[key] = value;
      else if (typeof value === "string" && value.split(".").length !== 3 && /^[A-Za-z0-9 _.-]{1,100}$/.test(value)) metadata[key] = value;
    }
  }
  const safeText = (key: string, max: number, pattern: RegExp) => {
    const value = typeof body[key] === "string" ? (body[key] as string).slice(0, max) : undefined;
    return value && pattern.test(value) ? value : undefined;
  };
  const action = safeText("action", 40, /^(ENTER|EXIT|PAGE_EXIT|SCREEN_EXIT|FOREGROUND|BACKGROUND)$/);
  const route = safeText("route", 300, /^\/[A-Za-z0-9_./:{}-]*$/);
  const screenName = safeText("screenName", 120, /^[A-Za-z0-9 _.-]+$/);
  const method = safeText("method", 10, /^(GET|POST|PUT|PATCH|DELETE)$/);
  const entityType = safeText("entityType", 100, /^[A-Za-z][A-Za-z0-9_.-]*$/);
  const entityId = safeText("entityId", 36, /^(?:[0-9]{1,20}|[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12})$/);
  const status = safeText("status", 40, /^(SUCCESS|FAILED|ERROR|CANCELLED|COMPLETED|PENDING|ACTIVE|INACTIVE)$/);
  const durationMs = typeof body.durationMs === "number" && Number.isInteger(body.durationMs) ? Math.min(120000, Math.max(0, body.durationMs)) : undefined;
  return {
    eventType,
    action,
    menuId: typeof body.menuId === "string" ? body.menuId.slice(0, 100) : undefined,
    route,
    screenName,
    method,
    entityType,
    entityId,
    status,
    durationMs,
    metadata: Object.keys(metadata).length ? metadata : undefined,
  };
}

export const activity = async (req: Request, res: Response) => {
  const sessionId = getSessionId(req);
  const result = await recordActivity(authenticatedUser(req).userId, sessionId, req, parseTrackingEvent(req.body ?? {}));
  res.status(201).json({ success: true, data: result });
};

export const overview = async (req: Request, res: Response) => {
  const range = dateRange(req);
  const current = new Date();
  const sessionSqlWhere = sessionSqlFilters(req, "s");
  const todayStart = new Date(Date.UTC(current.getUTCFullYear(), current.getUTCMonth(), current.getUTCDate()));
  const weekStart = new Date(todayStart.getTime() - ((todayStart.getUTCDay() + 6) % 7) * 86400000);
  const monthStart = new Date(Date.UTC(current.getUTCFullYear(), current.getUTCMonth(), 1));
  const onlineSince = new Date(Date.now() - activeWindowMs());
  const [totals, online, sessionSummary, crmUsage, appUsage, activeLeaders, periods] = await Promise.all([
    prisma.$queryRaw<Array<{ vendors: number; staff: number; customers: number }>>`
      SELECT
        (SELECT COUNT(DISTINCT ur."userId")::int FROM "UserRole" ur JOIN "Role" r ON r."id" = ur."roleId" WHERE r."name" = 'VENDOR' AND r."isActive") AS vendors,
        (SELECT COUNT(DISTINCT ss."userId")::int FROM "SalonStaff" ss WHERE ss."isActive") AS staff,
        (SELECT COUNT(DISTINCT sc."userId")::int FROM "SalonCustomer" sc) AS customers
    `,
    prisma.$queryRaw<Array<{ actorType: TrackingActorType; count: number }>>`
      SELECT s."actorType", COUNT(DISTINCT s."userId")::int AS count FROM "UserTrackingSession" s
      WHERE s."status" = 'ACTIVE' AND s."lastActivityAt" >= ${onlineSince} AND ${sessionSqlWhere}
      GROUP BY s."actorType"
    `,
    prisma.userTrackingSession.aggregate({
      where: sessionFilters(req),
      _count: { id: true },
      _sum: { activeDurationSeconds: true },
      _avg: { totalDurationSeconds: true },
    }),
    usageRows("MENU_VIEW", range, req),
    usageRows("SCREEN_VIEW", range, req),
    prisma.$queryRaw<Array<{ actorType: TrackingActorType; userId: string; activeSeconds: number; firstName: string | null; lastName: string | null }>>`
      SELECT s."actorType", s."userId", SUM(s."activeDurationSeconds")::int AS "activeSeconds", u."firstName", u."lastName"
      FROM "UserTrackingSession" s JOIN "User" u ON u."id" = s."userId"
      WHERE s."loginAt" BETWEEN ${range.gte} AND ${range.lte} AND ${sessionSqlWhere}
      GROUP BY s."actorType", s."userId", u."firstName", u."lastName"
      ORDER BY SUM(s."activeDurationSeconds") DESC LIMIT 3
    `,
    prisma.$queryRaw<Array<{ actorType: TrackingActorType; todaySessions: number; weekSessions: number; monthSessions: number; todayUsers: number }>>`
      SELECT "actorType",
        COUNT(*) FILTER (WHERE "loginAt" >= ${todayStart})::int AS "todaySessions",
        COUNT(*) FILTER (WHERE "loginAt" >= ${weekStart})::int AS "weekSessions",
        COUNT(*) FILTER (WHERE "loginAt" >= ${monthStart})::int AS "monthSessions",
        COUNT(DISTINCT "userId") FILTER (WHERE "loginAt" >= ${todayStart})::int AS "todayUsers"
      FROM "UserTrackingSession" s WHERE s."loginAt" >= ${monthStart} AND ${sessionSqlWhere}
      GROUP BY s."actorType"
    `,
  ]);
  const onlineCounts = new Map(online.map(({ actorType: type, count }) => [type, count]));
  const countFor = (eventType: TrackingActorType) => onlineCounts.get(eventType) ?? 0;
  const sessionCounts = await prisma.userTrackingSession.groupBy({ by: ["actorType"], where: sessionFilters(req), _count: { id: true } });
  const countSessions = (type: TrackingActorType) => sessionCounts.find(({ actorType: actor }) => actor === type)?._count.id ?? 0;
  const period = (type: TrackingActorType) => periods.find(({ actorType: actor }) => actor === type);
  const activeLeader = (type: TrackingActorType) => activeLeaders.find((item) => item.actorType === type) ?? null;
  const activityWhere = activitySqlFilters(req);
  const durationMs = range.lte.getTime() - range.gte.getTime();
  const previousRange = { gte: new Date(range.gte.getTime() - durationMs), lte: new Date(range.gte.getTime() - 1) };
  const [
    dashboardCounts,
    previousCounts,
    dailyActiveUsers,
    loginTrend,
    userTypeActivity,
    deviceBreakdown,
    browserBreakdown,
    activityTotals,
    totalMenuViews,
    totalScreenViews,
  ] = await Promise.all([
    prisma.$queryRaw<Array<{ totalUsers: number; activeUsers: number; totalSessions: number; activeSessions: number; completedSessions: number; totalActivities: number }>>`
      SELECT
        (SELECT COUNT(DISTINCT s."userId")::int FROM "UserTrackingSession" s WHERE s."loginAt" BETWEEN ${range.gte} AND ${range.lte} AND ${sessionSqlWhere}) AS "totalUsers",
        (SELECT COUNT(DISTINCT a."userId")::int FROM "UserTrackingActivity" a WHERE a."createdAt" BETWEEN ${range.gte} AND ${range.lte} AND ${activityWhere}) AS "activeUsers",
        (SELECT COUNT(*)::int FROM "UserTrackingSession" s WHERE s."loginAt" BETWEEN ${range.gte} AND ${range.lte} AND ${sessionSqlWhere}) AS "totalSessions",
        (SELECT COUNT(*)::int FROM "UserTrackingSession" s WHERE s."loginAt" BETWEEN ${range.gte} AND ${range.lte} AND s."status" = 'ACTIVE' AND ${sessionSqlWhere}) AS "activeSessions",
        (SELECT COUNT(*)::int FROM "UserTrackingSession" s WHERE s."loginAt" BETWEEN ${range.gte} AND ${range.lte} AND s."status" = 'LOGGED_OUT' AND ${sessionSqlWhere}) AS "completedSessions",
        (SELECT COUNT(*)::int FROM "UserTrackingActivity" a WHERE a."createdAt" BETWEEN ${range.gte} AND ${range.lte} AND ${activityWhere}) AS "totalActivities"
    `,
    prisma.$queryRaw<Array<{
      totalUsers: number; activeUsers: number; totalSessions: number; totalActivities: number;
      activeSessions: number; completedSessions: number; averageSessionSeconds: number;
      vendorActivities: number; staffActivities: number; customerActivities: number;
    }>>`
      SELECT
        (SELECT COUNT(DISTINCT s."userId")::int FROM "UserTrackingSession" s WHERE s."loginAt" BETWEEN ${previousRange.gte} AND ${previousRange.lte} AND ${sessionSqlWhere}) AS "totalUsers",
        (SELECT COUNT(DISTINCT a."userId")::int FROM "UserTrackingActivity" a WHERE a."createdAt" BETWEEN ${previousRange.gte} AND ${previousRange.lte} AND ${activityWhere}) AS "activeUsers",
        (SELECT COUNT(*)::int FROM "UserTrackingSession" s WHERE s."loginAt" BETWEEN ${previousRange.gte} AND ${previousRange.lte} AND ${sessionSqlWhere}) AS "totalSessions",
        (SELECT COUNT(*)::int FROM "UserTrackingActivity" a WHERE a."createdAt" BETWEEN ${previousRange.gte} AND ${previousRange.lte} AND ${activityWhere}) AS "totalActivities",
        (SELECT COUNT(*)::int FROM "UserTrackingSession" s WHERE s."loginAt" BETWEEN ${previousRange.gte} AND ${previousRange.lte} AND s."status" = 'ACTIVE' AND ${sessionSqlWhere}) AS "activeSessions",
        (SELECT COUNT(*)::int FROM "UserTrackingSession" s WHERE s."loginAt" BETWEEN ${previousRange.gte} AND ${previousRange.lte} AND s."status" = 'LOGGED_OUT' AND ${sessionSqlWhere}) AS "completedSessions",
        (SELECT COALESCE(AVG(CASE WHEN s."status" = 'ACTIVE' THEN EXTRACT(EPOCH FROM (NOW() - s."loginAt")) ELSE s."totalDurationSeconds" END), 0)::int
          FROM "UserTrackingSession" s WHERE s."loginAt" BETWEEN ${previousRange.gte} AND ${previousRange.lte} AND ${sessionSqlWhere}) AS "averageSessionSeconds",
        (SELECT COUNT(*)::int FROM "UserTrackingActivity" a WHERE a."createdAt" BETWEEN ${previousRange.gte} AND ${previousRange.lte} AND a."actorType" = 'VENDOR' AND ${activityWhere}) AS "vendorActivities",
        (SELECT COUNT(*)::int FROM "UserTrackingActivity" a WHERE a."createdAt" BETWEEN ${previousRange.gte} AND ${previousRange.lte} AND a."actorType" = 'STAFF' AND ${activityWhere}) AS "staffActivities",
        (SELECT COUNT(*)::int FROM "UserTrackingActivity" a WHERE a."createdAt" BETWEEN ${previousRange.gte} AND ${previousRange.lte} AND a."actorType" = 'CUSTOMER' AND ${activityWhere}) AS "customerActivities"
    `,
    prisma.$queryRaw<Array<{ date: Date; totalUsers: number; activeUsers: number; sessions: number }>>`
      WITH sessions_by_day AS (
        SELECT date_trunc('day', s."loginAt") AS date, COUNT(DISTINCT s."userId")::int AS "totalUsers", COUNT(*)::int AS sessions
        FROM "UserTrackingSession" s WHERE s."loginAt" BETWEEN ${range.gte} AND ${range.lte} AND ${sessionSqlWhere}
        GROUP BY date_trunc('day', s."loginAt")
      ), activities_by_day AS (
        SELECT date_trunc('day', a."createdAt") AS date, COUNT(DISTINCT a."userId")::int AS "activeUsers"
        FROM "UserTrackingActivity" a WHERE a."createdAt" BETWEEN ${range.gte} AND ${range.lte} AND ${activityWhere}
        GROUP BY date_trunc('day', a."createdAt")
      )
      SELECT COALESCE(s.date, a.date) AS date, COALESCE(s."totalUsers", 0)::int AS "totalUsers",
        COALESCE(a."activeUsers", 0)::int AS "activeUsers", COALESCE(s.sessions, 0)::int AS sessions
      FROM sessions_by_day s FULL JOIN activities_by_day a ON a.date = s.date ORDER BY date
    `,
    prisma.$queryRaw<Array<{ date: Date; successfulLogins: number; logoutCount: number; failedLoginCount: number }>>`
      SELECT date_trunc('day', a."createdAt") AS date,
        COUNT(*) FILTER (WHERE a."eventType" = 'LOGIN' AND COALESCE(a."status", '') <> 'FAILED')::int AS "successfulLogins",
        COUNT(*) FILTER (WHERE a."eventType" = 'LOGOUT')::int AS "logoutCount",
        COUNT(*) FILTER (WHERE a."eventType" = 'LOGIN' AND a."status" = 'FAILED')::int AS "failedLoginCount"
      FROM "UserTrackingActivity" a WHERE a."createdAt" BETWEEN ${range.gte} AND ${range.lte} AND ${activityWhere}
      GROUP BY date_trunc('day', a."createdAt") ORDER BY date
    `,
    prisma.$queryRaw<Array<{ role: TrackingActorType; activityCount: number; uniqueUsers: number }>>`
      SELECT a."actorType" AS role, COUNT(*)::int AS "activityCount", COUNT(DISTINCT a."userId")::int AS "uniqueUsers"
      FROM "UserTrackingActivity" a WHERE a."createdAt" BETWEEN ${range.gte} AND ${range.lte} AND ${activityWhere}
      GROUP BY a."actorType" ORDER BY "activityCount" DESC
    `,
    prisma.$queryRaw<Array<{ device: string; users: number; sessions: number; percentage: number }>>`
      SELECT COALESCE(s."deviceType", 'N/A') AS device, COUNT(DISTINCT s."userId")::int AS users, COUNT(*)::int AS sessions,
        ROUND(COUNT(*)::numeric * 100 / NULLIF(SUM(COUNT(*)) OVER (), 0), 2) AS percentage
      FROM "UserTrackingSession" s WHERE s."loginAt" BETWEEN ${range.gte} AND ${range.lte} AND ${sessionSqlWhere}
      GROUP BY s."deviceType" ORDER BY sessions DESC
    `,
    prisma.$queryRaw<Array<{ browser: string; users: number; sessions: number; percentage: number }>>`
      SELECT COALESCE(s."browser", 'N/A') AS browser, COUNT(DISTINCT s."userId")::int AS users, COUNT(*)::int AS sessions,
        ROUND(COUNT(*)::numeric * 100 / NULLIF(SUM(COUNT(*)) OVER (), 0), 2) AS percentage
      FROM "UserTrackingSession" s WHERE s."loginAt" BETWEEN ${range.gte} AND ${range.lte} AND ${sessionSqlWhere}
      GROUP BY s."browser" ORDER BY sessions DESC
    `,
    prisma.$queryRaw<Array<{ actorType: TrackingActorType; activityCount: number }>>`
      SELECT a."actorType", COUNT(*)::int AS "activityCount" FROM "UserTrackingActivity" a
      WHERE a."createdAt" BETWEEN ${range.gte} AND ${range.lte} AND ${activityWhere} GROUP BY a."actorType"
    `,
    usageTotal(req, "MENU_VIEW", range),
    usageTotal(req, "SCREEN_VIEW", range),
  ]);
  const currentCounts = dashboardCounts[0] ?? { totalUsers: 0, activeUsers: 0, totalSessions: 0, activeSessions: 0, completedSessions: 0, totalActivities: 0 };
  const prior = previousCounts[0] ?? {
    totalUsers: 0, activeUsers: 0, totalSessions: 0, totalActivities: 0,
    activeSessions: 0, completedSessions: 0, averageSessionSeconds: 0,
    vendorActivities: 0, staffActivities: 0, customerActivities: 0,
  };
  const percentChange = (currentValue: number, previousValue: number) => previousValue ? Number((((currentValue - previousValue) / previousValue) * 100).toFixed(2)) : currentValue ? 100 : 0;
  const dateRangeValue = { from: range.gte, to: range.lte };
  const kpi = (label: string, value: number | string, previousPeriodValue: number | string | null) => ({
    label, value, previousPeriodValue,
    trend: typeof value === "number" && typeof previousPeriodValue === "number" ? (value > previousPeriodValue ? "UP" : value < previousPeriodValue ? "DOWN" : "STABLE") : null,
    trendPercentage: typeof value === "number" && typeof previousPeriodValue === "number" ? percentChange(value, previousPeriodValue) : null,
    dateRange: dateRangeValue,
  });
  const menuViews = crmUsage.reduce((sum, item) => sum + item.visitCount, 0);
  const screenViews = appUsage.reduce((sum, item) => sum + item.visitCount, 0);
  const roleActivity = new Map(activityTotals.map((row) => [row.actorType, row.activityCount]));
  res.json({
    success: true,
    data: {
      totalVendors: totals[0]?.vendors ?? 0,
      totalStaff: totals[0]?.staff ?? 0,
      totalCustomers: totals[0]?.customers ?? 0,
      onlineVendors: countFor(TrackingActorType.VENDOR),
      onlineStaff: countFor(TrackingActorType.STAFF),
      onlineCustomers: countFor(TrackingActorType.CUSTOMER),
      vendorSessions: countSessions(TrackingActorType.VENDOR),
      staffSessions: countSessions(TrackingActorType.STAFF),
      customerSessions: countSessions(TrackingActorType.CUSTOMER),
      sessionsToday: periods.reduce((sum, item) => sum + item.todaySessions, 0),
      sessionsThisWeek: periods.reduce((sum, item) => sum + item.weekSessions, 0),
      sessionsThisMonth: periods.reduce((sum, item) => sum + item.monthSessions, 0),
      vendorsLoggedInToday: period(TrackingActorType.VENDOR)?.todayUsers ?? 0,
      staffLoggedInToday: period(TrackingActorType.STAFF)?.todayUsers ?? 0,
      customersLoggedInToday: period(TrackingActorType.CUSTOMER)?.todayUsers ?? 0,
      totalActiveTimeSeconds: sessionSummary._sum.activeDurationSeconds ?? 0,
      averageSessionSeconds: Math.round(sessionSummary._avg.totalDurationSeconds ?? 0),
      mostUsedCrmMenu: crmUsage[0] ?? null,
      mostUsedCustomerScreen: appUsage[0] ?? null,
      mostActiveVendor: activeLeader(TrackingActorType.VENDOR),
      mostActiveStaff: activeLeader(TrackingActorType.STAFF),
      mostActiveCustomer: activeLeader(TrackingActorType.CUSTOMER),
      dateRange: dateRangeValue,
      totalUsers: kpi("Total Users", currentCounts.totalUsers, prior.totalUsers),
      activeUsers: kpi("Active Users", currentCounts.activeUsers, prior.activeUsers),
      onlineUsers: kpi("Online Users", online.reduce((sum, row) => sum + row.count, 0), null),
      totalSessions: kpi("Total Sessions", currentCounts.totalSessions, prior.totalSessions),
      activeSessions: kpi("Active Sessions", currentCounts.activeSessions, prior.activeSessions),
      completedSessions: kpi("Completed Sessions", currentCounts.completedSessions, prior.completedSessions),
      totalActivities: kpi("Total Activities", currentCounts.totalActivities, prior.totalActivities),
      averageSessionDuration: kpi("Average Session Duration", Math.round(sessionSummary._avg.totalDurationSeconds ?? 0), prior.averageSessionSeconds),
      totalVendorActivity: kpi("Total Vendor Activity", roleActivity.get(TrackingActorType.VENDOR) ?? 0, prior.vendorActivities),
      totalStaffActivity: kpi("Total Staff Activity", roleActivity.get(TrackingActorType.STAFF) ?? 0, prior.staffActivities),
      totalCustomerActivity: kpi("Total Customer Activity", roleActivity.get(TrackingActorType.CUSTOMER) ?? 0, prior.customerActivities),
      mostUsedCrmMenuKpi: kpi("Most Used CRM Menu", crmUsage[0]?.name ?? "N/A", null),
      mostUsedCustomerAppScreenKpi: kpi("Most Used Customer App Screen", appUsage[0]?.name ?? "N/A", null),
      topDevice: kpi("Top Device", deviceBreakdown[0]?.device ?? "N/A", null),
      topBrowser: kpi("Top Browser", browserBreakdown[0]?.browser ?? "N/A", null),
      charts: {
        dailyActiveUsers: dailyActiveUsers.map((row) => ({ ...row, date: row.date.toISOString().slice(0, 10) })),
        loginTrend: loginTrend.map((row) => ({ ...row, date: row.date.toISOString().slice(0, 10) })),
        userTypeActivity: userTypeActivity.map((row) => ({ role: row.role, activityCount: row.activityCount, uniqueUsers: row.uniqueUsers })),
        deviceBreakdown,
        menuUsage: crmUsage.map((row) => ({
          menu: row.name,
          views: row.visitCount,
          uniqueUsers: row.uniqueUsers,
          percentage: totalMenuViews ? Number((row.visitCount * 100 / totalMenuViews).toFixed(2)) : 0,
        })),
        customerAppScreens: appUsage.map((row) => ({
          screen: row.name,
          views: row.visitCount,
          uniqueCustomers: row.uniqueUsers,
          percentage: totalScreenViews ? Number((row.visitCount * 100 / totalScreenViews).toFixed(2)) : 0,
        })),
      },
    },
  });
};

function usageFilters(req: Request, eventType: "MENU_VIEW" | "SCREEN_VIEW", alias = "a") {
  const field = (column: string) => Prisma.raw(`${alias}."${column}"`);
  const filters: Prisma.Sql[] = [eventType === "MENU_VIEW"
    ? Prisma.sql`(${field("eventType")} = 'MENU_VIEW' OR (${field("eventType")} = 'PAGE_VIEW' AND ${field("menuId")} IS NOT NULL))`
    : Prisma.sql`(${field("eventType")} = 'SCREEN_VIEW' OR (${field("eventType")} <> 'SCREEN_VIEW' AND ${field("screenName")} IS NOT NULL))`];
  const scalarFilters = [
    ["actorType", "actorType"],
    ["vendorId", "vendorId"],
    ["staffId", "staffId"],
    ["customerId", "customerId"],
    ["salonId", "salonId"],
    ["branchId", "branchId"],
    ["roleId", "roleId"],
  ] as const;
  for (const [queryKey, column] of scalarFilters) {
    const value = queryText(req.query[queryKey]);
    if (!value) continue;
    filters.push(column === "actorType"
      ? Prisma.sql`${field("actorType")} = ${actorType(value)}`
      : Prisma.sql`${field(column)} = ${value}`);
  }
  if (eventType === "MENU_VIEW" && queryText(req.query.menuId)) filters.push(Prisma.sql`${field("menuId")} = ${queryText(req.query.menuId)}`);
  if (eventType === "SCREEN_VIEW" && queryText(req.query.screenName)) filters.push(Prisma.sql`${field("screenName")} = ${queryText(req.query.screenName)}`);
  const role = queryText(req.query.role);
  if (role) {
    const roleType = actorType(role);
    filters.push(roleType ? Prisma.sql`${field("actorType")} = ${roleType}` : Prisma.sql`${field("roleId")} = ${role}`);
  }
  const userId = queryText(req.query.userId) ?? queryText(req.query.customerId);
  if (userId) filters.push(Prisma.sql`${field("userId")} = ${userId}`);
  if (queryText(req.query.action)) filters.push(Prisma.sql`${field("action")} ILIKE ${`%${queryText(req.query.action)}%`}`);
  const event = queryText(req.query.eventType) ?? queryText(req.query.event);
  if (event) filters.push(Prisma.sql`${field("eventType")} = ${event.toUpperCase()}`);
  const search = queryText(req.query.search);
  if (search) filters.push(Prisma.sql`(
    EXISTS (SELECT 1 FROM "User" u WHERE u."id" = ${field("userId")} AND
      (u."firstName" ILIKE ${`%${search}%`} OR COALESCE(u."lastName", '') ILIKE ${`%${search}%`} OR u."email" ILIKE ${`%${search}%`}))
    OR ${field("menuNameSnapshot")} ILIKE ${`%${search}%`}
    OR ${field("screenName")} ILIKE ${`%${search}%`}
    OR ${field("route")} ILIKE ${`%${search}%`}
    OR EXISTS (SELECT 1 FROM "Menu" m WHERE m."id" = ${field("menuId")} AND m."label" ILIKE ${`%${search}%`})
  )`);
  const sessionFilters: Prisma.Sql[] = [];
  for (const [queryKey, column] of [["device", "deviceType"], ["deviceType", "deviceType"], ["browser", "browser"], ["os", "operatingSystem"], ["operatingSystem", "operatingSystem"], ["city", "city"], ["state", "state"]] as const) {
    const value = queryText(req.query[queryKey]);
    if (value) sessionFilters.push(Prisma.sql`ts."${Prisma.raw(column)}" ILIKE ${`%${value}%`}`);
  }
  if (queryText(req.query.status)) sessionFilters.push(Prisma.sql`ts."status" = ${queryText(req.query.status)?.toUpperCase() === "COMPLETED" ? "LOGGED_OUT" : queryText(req.query.status)?.toUpperCase()}`);
  if (sessionFilters.length) filters.push(Prisma.sql`EXISTS (SELECT 1 FROM "UserTrackingSession" ts WHERE ts."sessionId" = ${field("sessionId")} AND ${Prisma.join(sessionFilters, " AND ")})`);
  return Prisma.join(filters, " AND ");
}

async function usageTotal(req: Request, eventType: "MENU_VIEW" | "SCREEN_VIEW", range: { gte: Date; lte: Date }) {
  const filters = usageFilters(req, eventType);
  const viewOnly = eventType === "SCREEN_VIEW" ? Prisma.sql`AND a."eventType" = 'SCREEN_VIEW'` : Prisma.empty;
  const rows = await prisma.$queryRaw<Array<{ count: number }>>`
    SELECT COUNT(*)::int AS count FROM "UserTrackingActivity" a
    WHERE ${filters} AND a."createdAt" BETWEEN ${range.gte} AND ${range.lte} ${viewOnly}
  `;
  return rows[0]?.count ?? 0;
}

function activitySqlFilters(req: Request, alias = "a") {
  const filters: Prisma.Sql[] = [];
  for (const key of ["vendorId", "staffId", "customerId", "salonId", "branchId", "roleId", "userId", "menuId"] as const) {
    const value = queryText(req.query[key]);
    if (value) filters.push(Prisma.sql`${Prisma.raw(`${alias}."${key}"`)} = ${value}`);
  }
  const type = actorType(req.query.actorType);
  const roleValue = queryText(req.query.role)?.toUpperCase();
  const role = roleValue && Object.values(TrackingActorType).includes(roleValue as TrackingActorType) ? roleValue as TrackingActorType : undefined;
  const effectiveType = type ?? role;
  if (effectiveType) filters.push(Prisma.sql`${Prisma.raw(`${alias}."actorType"`)} = ${effectiveType}`);
  else if (queryText(req.query.role)) filters.push(Prisma.sql`${Prisma.raw(`${alias}."roleId"`)} = ${queryText(req.query.role)}`);
  const event = queryText(req.query.eventType) ?? queryText(req.query.event);
  if (event) filters.push(Prisma.sql`${Prisma.raw(`${alias}."eventType"`)} = ${event.toUpperCase()}`);
  const action = queryText(req.query.action);
  if (action) filters.push(Prisma.sql`${Prisma.raw(`${alias}."action"`)} ILIKE ${`%${action}%`}`);
  const screen = queryText(req.query.screen) ?? queryText(req.query.screenName);
  if (screen) filters.push(Prisma.sql`${Prisma.raw(`${alias}."screenName"`)} ILIKE ${`%${screen}%`}`);
  const city = queryText(req.query.city);
  if (city) filters.push(Prisma.sql`${Prisma.raw(`${alias}."city"`)} ILIKE ${`%${city}%`}`);
  const state = queryText(req.query.state);
  if (state) filters.push(Prisma.sql`${Prisma.raw(`${alias}."state"`)} ILIKE ${`%${state}%`}`);
  const search = queryText(req.query.search);
  if (search) filters.push(Prisma.sql`EXISTS (SELECT 1 FROM "User" u WHERE u."id" = ${Prisma.raw(`${alias}."userId"`)} AND (u."firstName" ILIKE ${`%${search}%`} OR COALESCE(u."lastName", '') ILIKE ${`%${search}%`} OR u."email" ILIKE ${`%${search}%`}))`);
  return filters.length ? Prisma.join(filters, " AND ") : Prisma.sql`TRUE`;
}

async function usageRows(eventType: "MENU_VIEW" | "SCREEN_VIEW", range: { gte: Date; lte: Date }, req: Request, limit: number | null = 10) {
  const filters = usageFilters(req, eventType);
  const limitSql = limit === null ? Prisma.empty : Prisma.sql`LIMIT ${limit}`;
  if (eventType === "MENU_VIEW") {
    return prisma.$queryRaw<Array<{ name: string | null; id: string | null; visitCount: number; uniqueUsers: number; activeTimeMs: number; averageDurationMs: number; lastUsedAt: Date | null }>>`
      SELECT COALESCE(a."menuNameSnapshot", m."label") AS name, a."menuId" AS id, COUNT(*)::int AS "visitCount",
        COUNT(DISTINCT a."userId")::int AS "uniqueUsers", COALESCE(SUM(a."durationMs"), 0)::int AS "activeTimeMs",
        COALESCE(AVG(a."durationMs") FILTER (WHERE a."durationMs" IS NOT NULL), 0)::int AS "averageDurationMs",
        MAX(a."createdAt") AS "lastUsedAt"
      FROM "UserTrackingActivity" a LEFT JOIN "Menu" m ON m."id" = a."menuId"
      WHERE ${filters} AND a."createdAt" BETWEEN ${range.gte} AND ${range.lte}
      GROUP BY a."menuId", COALESCE(a."menuNameSnapshot", m."label")
      ORDER BY COUNT(*) FILTER (WHERE a."eventType" = 'MENU_VIEW') DESC ${limitSql}
    `;
  }
  return prisma.$queryRaw<Array<{ name: string | null; id: string | null; visitCount: number; uniqueUsers: number; activeTimeMs: number; averageDurationMs: number; lastUsedAt: Date | null }>>`
    SELECT a."screenName" AS name, a."screenName" AS id,
      COUNT(*) FILTER (WHERE a."eventType" = 'SCREEN_VIEW' AND COALESCE(a."action", '') NOT IN ('SCREEN_EXIT', 'EXIT'))::int AS "visitCount",
      COUNT(DISTINCT a."userId")::int AS "uniqueUsers", COALESCE(SUM(a."durationMs"), 0)::int AS "activeTimeMs",
      COALESCE(AVG(a."durationMs") FILTER (WHERE a."durationMs" IS NOT NULL), 0)::int AS "averageDurationMs",
      MAX(a."createdAt") AS "lastUsedAt"
    FROM "UserTrackingActivity" a
    WHERE ${filters} AND a."createdAt" BETWEEN ${range.gte} AND ${range.lte}
    GROUP BY a."screenName" ORDER BY COUNT(*) FILTER (WHERE a."eventType" = 'SCREEN_VIEW' AND COALESCE(a."action", '') NOT IN ('SCREEN_EXIT', 'EXIT')) DESC ${limitSql}
  `;
}

export const sessions = async (req: Request, res: Response) => {
  const { page, pageSize, skip } = pagination(req);
  const where = sessionFilters(req);
  const sortField = queryText(req.query.sortBy) ?? queryText(req.query.sort);
  const sortDirection = (queryText(req.query.sortOrder) ?? queryText(req.query.order) ?? "desc").toLowerCase();
  if (!["asc", "desc"].includes(sortDirection)) throw Object.assign(new Error("sortOrder must be asc or desc"), { status: 400 });
  const orderBy: Prisma.UserTrackingSessionOrderByWithRelationInput = sortField === "userName"
    ? { user: { firstName: sortDirection as Prisma.SortOrder } }
    : sortOrder(req, {
      loginTime: "loginAt", loginAt: "loginAt", lastActivity: "lastActivityAt", lastActivityAt: "lastActivityAt",
      sessionDuration: "totalDurationSeconds", duration: "totalDurationSeconds",
    }, "loginAt");
  const [rows, total] = await Promise.all([
    prisma.userTrackingSession.findMany({ where, orderBy, skip, take: pageSize, include: includeUser }),
    prisma.userTrackingSession.count({ where }),
  ]);
  const data = await enrichSessions(rows);
  res.json(paginatedResponse(data, page, pageSize, total));
};

export const locationDevice = async (req: Request, res: Response) => {
  const { page, pageSize, skip } = pagination(req);
  const range = dateRange(req);
  const filters = sessionSqlFilters(req);
  const sortable: Record<string, string> = {
    userName: `"userName"`, city: `"city"`, state: `"state"`, deviceType: `"deviceType"`,
    sessionCount: `"sessionCount"`, activityCount: `"activityCount"`, firstSeen: `"firstSeen"`, lastSeen: `"lastSeen"`,
  };
  const sortKey = queryText(req.query.sortBy) ?? queryText(req.query.sort) ?? "lastSeen";
  const sortColumn = sortable[sortKey];
  const direction = (queryText(req.query.sortOrder) ?? queryText(req.query.order) ?? "desc").toLowerCase();
  if (!sortColumn || !["asc", "desc"].includes(direction)) throw Object.assign(new Error("Unsupported location/device sort field or order"), { status: 400 });
  const rows = await prisma.$queryRaw<Array<Record<string, unknown> & { totalRecords: number }>>`
    WITH scoped_sessions AS (
      SELECT s.* FROM "UserTrackingSession" s
      WHERE s."loginAt" BETWEEN ${range.gte} AND ${range.lte} AND ${filters}
    ), activity_counts AS (
      SELECT a."sessionId", COUNT(*)::int AS count FROM "UserTrackingActivity" a
      JOIN scoped_sessions s ON s."sessionId" = a."sessionId"
      GROUP BY a."sessionId"
    ), grouped AS (
      SELECT s."userId", s."actorType", s."vendorId", s."salonId", s."branchId",
        s.country, s.state, s.city, s."deviceType", s."deviceName", s.browser, s."operatingSystem", s."appVersion", s."ipAddress",
        s."roleId", MIN(s."loginAt") AS "firstSeen", MAX(s."lastActivityAt") AS "lastSeen",
        COUNT(DISTINCT s."sessionId")::int AS "sessionCount", COALESCE(SUM(ac.count), 0)::int AS "activityCount",
        BOOL_OR(s."status" = 'ACTIVE' AND s."lastActivityAt" >= ${new Date(Date.now() - activeWindowMs())}) AS online
      FROM scoped_sessions s LEFT JOIN activity_counts ac ON ac."sessionId" = s."sessionId"
      GROUP BY s."userId", s."actorType", s."vendorId", s."salonId", s."branchId", s.country, s.state, s.city,
        s."deviceType", s."deviceName", s.browser, s."operatingSystem", s."appVersion", s."ipAddress", s."roleId"
    )
    SELECT g."userId", g."actorType", g."vendorId", g."salonId", g."branchId",
      CONCAT_WS(' ', u."firstName", u."lastName") AS "userName",
      COALESCE(NULLIF(CONCAT_WS(' ', vu."firstName", vu."lastName"), ''), 'N/A') AS "vendorName",
      COALESCE(salon.name, 'N/A') AS "salonName", COALESCE(branch.name, 'N/A') AS "branchName",
      COALESCE(r.name, sr.name, g."actorType"::text) AS "roleName",
      COALESCE(g.country, 'N/A') AS country, COALESCE(g.state, 'N/A') AS state, COALESCE(g.city, 'N/A') AS city,
      COALESCE(g."deviceType", 'N/A') AS "deviceType", COALESCE(g."deviceName", g."deviceType", 'N/A') AS "deviceName",
      COALESCE(g.browser, 'N/A') AS browser, COALESCE(g."operatingSystem", 'N/A') AS "operatingSystem",
      COALESCE(g."appVersion", 'N/A') AS "appVersion", COALESCE(g."ipAddress", 'N/A') AS "ipAddress",
      g."sessionCount", g."activityCount", g."firstSeen", g."lastSeen",
      CASE WHEN g.online THEN 'ONLINE' WHEN u."isActive" THEN 'ACTIVE' ELSE 'INACTIVE' END AS status,
      COUNT(*) OVER()::int AS "totalRecords"
    FROM grouped g JOIN "User" u ON u.id = g."userId"
    LEFT JOIN "User" vu ON vu.id = g."vendorId"
    LEFT JOIN "Salon" salon ON salon.id = g."salonId"
    LEFT JOIN "Salon" branch ON branch.id = g."branchId"
    LEFT JOIN "Role" r ON r.id = g."roleId"
    LEFT JOIN "StaffRole" sr ON sr.id = g."roleId"
    ORDER BY ${Prisma.raw(sortColumn)} ${Prisma.raw(direction)}
    LIMIT ${pageSize} OFFSET ${skip}
  `;
  const total = rows[0]?.totalRecords ?? 0;
  res.json(paginatedResponse(rows, page, pageSize, total));
};

export const activities = async (req: Request, res: Response) => {
  const { page, pageSize, skip } = pagination(req);
  const where = await activityFilters(req);
  const sortField = queryText(req.query.sortBy) ?? queryText(req.query.sort) ?? "createdAt";
  const sortOrderValue = (queryText(req.query.sortOrder) ?? queryText(req.query.order) ?? "desc").toLowerCase();
  const sortColumns = { createdAt: "createdAt", date: "createdAt", time: "createdAt", action: "action", event: "eventType", eventType: "eventType", duration: "durationMs", durationMs: "durationMs" } as const;
  const sortColumn = sortColumns[sortField as keyof typeof sortColumns];
  if ((sortField !== "userName" && !sortColumn) || !["asc", "desc"].includes(sortOrderValue)) throw Object.assign(new Error("Unsupported activity sort field or order"), { status: 400 });
  const orderBy: Prisma.UserTrackingActivityOrderByWithRelationInput = sortField === "userName"
    ? { user: { firstName: sortOrderValue as Prisma.SortOrder } }
    : { [sortColumn as keyof typeof sortColumns]: sortOrderValue as Prisma.SortOrder };
  const [rows, total] = await Promise.all([
    prisma.userTrackingActivity.findMany({ where, orderBy, skip, take: pageSize, include: includeUser }),
    prisma.userTrackingActivity.count({ where }),
  ]);
  const data = await enrichActivities(rows);
  res.json(paginatedResponse(data, page, pageSize, total));
};

export const menuUsage = async (req: Request, res: Response) => {
  const { page, pageSize, skip } = pagination(req);
  const range = dateRange(req);
  const filters = usageFilters(req, "MENU_VIEW");
  const previousFilters = usageFilters(req, "MENU_VIEW", "old");
  const orderByFields: Record<string, string> = {
    menu: `"menu"`, name: `"menu"`, views: `"totalViews"`, totalViews: `"totalViews"`,
    uniqueUsers: `"uniqueUsers"`, firstUsed: `"firstUsed"`, lastUsed: `"lastUsed"`,
    averageTime: `"averageDurationMs"`, percentage: `"percentage"`,
  };
  const sortKey = queryText(req.query.sortBy) ?? queryText(req.query.sort) ?? "views";
  const sortColumn = orderByFields[sortKey];
  const direction = (queryText(req.query.sortOrder) ?? queryText(req.query.order) ?? "desc").toLowerCase();
  if (!sortColumn || !["asc", "desc"].includes(direction)) throw Object.assign(new Error("Unsupported menu usage sort field or order"), { status: 400 });
  const rows = await prisma.$queryRaw<Array<Record<string, unknown> & { totalRecords: number }>>`
    WITH current_usage AS (
      SELECT a."menuId", COALESCE(a."menuNameSnapshot", m."label", 'N/A') AS menu,
        COALESCE(p."label", 'N/A') AS "parentMenu", COALESCE(m."path", 'N/A') AS route,
        COUNT(*)::int AS "totalViews", COUNT(DISTINCT a."userId")::int AS "uniqueUsers",
        COUNT(DISTINCT a."userId") FILTER (WHERE a."actorType" = 'VENDOR')::int AS "vendorUsers",
        COUNT(DISTINCT a."userId") FILTER (WHERE a."actorType" = 'STAFF')::int AS "staffUsers",
        COUNT(DISTINCT a."userId") FILTER (WHERE a."actorType" = 'ADMIN')::int AS "adminUsers",
        STRING_AGG(DISTINCT a."actorType"::text, ', ' ORDER BY a."actorType"::text) AS roles,
        MIN(a."createdAt") AS "firstUsed", MAX(a."createdAt") AS "lastUsed",
        COALESCE(AVG(a."durationMs"), 0)::int AS "averageDurationMs",
        COALESCE(SUM(a."durationMs"), 0)::int AS "totalDurationMs",
        COALESCE(m."showInSidebar", false) AS "isActive"
      FROM "UserTrackingActivity" a LEFT JOIN "Menu" m ON m."id" = a."menuId"
        LEFT JOIN "Menu" p ON p."id" = m."parentId"
      WHERE ${filters} AND a."createdAt" BETWEEN ${range.gte} AND ${range.lte} AND a."menuId" IS NOT NULL
      GROUP BY a."menuId", a."menuNameSnapshot", m."label", p."label", m."path", m."showInSidebar"
    )
    SELECT current_usage.*,
      ROUND("totalViews"::numeric * 100 / NULLIF(SUM("totalViews") OVER (), 0), 2) AS percentage,
      ROUND("totalViews"::numeric / NULLIF("uniqueUsers", 0), 2) AS "averageUsagePerUser",
      CASE WHEN previous."views" IS NULL OR previous."views" = 0 THEN 'NEW'
        WHEN "totalViews" > previous."views" THEN 'UP'
        WHEN "totalViews" < previous."views" THEN 'DOWN' ELSE 'STABLE' END AS trend,
      COUNT(*) OVER()::int AS "totalRecords"
    FROM current_usage
    LEFT JOIN LATERAL (
      SELECT COUNT(*)::int AS views FROM "UserTrackingActivity" old
      WHERE old."menuId" = current_usage."menuId" AND old."createdAt" >= ${new Date(range.gte.getTime() - (range.lte.getTime() - range.gte.getTime()))}
        AND old."createdAt" < ${range.gte} AND (old."eventType" = 'MENU_VIEW' OR (old."eventType" = 'PAGE_VIEW' AND old."menuId" IS NOT NULL))
        AND ${previousFilters}
    ) previous ON true
    ORDER BY ${Prisma.raw(sortColumn)} ${Prisma.raw(direction)}, "menu" ASC
    LIMIT ${pageSize} OFFSET ${skip}
  `;
  const total = rows[0]?.totalRecords ?? 0;
  const data = rows.map(({ roles, isActive, totalRecords: _totalRecords, ...row }) => ({
    ...row,
    role: roles ?? "N/A",
    status: isActive ? "VISIBLE" : "HIDDEN",
  }));
  res.json(paginatedResponse(data, page, pageSize, total));
};

export const customerAppUsage = async (req: Request, res: Response) => {
  const { page, pageSize, skip } = pagination(req);
  const range = dateRange(req);
  const filters = usageFilters(req, "SCREEN_VIEW");
  const sortFields: Record<string, string> = {
    customer: `"customer"`, userName: `"customer"`, screen: `"screen"`, views: `"viewCount"`,
    viewCount: `"viewCount"`, actionCount: `"actionCount"`, totalDuration: `"totalDurationMs"`,
    firstVisit: `"firstVisit"`, lastVisit: `"lastVisit"`,
  };
  const sortKey = queryText(req.query.sortBy) ?? queryText(req.query.sort) ?? "views";
  const sortColumn = sortFields[sortKey];
  const direction = (queryText(req.query.sortOrder) ?? queryText(req.query.order) ?? "desc").toLowerCase();
  if (!sortColumn || !["asc", "desc"].includes(direction)) throw Object.assign(new Error("Unsupported customer app usage sort field or order"), { status: 400 });
  const rows = await prisma.$queryRaw<Array<Record<string, unknown> & { totalRecords: number }>>`
    WITH screen_usage AS (
      SELECT a."userId", COALESCE(NULLIF(CONCAT_WS(' ', u."firstName", u."lastName"), ''), 'Unknown customer') AS customer,
        a."screenName" AS screen, COALESCE(MAX(a."route"), 'N/A') AS "screenRoute",
        (ARRAY_AGG(a."sessionId" ORDER BY a."createdAt" DESC) FILTER (WHERE a."sessionId" IS NOT NULL))[1] AS "sessionId",
        COUNT(DISTINCT a."sessionId")::int AS "sessionCount",
        COUNT(*) FILTER (WHERE a."eventType" = 'SCREEN_VIEW' AND COALESCE(a."action", '') NOT IN ('SCREEN_EXIT', 'EXIT'))::int AS "viewCount",
        COUNT(*) FILTER (WHERE a."eventType" <> 'SCREEN_VIEW')::int AS "actionCount",
        COALESCE(SUM(a."durationMs"), 0)::int AS "totalDurationMs",
        COALESCE(AVG(a."durationMs"), 0)::int AS "averageDurationMs",
        MIN(a."createdAt") AS "firstVisit", MAX(a."createdAt") AS "lastVisit"
      FROM "UserTrackingActivity" a JOIN "User" u ON u."id" = a."userId"
      WHERE ${filters} AND a."createdAt" BETWEEN ${range.gte} AND ${range.lte} AND a."screenName" IS NOT NULL
      GROUP BY a."userId", u."firstName", u."lastName", a."screenName"
    )
    SELECT screen_usage.*,
      LEFT(COALESCE(latest."sessionId", screen_usage."sessionId"), 8) AS "sessionReference",
      COALESCE(latest."deviceName", latest."deviceType", 'N/A') AS device,
      COALESCE(latest.browser, 'N/A') AS browser,
      COALESCE(latest."operatingSystem", 'N/A') AS "operatingSystem",
      COALESCE(latest."appVersion", 'N/A') AS "appVersion",
      COALESCE(latest.city, 'N/A') AS city, COALESCE(latest.state, 'N/A') AS state,
      CASE WHEN u."isActive" THEN 'ACTIVE' ELSE 'INACTIVE' END AS status,
      CASE WHEN latest."status" = 'ACTIVE' AND latest."lastActivityAt" >= ${new Date(Date.now() - activeWindowMs())} THEN 'ONLINE' ELSE 'OFFLINE' END AS "sessionStatus",
      COUNT(*) OVER()::int AS "totalRecords"
    FROM screen_usage JOIN "User" u ON u."id" = screen_usage."userId"
    LEFT JOIN LATERAL (
      SELECT s."sessionId", s."deviceName", s."deviceType", s.browser, s."operatingSystem", s."appVersion", s.city, s.state, s."status", s."lastActivityAt"
      FROM "UserTrackingSession" s WHERE s."sessionId" = screen_usage."sessionId" AND s."userId" = screen_usage."userId"
      ORDER BY s."loginAt" DESC LIMIT 1
    ) latest ON true
    ORDER BY ${Prisma.raw(sortColumn)} ${Prisma.raw(direction)}, "screen" ASC
    LIMIT ${pageSize} OFFSET ${skip}
  `;
  const total = rows[0]?.totalRecords ?? 0;
  const data = rows.map(({ totalRecords: _totalRecords, ...row }) => row);
  res.json(paginatedResponse(data, page, pageSize, total));
};

export const analytics = async (req: Request, res: Response) => {
  const range = dateRange(req);
  const rangeMs = range.lte.getTime() - range.gte.getTime();
  const previousRange = { gte: new Date(range.gte.getTime() - rangeMs), lte: new Date(range.gte.getTime() - 1) };
  const sessionWhere = sessionSqlFilters(req);
  const requestedPeriod = queryText(req.query.period)?.toLowerCase() ?? "daily";
  const period = requestedPeriod === "weekly" ? "week" : requestedPeriod === "monthly" ? "month" : requestedPeriod === "daily" ? "day" : null;
  if (!period) throw Object.assign(new Error("period must be daily, weekly, or monthly"), { status: 400 });
  const periodSql = Prisma.raw(`'${period}'`);
  const [logins, activeTime, crmMenus, appScreens, previousMenus, previousScreens] = await Promise.all([
    prisma.$queryRaw<Array<{ period: Date; actorType: TrackingActorType; count: number }>>`
      SELECT date_trunc(${periodSql}, s."loginAt") AS period, s."actorType", COUNT(*)::int AS count
      FROM "UserTrackingSession" s WHERE s."loginAt" BETWEEN ${range.gte} AND ${range.lte} AND ${sessionWhere}
      GROUP BY date_trunc(${periodSql}, s."loginAt"), s."actorType" ORDER BY period
    `,
    prisma.$queryRaw<Array<{ period: Date; actorType: TrackingActorType; seconds: number; activeUsers: number }>>`
      SELECT date_trunc(${periodSql}, s."loginAt") AS period, s."actorType",
        SUM(s."activeDurationSeconds")::int AS seconds, COUNT(DISTINCT s."userId")::int AS "activeUsers"
      FROM "UserTrackingSession" s WHERE s."loginAt" BETWEEN ${range.gte} AND ${range.lte} AND ${sessionWhere}
      GROUP BY date_trunc(${periodSql}, s."loginAt"), s."actorType" ORDER BY period
    `,
    usageRows("MENU_VIEW", range, req),
    usageRows("SCREEN_VIEW", range, req),
    usageRows("MENU_VIEW", previousRange, req, null),
    usageRows("SCREEN_VIEW", previousRange, req, null),
  ]);
  const activityWhere = activitySqlFilters(req);
  const [
    summaryRows, sessionRows, userRows, roleRows, deviceRows, browserRows, osRows, locationRows,
    menuViewCount, screenViewCount,
  ] = await Promise.all([
    prisma.$queryRaw<Array<{ totalUsers: number; totalSessions: number; activeSessions: number; totalActivities: number; activeUsers: number; averageSessionSeconds: number }>>`
      SELECT
        (SELECT COUNT(DISTINCT s."userId")::int FROM "UserTrackingSession" s WHERE s."loginAt" BETWEEN ${range.gte} AND ${range.lte} AND ${sessionWhere}) AS "totalUsers",
        (SELECT COUNT(*)::int FROM "UserTrackingSession" s WHERE s."loginAt" BETWEEN ${range.gte} AND ${range.lte} AND ${sessionWhere}) AS "totalSessions",
        (SELECT COUNT(*)::int FROM "UserTrackingSession" s WHERE s."loginAt" BETWEEN ${range.gte} AND ${range.lte} AND s."status" = 'ACTIVE' AND ${sessionWhere}) AS "activeSessions",
        (SELECT COUNT(*)::int FROM "UserTrackingActivity" a WHERE a."createdAt" BETWEEN ${range.gte} AND ${range.lte} AND ${activityWhere}) AS "totalActivities",
        (SELECT COUNT(DISTINCT a."userId")::int FROM "UserTrackingActivity" a WHERE a."createdAt" BETWEEN ${range.gte} AND ${range.lte} AND ${activityWhere}) AS "activeUsers",
        (SELECT COALESCE(AVG(CASE WHEN s."status" = 'ACTIVE' THEN EXTRACT(EPOCH FROM (NOW() - s."loginAt")) ELSE s."totalDurationSeconds" END), 0)::int FROM "UserTrackingSession" s WHERE s."loginAt" BETWEEN ${range.gte} AND ${range.lte} AND ${sessionWhere}) AS "averageSessionSeconds"
    `,
    prisma.$queryRaw<Array<{ loginCount: number; logoutCount: number; averageSessionSeconds: number; shortSessions: number; mediumSessions: number; longSessions: number; activeSessions: number }>>`
      SELECT COUNT(*)::int AS "loginCount",
        (SELECT COUNT(*)::int FROM "UserTrackingActivity" a WHERE a."eventType" = 'LOGOUT' AND a."createdAt" BETWEEN ${range.gte} AND ${range.lte} AND ${activityWhere}) AS "logoutCount",
        COALESCE(AVG(CASE WHEN s."status" = 'ACTIVE' THEN EXTRACT(EPOCH FROM (NOW() - s."loginAt")) ELSE s."totalDurationSeconds" END), 0)::int AS "averageSessionSeconds",
        COUNT(*) FILTER (WHERE CASE WHEN s."status" = 'ACTIVE' THEN EXTRACT(EPOCH FROM (NOW() - s."loginAt")) ELSE s."totalDurationSeconds" END < 900)::int AS "shortSessions",
        COUNT(*) FILTER (WHERE CASE WHEN s."status" = 'ACTIVE' THEN EXTRACT(EPOCH FROM (NOW() - s."loginAt")) ELSE s."totalDurationSeconds" END BETWEEN 900 AND 3599)::int AS "mediumSessions",
        COUNT(*) FILTER (WHERE CASE WHEN s."status" = 'ACTIVE' THEN EXTRACT(EPOCH FROM (NOW() - s."loginAt")) ELSE s."totalDurationSeconds" END >= 3600)::int AS "longSessions",
        COUNT(*) FILTER (WHERE s."status" = 'ACTIVE')::int AS "activeSessions"
      FROM "UserTrackingSession" s WHERE s."loginAt" BETWEEN ${range.gte} AND ${range.lte} AND ${sessionWhere}
    `,
    prisma.$queryRaw<Array<{ dau: number; wau: number; mau: number; returningUsers: number; newUsers: number; retentionRate: number | null }>>`
      WITH active_users AS (
        SELECT DISTINCT a."userId" FROM "UserTrackingActivity" a WHERE a."createdAt" BETWEEN ${range.gte} AND ${range.lte} AND ${activityWhere}
      ), first_seen AS (SELECT a."userId", MIN(a."createdAt") AS first_seen FROM "UserTrackingActivity" a GROUP BY a."userId")
      SELECT
        (SELECT COUNT(DISTINCT a."userId")::int FROM "UserTrackingActivity" a WHERE a."createdAt" >= NOW() - INTERVAL '1 day' AND a."createdAt" BETWEEN ${range.gte} AND ${range.lte} AND ${activityWhere}) AS dau,
        (SELECT COUNT(DISTINCT a."userId")::int FROM "UserTrackingActivity" a WHERE a."createdAt" >= NOW() - INTERVAL '7 days' AND a."createdAt" BETWEEN ${range.gte} AND ${range.lte} AND ${activityWhere}) AS wau,
        (SELECT COUNT(DISTINCT a."userId")::int FROM "UserTrackingActivity" a WHERE a."createdAt" >= NOW() - INTERVAL '30 days' AND a."createdAt" BETWEEN ${range.gte} AND ${range.lte} AND ${activityWhere}) AS mau,
        (SELECT COUNT(*)::int FROM active_users au JOIN first_seen fs ON fs."userId" = au."userId" WHERE fs.first_seen < ${range.gte}) AS "returningUsers",
        (SELECT COUNT(*)::int FROM active_users au JOIN first_seen fs ON fs."userId" = au."userId" WHERE fs.first_seen BETWEEN ${range.gte} AND ${range.lte}) AS "newUsers",
        CASE WHEN (SELECT COUNT(*) FROM active_users) = 0 THEN NULL ELSE
          ROUND((SELECT COUNT(*)::numeric FROM active_users au JOIN first_seen fs ON fs."userId" = au."userId" WHERE fs.first_seen < ${range.gte}) * 100 /
          NULLIF((SELECT COUNT(*) FROM active_users), 0), 2) END::float AS "retentionRate"
    `,
    prisma.$queryRaw<Array<{ role: TrackingActorType; users: number; sessions: number; activities: number; averageSessionDuration: number }>>`
      WITH session_stats AS (
        SELECT s."actorType", COUNT(DISTINCT s."userId")::int AS users, COUNT(*)::int AS sessions,
          COALESCE(AVG(CASE WHEN s."status" = 'ACTIVE' THEN EXTRACT(EPOCH FROM (NOW() - s."loginAt")) ELSE s."totalDurationSeconds" END), 0)::int AS "averageSessionDuration"
        FROM "UserTrackingSession" s WHERE s."loginAt" BETWEEN ${range.gte} AND ${range.lte} AND ${sessionWhere} GROUP BY s."actorType"
      ), activity_stats AS (
        SELECT a."actorType", COUNT(*)::int AS activities FROM "UserTrackingActivity" a
        WHERE a."createdAt" BETWEEN ${range.gte} AND ${range.lte} AND ${activityWhere} GROUP BY a."actorType"
      )
      SELECT COALESCE(s."actorType", a."actorType") AS role, COALESCE(s.users, 0)::int AS users,
        COALESCE(s.sessions, 0)::int AS sessions, COALESCE(a.activities, 0)::int AS activities,
        COALESCE(s."averageSessionDuration", 0)::int AS "averageSessionDuration"
      FROM session_stats s FULL JOIN activity_stats a ON a."actorType" = s."actorType" ORDER BY role
    `,
    prisma.$queryRaw<Array<{ device: string; users: number; sessions: number; activities: number; percentage: number }>>`
      SELECT COALESCE(s."deviceType", 'N/A') AS device, COUNT(DISTINCT s."userId")::int AS users, COUNT(DISTINCT s."sessionId")::int AS sessions,
        COUNT(a.id)::int AS activities, ROUND(COUNT(DISTINCT s."sessionId")::numeric * 100 / NULLIF(SUM(COUNT(DISTINCT s."sessionId")) OVER (), 0), 2) AS percentage
      FROM "UserTrackingSession" s LEFT JOIN "UserTrackingActivity" a ON a."sessionId" = s."sessionId" AND a."createdAt" BETWEEN ${range.gte} AND ${range.lte}
      WHERE s."loginAt" BETWEEN ${range.gte} AND ${range.lte} AND ${sessionWhere} GROUP BY s."deviceType" ORDER BY sessions DESC
    `,
    prisma.$queryRaw<Array<{ browser: string; users: number; sessions: number; percentage: number }>>`
      SELECT COALESCE(s."browser", 'N/A') AS browser, COUNT(DISTINCT s."userId")::int AS users, COUNT(*)::int AS sessions,
        ROUND(COUNT(*)::numeric * 100 / NULLIF(SUM(COUNT(*)) OVER (), 0), 2) AS percentage
      FROM "UserTrackingSession" s WHERE s."loginAt" BETWEEN ${range.gte} AND ${range.lte} AND ${sessionWhere} GROUP BY s."browser" ORDER BY sessions DESC
    `,
    prisma.$queryRaw<Array<{ os: string; users: number; sessions: number; percentage: number }>>`
      SELECT COALESCE(s."operatingSystem", 'N/A') AS os, COUNT(DISTINCT s."userId")::int AS users, COUNT(*)::int AS sessions,
        ROUND(COUNT(*)::numeric * 100 / NULLIF(SUM(COUNT(*)) OVER (), 0), 2) AS percentage
      FROM "UserTrackingSession" s WHERE s."loginAt" BETWEEN ${range.gte} AND ${range.lte} AND ${sessionWhere} GROUP BY s."operatingSystem" ORDER BY sessions DESC
    `,
    prisma.$queryRaw<Array<{ country: string; state: string; city: string; users: number; sessions: number; activities: number }>>`
      SELECT COALESCE(s.country, 'N/A') AS country, COALESCE(s.state, 'N/A') AS state, COALESCE(s.city, 'N/A') AS city,
        COUNT(DISTINCT s."userId")::int AS users, COUNT(DISTINCT s."sessionId")::int AS sessions, COUNT(a.id)::int AS activities
      FROM "UserTrackingSession" s LEFT JOIN "UserTrackingActivity" a ON a."sessionId" = s."sessionId" AND a."createdAt" BETWEEN ${range.gte} AND ${range.lte}
      WHERE s."loginAt" BETWEEN ${range.gte} AND ${range.lte} AND ${sessionWhere}
      GROUP BY s.country, s.state, s.city ORDER BY sessions DESC
    `,
    usageTotal(req, "MENU_VIEW", range),
    usageTotal(req, "SCREEN_VIEW", range),
  ]);
  const summary = summaryRows[0] ?? { totalUsers: 0, totalSessions: 0, activeSessions: 0, totalActivities: 0, activeUsers: 0, averageSessionSeconds: 0 };
  const sessionStats = sessionRows[0] ?? { loginCount: 0, logoutCount: 0, averageSessionSeconds: 0, shortSessions: 0, mediumSessions: 0, longSessions: 0, activeSessions: 0 };
  const userStats = userRows[0] ?? { dau: 0, wau: 0, mau: 0, returningUsers: 0, newUsers: 0, retentionRate: null };
  const usageTrend = (name: string | null, views: number, previous: typeof previousMenus) => {
    const previousViews = previous.find((item) => item.name === name)?.visitCount ?? 0;
    return previousViews === 0 ? "NEW" : views > previousViews ? "UP" : views < previousViews ? "DOWN" : "STABLE";
  };
  const data = {
    period: requestedPeriod,
    dateRange: { from: range.gte, to: range.lte },
    logins, activeTime,
    summary: {
      totalUsers: summary.totalUsers, activeUsers: summary.activeUsers, newActiveUsers: userStats.newUsers,
      totalSessions: summary.totalSessions, averageSession: summary.averageSessionSeconds,
      totalActivities: summary.totalActivities, totalMenuViews: menuViewCount, totalAppScreenViews: screenViewCount,
    },
    userAnalytics: { dau: userStats.dau, wau: userStats.wau, mau: userStats.mau, returningUsers: userStats.returningUsers, newUsers: userStats.newUsers, retentionRate: userStats.retentionRate },
    sessionAnalytics: { ...sessionStats },
    roleAnalytics: roleRows,
    menuAnalytics: crmMenus.map((item) => ({
      menu: item.name, views: item.visitCount, uniqueUsers: item.uniqueUsers, averageDuration: item.averageDurationMs,
      percentage: menuViewCount ? Number((item.visitCount * 100 / menuViewCount).toFixed(2)) : 0, trend: usageTrend(item.name, item.visitCount, previousMenus),
    })),
    customerAppAnalytics: appScreens.map((item) => ({
      screen: item.name, views: item.visitCount, uniqueCustomers: item.uniqueUsers, averageDuration: item.averageDurationMs,
      percentage: screenViewCount ? Number((item.visitCount * 100 / screenViewCount).toFixed(2)) : 0, trend: usageTrend(item.name, item.visitCount, previousScreens),
    })),
    deviceAnalytics: deviceRows, browserAnalytics: browserRows, osAnalytics: osRows, locationAnalytics: locationRows,
    crmMenus, appScreens,
  };
  res.json({ success: true, data });
};

function userWhere(req: Request, type?: TrackingActorType): Prisma.UserWhereInput {
  const where: Prisma.UserWhereInput = {};
  const and: Prisma.UserWhereInput[] = [];
  const userId = queryText(req.query.userId);
  if (userId) where.id = userId;
  if (!type) {
    where.OR = [
      { roles: { some: { role: { name: "VENDOR" } } } },
      { staffIn: { some: { isActive: true } } },
      { salonCustomers: { some: {} } },
    ];
  } else if (type === TrackingActorType.ADMIN) {
    where.id = "__tracking_admin_not_collected__";
  }
  const roleName = type === TrackingActorType.VENDOR ? "VENDOR" : type === TrackingActorType.CUSTOMER ? "CUSTOMER" : undefined;
  if (roleName) where.roles = { some: { role: { name: roleName } } };
  if (type === TrackingActorType.STAFF) where.staffIn = { some: { isActive: true } };
  if (type === TrackingActorType.CUSTOMER) where.salonCustomers = { some: {} };
  const search = queryText(req.query.search);
  if (search) and.push({ OR: [
    { firstName: { contains: search, mode: "insensitive" } },
    { lastName: { contains: search, mode: "insensitive" } },
    { email: { contains: search, mode: "insensitive" } },
    { phone: { contains: search, mode: "insensitive" } },
    { ownedSalons: { some: { name: { contains: search, mode: "insensitive" } } } },
    { staffIn: { some: { salon: { name: { contains: search, mode: "insensitive" } } } } },
    { salonCustomers: { some: { salon: { name: { contains: search, mode: "insensitive" } } } } },
  ] });
  const vendorId = queryText(req.query.vendorId);
  if (vendorId) {
    if (type === TrackingActorType.VENDOR) where.id = vendorId;
    else and.push({ OR: [{ ownedSalons: { some: { ownerId: vendorId } } }, { staffIn: { some: { salon: { ownerId: vendorId } } } }, { salonCustomers: { some: { salon: { ownerId: vendorId } } } }] });
  }
  const salonId = queryText(req.query.salonId);
  if (salonId) and.push({ OR: [{ ownedSalons: { some: { id: salonId } } }, { staffIn: { some: { salonId } } }, { salonCustomers: { some: { salonId } } }] });
  const branchId = queryText(req.query.branchId);
  if (branchId) and.push({ OR: [{ staffIn: { some: { salonId: branchId } } }, { salonCustomers: { some: { salonId: branchId } } }] });
  const staffId = queryText(req.query.staffId);
  if (staffId) and.push({ staffIn: { some: { id: staffId } } });
  const customerId = queryText(req.query.customerId);
  if (customerId) where.id = customerId;
  const roleId = queryText(req.query.roleId);
  if (roleId) and.push({ OR: [{ roles: { some: { roleId } } }, { staffIn: { some: { staffRoleId: roleId } } }] });
  const role = queryText(req.query.role);
  if (role) {
    const normalized = role.toUpperCase();
    if (Object.values(TrackingActorType).includes(normalized as TrackingActorType)) {
      where.roles = { some: { role: { name: normalized } } };
      if (normalized === TrackingActorType.STAFF) where.staffIn = { some: { isActive: true } };
      if (normalized === TrackingActorType.CUSTOMER) where.salonCustomers = { some: {} };
    } else {
      and.push({ OR: [{ roles: { some: { role: { name: { contains: role, mode: "insensitive" } } } } }, { staffIn: { some: { staffRole: { name: { contains: role, mode: "insensitive" } } } } }] });
    }
  }
  const range = dateRange(req);
  and.push({ OR: [
    { trackingSessions: { some: { loginAt: range } } },
    { trackingActivities: { some: { createdAt: range } } },
  ] });
  const device = queryText(req.query.deviceType) ?? queryText(req.query.device);
  const browser = queryText(req.query.browser);
  const os = queryText(req.query.os) ?? queryText(req.query.operatingSystem);
  const city = queryText(req.query.city);
  const state = queryText(req.query.state);
  const sessionCriteria: Prisma.UserTrackingSessionWhereInput = {};
  if (device) sessionCriteria.deviceType = stringFilter(device);
  if (browser) sessionCriteria.browser = stringFilter(browser);
  if (os) sessionCriteria.operatingSystem = stringFilter(os);
  if (city) sessionCriteria.city = stringFilter(city);
  if (state) sessionCriteria.state = stringFilter(state);
  const status = queryText(req.query.status)?.toUpperCase();
  if (status) {
    const sessionStatus = status === "COMPLETED" ? "LOGGED_OUT" : status;
    if (!Object.values(TrackingSessionStatus).includes(sessionStatus as TrackingSessionStatus)) throw Object.assign(new Error("Invalid session status"), { status: 400 });
    sessionCriteria.status = sessionStatus as TrackingSessionStatus;
  }
  if (Object.keys(sessionCriteria).length) and.push({ trackingSessions: { some: sessionCriteria } });
  const online = onlineFilter(req);
  if (online === "true") where.trackingSessions = { some: { status: "ACTIVE", lastActivityAt: { gte: new Date(Date.now() - activeWindowMs()) } } };
  if (online === "false") and.push({ trackingSessions: { none: { status: "ACTIVE", lastActivityAt: { gte: new Date(Date.now() - activeWindowMs()) } } } });
  const eventType = queryText(req.query.eventType)?.toUpperCase();
  if (eventType) and.push({ trackingActivities: { some: { eventType } } });
  const menuId = queryText(req.query.menuId);
  if (menuId) and.push({ trackingActivities: { some: { menuId } } });
  const screenName = queryText(req.query.screenName);
  if (screenName) and.push({ trackingActivities: { some: { screenName: { contains: screenName, mode: "insensitive" } } } });
  const action = queryText(req.query.action);
  if (action) and.push({ trackingActivities: { some: { action: { equals: action, mode: "insensitive" } } } });
  if (and.length) where.AND = and;
  return where;
}

export const users = async (req: Request, res: Response) => {
  const type = actorType(req.query.actorType);
  await listUsers(req, res, type);
};

async function listUsers(req: Request, res: Response, type?: TrackingActorType) {
  const { page, pageSize, skip } = pagination(req);
  const where = userWhere(req, type);
  const [items, total] = await Promise.all([
    prisma.user.findMany({
      where, orderBy: userSortOrder(req), skip, take: pageSize,
      select: {
        id: true, firstName: true, lastName: true, email: true, phone: true, countryCode: true, isActive: true,
        roles: { select: { role: { select: { name: true } } } },
        ownedSalons: { where: { isActive: true }, take: 20, select: { id: true, name: true, isActive: true, parentId: true } },
        staffIn: { where: { isActive: true }, take: 1, select: { id: true, salonId: true, isActive: true, role: true, staffRole: { select: { name: true } }, salon: { select: { id: true, name: true, ownerId: true, parentId: true } } } },
        salonCustomers: { take: 1, select: { salonId: true, salon: { select: { id: true, name: true, ownerId: true, parentId: true } } } },
      },
    }),
    prisma.user.count({ where }),
  ]);
  const ids = items.map(({ id }) => id);
  const range = dateRange(req);
  const periodMs = range.lte.getTime() - range.gte.getTime();
  const previousRange = { gte: new Date(range.gte.getTime() - periodMs), lte: new Date(range.gte.getTime() - 1) };
  const sessionWhere = { userId: { in: ids }, loginAt: range };
  const activityWhere = { userId: { in: ids }, createdAt: range };
  const previousActivityWhere = await activityFilters(req);
  previousActivityWhere.userId = { in: ids };
  previousActivityWhere.createdAt = previousRange;
  const [latestRows, lastActivityRows, summaries, popular, screenPopularity, moduleRows, sessionCounts, activityCounts, bookingCounts, menuCounts, previousActivityCounts] = ids.length ? await Promise.all([
    prisma.$queryRaw<Array<{ userId: string; loginAt: Date; lastActivityAt: Date; status: TrackingSessionStatus }>>`
      SELECT DISTINCT ON ("userId") "userId", "loginAt", "lastActivityAt", "status"
      FROM "UserTrackingSession" WHERE "userId" IN (${Prisma.join(ids)}) AND "loginAt" BETWEEN ${range.gte} AND ${range.lte}
      ORDER BY "userId", "loginAt" DESC
    `,
    prisma.$queryRaw<Array<{ userId: string; createdAt: Date; eventType: string }>>`
      SELECT DISTINCT ON ("userId") "userId", "createdAt", "eventType"
      FROM "UserTrackingActivity" WHERE "userId" IN (${Prisma.join(ids)}) AND "createdAt" BETWEEN ${range.gte} AND ${range.lte}
      ORDER BY "userId", "createdAt" DESC
    `,
    prisma.userTrackingSession.groupBy({ by: ["userId"], where: sessionWhere, _count: { id: true }, _sum: { activeDurationSeconds: true }, _avg: { totalDurationSeconds: true } }),
    prisma.$queryRaw<Array<{ userId: string; name: string | null }>>`
      SELECT ranked."userId", ranked.name FROM (
        SELECT "userId", COALESCE("menuNameSnapshot", "screenName") AS name,
          ROW_NUMBER() OVER (PARTITION BY "userId" ORDER BY COUNT(*) DESC) AS rank
        FROM "UserTrackingActivity" WHERE "userId" IN (${Prisma.join(ids)}) AND "createdAt" BETWEEN ${range.gte} AND ${range.lte} AND "eventType" IN ('MENU_VIEW', 'SCREEN_VIEW')
        GROUP BY "userId", COALESCE("menuNameSnapshot", "screenName")
      ) ranked WHERE ranked.rank = 1
    `,
    prisma.$queryRaw<Array<{ userId: string; screenName: string }>>`
      SELECT ranked."userId", ranked."screenName" FROM (
        SELECT "userId", "screenName", ROW_NUMBER() OVER (PARTITION BY "userId" ORDER BY COUNT(*) DESC) AS rank
        FROM "UserTrackingActivity" WHERE "userId" IN (${Prisma.join(ids)}) AND "createdAt" BETWEEN ${range.gte} AND ${range.lte} AND "eventType" = 'SCREEN_VIEW' AND "screenName" IS NOT NULL
        GROUP BY "userId", "screenName"
      ) ranked WHERE ranked.rank = 1
    `,
    prisma.$queryRaw<Array<{ userId: string; moduleName: string }>>`
      SELECT ranked."userId", ranked."moduleName" FROM (
        SELECT "userId", "moduleName",
          ROW_NUMBER() OVER (PARTITION BY "userId" ORDER BY COUNT(*) DESC) AS rn
        FROM "UserTrackingActivity" WHERE "userId" IN (${Prisma.join(ids)}) AND "createdAt" BETWEEN ${range.gte} AND ${range.lte} AND "moduleName" IS NOT NULL
        GROUP BY "userId", "moduleName"
      ) ranked WHERE ranked.rn = 1
    `,
    prisma.userTrackingSession.groupBy({ by: ["userId", "status"], where: sessionWhere, _count: { id: true } }),
    prisma.userTrackingActivity.groupBy({ by: ["userId", "eventType"], where: activityWhere, _count: { id: true } }),
    type === TrackingActorType.CUSTOMER
      ? prisma.booking.groupBy({ by: ["customerId"], where: { customerId: { in: ids }, createdAt: range }, _count: { id: true } })
      : Promise.resolve([]),
    prisma.$queryRaw<Array<{ userId: string; count: number }>>`
      SELECT "userId", COUNT(*)::int AS count FROM "UserTrackingActivity"
      WHERE "userId" IN (${Prisma.join(ids)}) AND "createdAt" BETWEEN ${range.gte} AND ${range.lte} AND "eventType" = 'MENU_VIEW'
      GROUP BY "userId"
    `,
    prisma.userTrackingActivity.groupBy({ by: ["userId"], where: previousActivityWhere, _count: { id: true } }),
  ]) : [[], [], [], [], [], [], [], [], [], [], []];
  const latestByUser = new Map(latestRows.map((row) => [row.userId, row]));
  const lastActivityByUser = new Map(lastActivityRows.map((row) => [row.userId, row]));
  const summariesByUser = new Map(summaries.map((row) => [row.userId, row]));
  const popularByUser = new Map(popular.map((row) => [row.userId, row.name]));
  const popularScreensByUser = new Map(screenPopularity.map((row) => [row.userId, row.screenName]));
  const moduleByUser = new Map(moduleRows.map((row) => [row.userId, row.moduleName]));
  const activityCountByUser = new Map<string, number>();
  const screenCountByUser = new Map<string, number>();
  for (const row of activityCounts) {
    activityCountByUser.set(row.userId, (activityCountByUser.get(row.userId) ?? 0) + row._count.id);
    if (row.eventType === "SCREEN_VIEW") screenCountByUser.set(row.userId, (screenCountByUser.get(row.userId) ?? 0) + row._count.id);
  }
  const sessionsByUser = new Map<string, { total: number; active: number; completed: number; expired: number; appSessions: number }>();
  for (const row of sessionCounts) {
    const counts = sessionsByUser.get(row.userId) ?? { total: 0, active: 0, completed: 0, expired: 0, appSessions: 0 };
    counts.total += row._count.id;
    if (row.status === TrackingSessionStatus.ACTIVE) counts.active += row._count.id;
    else if (row.status === TrackingSessionStatus.LOGGED_OUT) counts.completed += row._count.id;
    else counts.expired += row._count.id;
    sessionsByUser.set(row.userId, counts);
  }
  const bookingCountByUser = new Map(bookingCounts.map((row) => [row.customerId, row._count.id]));
  const menuCountByUser = new Map(menuCounts.map((row) => [row.userId, row.count]));
  const previousActivityCountByUser = new Map(previousActivityCounts.map((row) => [row.userId, row._count.id]));
  const vendorOwnerIds = [...new Set(items.flatMap((user) => [
    ...user.staffIn.map((staffRow) => staffRow.salon.ownerId),
    ...user.salonCustomers.map((customerRow) => customerRow.salon.ownerId),
  ]))];
  const vendorOwners = vendorOwnerIds.length ? await prisma.user.findMany({
    where: { id: { in: vendorOwnerIds } }, select: { id: true, firstName: true, lastName: true },
  }) : [];
  const vendorOwnerNames = new Map(vendorOwners.map((vendor) => [vendor.id, `${vendor.firstName} ${vendor.lastName ?? ""}`.trim()]));
  const staffCountsByVendor = type === TrackingActorType.VENDOR && ids.length ? await prisma.$queryRaw<Array<{ vendorId: string; count: number }>>`
    SELECT salon."ownerId" AS "vendorId", COUNT(DISTINCT ss."userId")::int AS count
    FROM "SalonStaff" ss JOIN "Salon" salon ON salon.id = ss."salonId"
    WHERE salon."ownerId" IN (${Prisma.join(ids)}) AND ss."isActive" = true GROUP BY salon."ownerId"
  ` : [];
  const staffCountMap = new Map(staffCountsByVendor.map((row) => [row.vendorId, row.count]));
  const latestDevices = ids.length ? await prisma.$queryRaw<Array<{ userId: string; deviceType: string | null; browser: string | null; operatingSystem: string | null; appVersion: string | null; city: string | null; state: string | null }>>`
    SELECT DISTINCT ON ("userId") "userId", "deviceType", "browser", "operatingSystem", "appVersion", "city", "state"
    FROM "UserTrackingSession" WHERE "userId" IN (${Prisma.join(ids)}) AND "loginAt" BETWEEN ${range.gte} AND ${range.lte}
    ORDER BY "userId", "loginAt" DESC
  ` : [];
  const deviceByUser = new Map(latestDevices.map((row) => [row.userId, row]));
  const [mostUsedDevices, mostUsedBrowsers, mostUsedMenus] = ids.length ? await Promise.all([
    prisma.$queryRaw<Array<{ userId: string; value: string }>>`
      SELECT ranked."userId", ranked.value FROM (
        SELECT "userId", COALESCE("deviceType", 'N/A') AS value,
          ROW_NUMBER() OVER (PARTITION BY "userId" ORDER BY COUNT(*) DESC, COALESCE("deviceType", 'N/A')) AS rank
        FROM "UserTrackingSession" WHERE "userId" IN (${Prisma.join(ids)}) AND "loginAt" BETWEEN ${range.gte} AND ${range.lte}
        GROUP BY "userId", "deviceType"
      ) ranked WHERE ranked.rank = 1
    `,
    prisma.$queryRaw<Array<{ userId: string; value: string }>>`
      SELECT ranked."userId", ranked.value FROM (
        SELECT "userId", COALESCE("browser", 'N/A') AS value,
          ROW_NUMBER() OVER (PARTITION BY "userId" ORDER BY COUNT(*) DESC, COALESCE("browser", 'N/A')) AS rank
        FROM "UserTrackingSession" WHERE "userId" IN (${Prisma.join(ids)}) AND "loginAt" BETWEEN ${range.gte} AND ${range.lte}
        GROUP BY "userId", "browser"
      ) ranked WHERE ranked.rank = 1
    `,
    prisma.$queryRaw<Array<{ userId: string; menu: string }>>`
      SELECT ranked."userId", ranked.menu FROM (
        SELECT a."userId", COALESCE(a."menuNameSnapshot", m.label, 'N/A') AS menu,
          ROW_NUMBER() OVER (PARTITION BY a."userId" ORDER BY COUNT(*) DESC) AS rank
        FROM "UserTrackingActivity" a LEFT JOIN "Menu" m ON m.id = a."menuId"
        WHERE a."userId" IN (${Prisma.join(ids)}) AND a."createdAt" BETWEEN ${range.gte} AND ${range.lte} AND a."menuId" IS NOT NULL
        GROUP BY a."userId", a."menuNameSnapshot", m.label
      ) ranked WHERE ranked.rank = 1
    `,
  ]) : [[], [], []];
  const mostDeviceByUser = new Map(mostUsedDevices.map((row) => [row.userId, row.value]));
  const mostBrowserByUser = new Map(mostUsedBrowsers.map((row) => [row.userId, row.value]));
  const mostMenuByUser = new Map(mostUsedMenus.map((row) => [row.userId, row.menu]));
  const data = items.map((user) => {
    const latest = latestByUser.get(user.id);
    const lastActivity = lastActivityByUser.get(user.id);
    const summary = summariesByUser.get(user.id);
    const sessions = sessionsByUser.get(user.id) ?? { total: 0, active: 0, completed: 0, expired: 0, appSessions: 0 };
    const currentActivityCount = activityCountByUser.get(user.id) ?? 0;
    const previousActivityCount = previousActivityCountByUser.get(user.id) ?? 0;
    const device = deviceByUser.get(user.id);
    const displayName = `${user.firstName} ${user.lastName ?? ""}`.trim();
    const primarySalon = user.ownedSalons[0] ?? user.staffIn[0]?.salon ?? user.salonCustomers[0]?.salon;
    const salonStatus = user.staffIn[0]?.isActive ?? user.ownedSalons[0]?.isActive ?? user.isActive;
    const staffRoleName = user.staffIn[0]?.staffRole?.name ?? user.staffIn[0]?.role ?? "N/A";
    return {
      id: user.id, userId: user.id, firstName: user.firstName, lastName: user.lastName, userName: displayName, staffName: type === TrackingActorType.STAFF ? displayName : undefined, vendorName: user.ownedSalons.length ? displayName : user.staffIn[0] ? vendorOwnerNames.get(user.staffIn[0].salon.ownerId) ?? "N/A" : user.salonCustomers[0] ? vendorOwnerNames.get(user.salonCustomers[0].salon.ownerId) ?? "N/A" : "N/A", customerName: type === TrackingActorType.CUSTOMER ? displayName : undefined,
      email: user.email, phone: user.phone,
      countryCode: user.countryCode, roles: user.roles.map(({ role }) => role.name),
      vendorId: user.ownedSalons.length ? user.id : user.staffIn[0]?.salon.ownerId ?? user.salonCustomers[0]?.salon.ownerId ?? null,
      salon: primarySalon ?? null, salonName: primarySalon?.name ?? "N/A",
      staffId: user.staffIn[0]?.id ?? null,
      branchId: user.staffIn[0]?.salon.parentId ? user.staffIn[0].salonId : user.salonCustomers[0]?.salon.parentId ? user.salonCustomers[0].salonId : null,
      branchName: user.staffIn[0]?.salon.parentId ? user.staffIn[0].salon.name : user.salonCustomers[0]?.salon.parentId ? user.salonCustomers[0].salon.name : "N/A",
      role: staffRoleName, roleName: staffRoleName,
      vendorStatus: user.isActive ? "ACTIVE" : "INACTIVE", staffStatus: salonStatus ? "ACTIVE" : "INACTIVE", customerStatus: user.isActive ? "ACTIVE" : "INACTIVE",
      isActive: user.isActive,
      lastLogin: latest?.loginAt ?? "N/A", lastActivityAt: lastActivity?.createdAt ?? latest?.lastActivityAt ?? "N/A",
      online: latest?.status === "ACTIVE" && latest.lastActivityAt.getTime() >= Date.now() - activeWindowMs(),
      loginCount: sessions.total,
      totalSessions: summary?._count.id ?? 0, sessionCount: summary?._count.id ?? 0, activeSessions: sessions.active,
      completedSessions: sessions.completed, expiredSessions: sessions.expired, appSessions: type === TrackingActorType.CUSTOMER ? summary?._count.id ?? 0 : 0,
      activityCount: activityCountByUser.get(user.id) ?? 0, menuViews: menuCountByUser.get(user.id) ?? 0,
      screenViews: screenCountByUser.get(user.id) ?? 0, bookingActivity: bookingCountByUser.get(user.id) ?? 0,
      activeTimeSeconds: summary?._sum.activeDurationSeconds ?? 0,
      averageSessionSeconds: Math.round(summary?._avg.totalDurationSeconds ?? 0),
      averageSessionDuration: Math.round(summary?._avg.totalDurationSeconds ?? 0),
      mostUsedMenuOrScreen: popularByUser.get(user.id) ?? "N/A",
      mostUsedMenu: type === TrackingActorType.CUSTOMER ? "N/A" : mostMenuByUser.get(user.id) ?? "N/A",
      mostUsedScreen: popularScreensByUser.get(user.id) ?? "N/A",
      mostUsedModule: moduleByUser.get(user.id) ?? "N/A",
      mostUsedDevice: mostDeviceByUser.get(user.id) ?? "N/A", mostUsedBrowser: mostBrowserByUser.get(user.id) ?? "N/A",
      device: device?.deviceType ?? "N/A", browser: device?.browser ?? "N/A", operatingSystem: device?.operatingSystem ?? "N/A",
      appVersion: device?.appVersion ?? "N/A", city: device?.city ?? "N/A", state: device?.state ?? "N/A",
      status: latest?.status === "ACTIVE" && latest.lastActivityAt.getTime() >= Date.now() - activeWindowMs() ? "ONLINE" : user.isActive ? "ACTIVE" : "INACTIVE",
      activityStatus: lastActivity ? "ACTIVE" : "INACTIVE",
      activityTrend: {
        currentPeriodActivity: currentActivityCount,
        previousPeriodActivity: previousActivityCount,
        direction: currentActivityCount > previousActivityCount ? "UP" : currentActivityCount < previousActivityCount ? "DOWN" : "STABLE",
        trendPercentage: previousActivityCount ? Number(((currentActivityCount - previousActivityCount) * 100 / previousActivityCount).toFixed(2)) : currentActivityCount ? 100 : 0,
      },
      totalUsersAndStaff: type === TrackingActorType.VENDOR ? staffCountMap.get(user.id) ?? 0 : undefined,
    };
  });
  res.json(paginatedResponse(data, page, pageSize, total));
}

export const userDetail = async (req: Request, res: Response) => {
  const userId = String(req.params.userId);
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true, firstName: true, lastName: true, email: true, phone: true, countryCode: true, isActive: true,
      roles: { select: { role: { select: { name: true } } } },
      ownedSalons: { take: 1, select: { id: true, name: true } },
      staffIn: { where: { isActive: true }, take: 1, select: { id: true, role: true, staffRole: { select: { name: true } }, salon: { select: { id: true, name: true, ownerId: true, parentId: true } } } },
      salonCustomers: { take: 1, select: { salon: { select: { id: true, name: true, ownerId: true, parentId: true } } } },
    },
  });
  if (!user) return res.status(404).json({ success: false, message: "User not found" });
  const { page, pageSize, skip } = pagination(req);
  const where = { userId };
  const range = dateRange(req);
  const [sessionRows, activityRows, totalSessions, totalActivities, aggregate, daily, weekly, monthly, menus, screens, dailyActivities, devicesHistory, browsersHistory, systemsHistory] = await Promise.all([
    prisma.userTrackingSession.findMany({ where, orderBy: { loginAt: "desc" }, skip, take: pageSize, include: includeUser }),
    prisma.userTrackingActivity.findMany({ where, orderBy: { createdAt: "desc" }, skip, take: pageSize, include: includeUser }),
    prisma.userTrackingSession.count({ where }),
    prisma.userTrackingActivity.count({ where }),
    prisma.userTrackingSession.aggregate({ where, _count: { id: true }, _sum: { activeDurationSeconds: true }, _avg: { totalDurationSeconds: true } }),
    prisma.$queryRaw<Array<{ period: Date; sessions: number; activeSeconds: number }>>`
      SELECT date_trunc('day', "loginAt") AS period, COUNT(*)::int AS sessions,
        SUM("activeDurationSeconds")::int AS "activeSeconds"
      FROM "UserTrackingSession" WHERE "userId" = ${userId} AND "loginAt" BETWEEN ${range.gte} AND ${range.lte}
      GROUP BY date_trunc('day', "loginAt") ORDER BY period
    `,
    prisma.$queryRaw<Array<{ period: Date; sessions: number; activeSeconds: number }>>`
      SELECT date_trunc('week', "loginAt") AS period, COUNT(*)::int AS sessions,
        SUM("activeDurationSeconds")::int AS "activeSeconds"
      FROM "UserTrackingSession" WHERE "userId" = ${userId} AND "loginAt" BETWEEN ${range.gte} AND ${range.lte}
      GROUP BY date_trunc('week', "loginAt") ORDER BY period
    `,
    prisma.$queryRaw<Array<{ period: Date; sessions: number; activeSeconds: number }>>`
      SELECT date_trunc('month', "loginAt") AS period, COUNT(*)::int AS sessions,
        SUM("activeDurationSeconds")::int AS "activeSeconds"
      FROM "UserTrackingSession" WHERE "userId" = ${userId} AND "loginAt" BETWEEN ${range.gte} AND ${range.lte}
      GROUP BY date_trunc('month', "loginAt") ORDER BY period
    `,
    prisma.$queryRaw<Array<{ menuName: string | null; visits: number; activeMs: number }>>`
      SELECT COALESCE(a."menuNameSnapshot", m."label") AS "menuName",
        COUNT(*) FILTER (WHERE a."eventType" = 'MENU_VIEW')::int AS visits,
        COALESCE(SUM(a."durationMs"), 0)::int AS "activeMs"
      FROM "UserTrackingActivity" a LEFT JOIN "Menu" m ON m."id" = a."menuId"
      WHERE a."userId" = ${userId} AND a."createdAt" BETWEEN ${range.gte} AND ${range.lte}
        AND (a."eventType" = 'MENU_VIEW' OR (a."eventType" = 'PAGE_VIEW' AND a."menuId" IS NOT NULL))
      GROUP BY COALESCE(a."menuNameSnapshot", m."label") ORDER BY visits DESC
    `,
    prisma.$queryRaw<Array<{ screenName: string | null; views: number; activeMs: number; averageDurationMs: number }>>`
      SELECT a."screenName",
        COUNT(*) FILTER (WHERE COALESCE(a."action", '') NOT IN ('SCREEN_EXIT', 'EXIT'))::int AS views,
        COALESCE(SUM(a."durationMs"), 0)::int AS "activeMs",
        COALESCE(AVG(a."durationMs") FILTER (WHERE a."durationMs" IS NOT NULL), 0)::int AS "averageDurationMs"
      FROM "UserTrackingActivity" a
      WHERE a."userId" = ${userId} AND a."eventType" = 'SCREEN_VIEW'
        AND a."createdAt" BETWEEN ${range.gte} AND ${range.lte}
      GROUP BY a."screenName" ORDER BY views DESC
    `,
    prisma.$queryRaw<Array<{ date: Date; activities: number; uniqueUsers: number }>>`
      SELECT date_trunc('day', "createdAt") AS date, COUNT(*)::int AS activities, COUNT(DISTINCT "userId")::int AS "uniqueUsers"
      FROM "UserTrackingActivity" WHERE "userId" = ${userId} AND "createdAt" BETWEEN ${range.gte} AND ${range.lte}
      GROUP BY date_trunc('day', "createdAt") ORDER BY date
    `,
    prisma.userTrackingSession.groupBy({ by: ["deviceType"], where, _count: { id: true } }),
    prisma.userTrackingSession.groupBy({ by: ["browser"], where, _count: { id: true } }),
    prisma.userTrackingSession.groupBy({ by: ["operatingSystem"], where, _count: { id: true } }),
  ]);
  const sessionsData = await enrichSessions(sessionRows);
  const activityData = await enrichActivities(activityRows);
  const profileSalon = user.ownedSalons[0] ?? user.staffIn[0]?.salon ?? user.salonCustomers[0]?.salon ?? null;
  const profileVendorId = user.ownedSalons.length ? user.id : user.staffIn[0]?.salon.ownerId ?? user.salonCustomers[0]?.salon.ownerId ?? null;
  const profileVendor = profileVendorId ? await prisma.user.findUnique({ where: { id: profileVendorId }, select: { firstName: true, lastName: true } }) : null;
  res.json({
    success: true,
    data: {
      user: {
        ...user,
        userName: `${user.firstName} ${user.lastName ?? ""}`.trim(),
        roleNames: user.roles.map(({ role }) => role.name),
        vendorName: profileVendor ? `${profileVendor.firstName} ${profileVendor.lastName ?? ""}`.trim() : "N/A",
        salonName: profileSalon?.name ?? "N/A",
        staffName: user.staffIn.length ? `${user.firstName} ${user.lastName ?? ""}`.trim() : "N/A",
        branchName: user.staffIn[0]?.salon.parentId || user.salonCustomers[0]?.salon.parentId
          ? user.staffIn[0]?.salon.name ?? user.salonCustomers[0]?.salon.name ?? "N/A" : "N/A",
        currentStatus: user.isActive ? "ACTIVE" : "INACTIVE",
      },
      summary: {
        totalSessions: aggregate._count.id,
        totalActivities,
        activeTimeSeconds: aggregate._sum.activeDurationSeconds ?? 0,
        averageSessionSeconds: Math.round(aggregate._avg.totalDurationSeconds ?? 0),
        lastLogin: sessionsData[0]?.loginAt ?? "N/A",
        lastActivity: activityData[0]?.createdAt ?? "N/A",
        mostUsedMenu: menus[0]?.menuName ?? "N/A",
        mostUsedScreen: screens[0]?.screenName ?? "N/A",
      },
      sessions: sessionsData, recentSessions: sessionsData,
      activities: activityData, recentActivity: activityData,
      deviceHistory: devicesHistory.map((row) => ({ device: row.deviceType ?? "N/A", sessions: row._count.id })),
      browserHistory: browsersHistory.map((row) => ({ browser: row.browser ?? "N/A", sessions: row._count.id })),
      operatingSystemHistory: systemsHistory.map((row) => ({ operatingSystem: row.operatingSystem ?? "N/A", sessions: row._count.id })),
      usage: { daily, weekly, monthly, crmMenus: menus, customerAppScreens: screens },
      dailyActivity: dailyActivities.map((row) => ({ ...row, date: row.date.toISOString().slice(0, 10) })),
      pagination: { page, currentPage: page, pageSize, totalSessions, totalActivities, totalRecords: totalSessions + totalActivities, totalPages: Math.ceil(Math.max(totalSessions, totalActivities) / pageSize) },
    },
  });
};

export const vendors = async (req: Request, res: Response) => listByType(req, res, TrackingActorType.VENDOR);
export const staff = async (req: Request, res: Response) => listByType(req, res, TrackingActorType.STAFF);
export const customers = async (req: Request, res: Response) => listByType(req, res, TrackingActorType.CUSTOMER);

async function listByType(req: Request, res: Response, type: TrackingActorType) {
  await listUsers(req, res, type);
}

export const vendorDetail = async (req: Request, res: Response) => detailByType(req, res, TrackingActorType.VENDOR);
export const staffDetail = async (req: Request, res: Response) => detailByType(req, res, TrackingActorType.STAFF);
export const customerDetail = async (req: Request, res: Response) => detailByType(req, res, TrackingActorType.CUSTOMER);

async function detailByType(req: Request, res: Response, type: TrackingActorType) {
  const id = String(req.params.id);
  const actor = await prisma.userTrackingSession.findFirst({
    where: { actorType: type, ...(type === TrackingActorType.STAFF ? { OR: [{ staffId: id }, { userId: id }] } : { userId: id }) },
    select: { userId: true },
  });
  if (!actor) return res.status(404).json({ success: false, message: `${type.toLowerCase()} tracking user not found` });
  req.params.userId = actor.userId;
  await userDetail(req, res);
}

export const exportCsv = async (req: Request, res: Response) => {
  const dataset = queryText(req.query.dataset) ?? "sessions";
  if (!["users", "sessions", "activities", "menu-usage", "customer-app-usage"].includes(dataset)) {
    throw Object.assign(new Error("dataset must be users, sessions, activities, menu-usage, or customer-app-usage"), { status: 400 });
  }
  const filters = dataset === "activities" ? activityFilters(req) : sessionFilters(req);
  res.type("text/csv");
  res.attachment(`tracking-${dataset}.csv`);
  const headers = dataset === "activities"
    ? ["createdAt", "userId", "actorType", "vendorId", "staffId", "customerId", "sessionId", "eventType", "action", "menuId", "menuNameSnapshot", "screenName", "route", "durationMs", "ipAddress", "city", "state", "country"]
    : dataset === "users"
      ? ["userId", "firstName", "lastName", "email", "phone"]
      : ["loginAt", "logoutAt", "userId", "actorType", "vendorId", "staffId", "customerId", "sessionId", "status", "totalDurationSeconds", "activeDurationSeconds", "ipAddress", "city", "state", "country", "deviceType", "operatingSystem", "browser", "appVersion"];
  if (dataset !== "menu-usage" && dataset !== "customer-app-usage") await writeCsvChunk(res, `${headers.join(",")}\r\n`);
  if (dataset === "menu-usage" || dataset === "customer-app-usage") {
    const rows = await usageRows(dataset === "menu-usage" ? "MENU_VIEW" : "SCREEN_VIEW", dateRange(req), req);
    await writeCsvChunk(res, "name,id,visitCount,uniqueUsers,activeTimeMs,averageDurationMs,lastUsedAt\r\n");
    for (const row of rows) {
      if (res.destroyed) return;
      await writeCsvChunk(res, `${["name", "id", "visitCount", "uniqueUsers", "activeTimeMs", "averageDurationMs", "lastUsedAt"].map((key) => csvValue((row as Record<string, unknown>)[key])).join(",")}\r\n`);
    }
    return res.end();
  }
  if (dataset === "users") {
    const { pageSize } = pagination(req);
    let skip = 0;
    while (true) {
      const batch = await prisma.user.findMany({
        where: userWhere(req, actorType(req.query.actorType)), orderBy: { id: "asc" }, skip, take: Math.min(1000, pageSize * 10),
        select: { id: true, firstName: true, lastName: true, email: true, phone: true },
      });
      for (const user of batch) {
        if (res.destroyed) return;
        await writeCsvChunk(res, `${[user.id, user.firstName, user.lastName, user.email, user.phone].map(csvValue).join(",")}\r\n`);
      }
      if (batch.length < Math.min(1000, pageSize * 10)) break;
      skip += batch.length;
    }
    return res.end();
  }
  let skip = 0;
  const batchSize = 1000;
  while (true) {
    const batch = dataset === "activities"
      ? await prisma.userTrackingActivity.findMany({ where: filters as Prisma.UserTrackingActivityWhereInput, orderBy: { createdAt: "asc" }, skip, take: batchSize })
      : await prisma.userTrackingSession.findMany({ where: filters as Prisma.UserTrackingSessionWhereInput, orderBy: { loginAt: "asc" }, skip, take: batchSize });
    for (const row of batch) {
      if (res.destroyed) return;
      await writeCsvChunk(res, `${headers.map((key) => csvValue((row as unknown as Record<string, unknown>)[key])).join(",")}\r\n`);
    }
    if (batch.length < batchSize) break;
    skip += batch.length;
  }
  res.end();
};

function writeCsvChunk(res: Response, chunk: string) {
  if (res.write(chunk)) return Promise.resolve();
  return new Promise<void>((resolve) => {
    res.once("drain", resolve);
    res.once("close", resolve);
  });
}

function csvValue(value: unknown) {
  const text = value instanceof Date ? value.toISOString() : value === null || value === undefined ? "" : String(value);
  return `"${text.replace(/"/g, '""')}"`;
}
