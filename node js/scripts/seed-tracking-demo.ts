import "dotenv/config";
import crypto from "crypto";
import bcrypt from "bcrypt";
import { PrismaClient, TrackingActorType, TrackingSessionStatus } from "@prisma/client";

const prisma = new PrismaClient();
const namespace = "zippsalon-tracking-demo-v2";
const days = 30;
let createdAdminCount = 0;

type DemoActor = {
  actorType: TrackingActorType;
  userId: string;
  vendorId: string | null;
  staffId: string | null;
  customerId: string | null;
  roleId: string | null;
  salonId: string | null;
  branchId: string | null;
  memberships: Array<{ salonId: string; branchId: string | null; vendorId: string | null }>;
};

type DemoLocation = {
  country: string;
  countryCode: string;
  state: string;
  city: string;
  latitude: number;
  longitude: number;
};

const locations: DemoLocation[] = [
  { country: "India", countryCode: "IN", state: "Delhi", city: "New Delhi", latitude: 28.6139, longitude: 77.2090 },
  { country: "India", countryCode: "IN", state: "Maharashtra", city: "Mumbai", latitude: 19.0760, longitude: 72.8777 },
  { country: "India", countryCode: "IN", state: "Karnataka", city: "Bengaluru", latitude: 12.9716, longitude: 77.5946 },
  { country: "India", countryCode: "IN", state: "Telangana", city: "Hyderabad", latitude: 17.3850, longitude: 78.4867 },
  { country: "India", countryCode: "IN", state: "Maharashtra", city: "Pune", latitude: 18.5204, longitude: 73.8567 },
  { country: "India", countryCode: "IN", state: "Haryana", city: "Gurugram", latitude: 28.4595, longitude: 77.0266 },
  { country: "India", countryCode: "IN", state: "Uttar Pradesh", city: "Noida", latitude: 28.5355, longitude: 77.3910 },
  { country: "India", countryCode: "IN", state: "Tamil Nadu", city: "Chennai", latitude: 13.0827, longitude: 80.2707 },
];

const devices = [
  { deviceType: "DESKTOP", operatingSystem: "Windows", browser: "Chrome" },
  { deviceType: "LAPTOP", operatingSystem: "macOS", browser: "Safari" },
  { deviceType: "MOBILE", operatingSystem: "Android", browser: "Chrome" },
  { deviceType: "MOBILE", operatingSystem: "iOS", browser: "Safari" },
  { deviceType: "TABLET", operatingSystem: "Android", browser: "Chrome" },
  { deviceType: "DESKTOP", operatingSystem: "Windows", browser: "Edge" },
  { deviceType: "DESKTOP", operatingSystem: "Windows", browser: "Firefox" },
];

const customerScreens = [
  "Home", "Discover", "Nearby Salons", "Salon Details", "Services", "Staff",
  "Booking", "My Bookings", "Favorites", "Profile", "Wallet", "Notifications",
  "Offers", "Reviews", "Gallery", "Stories", "Posts",
];

const businessEvents = [
  { eventType: "VIEW", action: "BOOKING_VIEW", entityType: "Booking" },
  { eventType: "CREATE", action: "BOOKING_CREATE", entityType: "Booking" },
  { eventType: "UPDATE", action: "SERVICE_UPDATE", entityType: "Service" },
  { eventType: "SEARCH", action: "CUSTOMER_SEARCH", entityType: "Customer" },
  { eventType: "VIEW", action: "STAFF_VIEW", entityType: "Staff" },
  { eventType: "FILTER", action: "BOOKING_FILTER", entityType: "Booking" },
  { eventType: "EXPORT", action: "REPORT_EXPORT", entityType: "Report" },
  { eventType: "VIEW", action: "PAYMENT_VIEW", entityType: "Payment" },
];

function stableUuid(value: string) {
  const bytes = crypto.createHash("sha256").update(value).digest().subarray(0, 16);
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = bytes.toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function localDatabaseHost() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL is required to seed tracking demo data.");
  const hostname = new URL(connectionString).hostname.toLowerCase();
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1";
}

function assertSafeEnvironment() {
  const environment = process.env.NODE_ENV;
  if (environment === "production" || (environment && !["development", "test"].includes(environment))) {
    throw new Error("Tracking demo data may only be seeded in development or test environments.");
  }
  if (!environment && !localDatabaseHost()) {
    throw new Error("Set NODE_ENV=development or NODE_ENV=test before seeding a non-local database.");
  }
}

async function ensureSecondAdmin(admins: Array<{ id: string; roles: Array<{ roleId: string }> }>) {
  if (admins.length >= 2) return admins.slice(0, 2);
  const adminRole = await prisma.role.findFirst({
    where: { name: { in: ["ADMIN", "SUPER_ADMIN"] }, isActive: true },
    orderBy: { name: "asc" },
    select: { id: true },
  });
  if (!adminRole) throw new Error("An active Admin or Super Admin role is required.");

  const email = "tracking.admin.02@zippsalon.test";
  let user = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  if (!user) {
    user = await prisma.user.create({
      data: {
        firstName: "Tracking Admin",
        lastName: "02",
        email,
        phone: "7000000002",
        countryCode: "+91",
        password: await bcrypt.hash(crypto.randomBytes(48).toString("hex"), 12),
        roles: { create: { roleId: adminRole.id } },
      },
      select: { id: true },
    });
    createdAdminCount += 1;
  } else {
    await prisma.userRole.upsert({
      where: { userId_roleId: { userId: user.id, roleId: adminRole.id } },
      update: {},
      create: { userId: user.id, roleId: adminRole.id },
    });
  }
  return [...admins, { id: user.id, roles: [{ roleId: adminRole.id }] }].slice(0, 2);
}

async function loadActors(): Promise<DemoActor[]> {
  const adminsFound = await prisma.user.findMany({
    where: { isActive: true, roles: { some: { role: { name: { in: ["ADMIN", "SUPER_ADMIN"] }, isActive: true } } } },
    orderBy: { createdAt: "asc" },
    take: 2,
    select: { id: true, roles: { where: { role: { name: { in: ["ADMIN", "SUPER_ADMIN"] } } }, select: { roleId: true }, take: 1 } },
  });
  const admins = await ensureSecondAdmin(adminsFound);

  const vendors = await prisma.user.findMany({
    where: { isActive: true, roles: { some: { role: { name: "VENDOR", isActive: true } } }, ownedSalons: { some: { isActive: true, parentId: null } } },
    orderBy: { createdAt: "asc" },
    take: 10,
    select: { id: true, roles: { where: { role: { name: "VENDOR" } }, select: { roleId: true }, take: 1 } },
  });
  if (vendors.length < 10) throw new Error(`Tracking demo seed needs 10 existing development vendors with active salons; found ${vendors.length}.`);

  const vendorIds = vendors.map(({ id }) => id);
  const salons = await prisma.salon.findMany({
    where: { ownerId: { in: vendorIds }, isActive: true },
    orderBy: [{ parentId: "asc" }, { createdAt: "asc" }],
    select: { id: true, ownerId: true, parentId: true },
  });
  const vendorSalon = new Map<string, string>();
  for (const salon of salons) {
    if (!salon.parentId && !vendorSalon.has(salon.ownerId)) vendorSalon.set(salon.ownerId, salon.id);
  }
  const salonById = new Map(salons.map((salon) => [salon.id, salon]));

  const staffRows = await prisma.salonStaff.findMany({
    where: { isActive: true, salon: { ownerId: { in: vendorIds }, isActive: true } },
    orderBy: { createdAt: "asc" },
    select: {
      id: true, userId: true, salonId: true, staffRoleId: true,
      salon: { select: { ownerId: true, parentId: true } },
      user: { select: { roles: { where: { role: { name: "STAFF" } }, select: { roleId: true }, take: 1 } } },
    },
  });
  const staffByVendor = new Map<string, typeof staffRows>();
  for (const row of staffRows) staffByVendor.set(row.salon.ownerId, [...(staffByVendor.get(row.salon.ownerId) ?? []), row]);
  const selectedStaff: typeof staffRows = [];
  const selectedStaffUsers = new Set<string>();
  for (const vendorId of vendorIds) {
    const row = staffByVendor.get(vendorId)?.find(({ userId }) => !selectedStaffUsers.has(userId));
    if (row) {
      selectedStaff.push(row);
      selectedStaffUsers.add(row.userId);
    }
  }
  for (const row of staffRows) {
    if (selectedStaff.length >= 25) break;
    if (!selectedStaffUsers.has(row.userId)) {
      selectedStaff.push(row);
      selectedStaffUsers.add(row.userId);
    }
  }
  if (selectedStaff.length < 25) throw new Error(`Tracking demo seed needs 25 existing active staff users under the selected vendors; found ${selectedStaff.length}.`);

  const customerRows = await prisma.salonCustomer.findMany({
    where: { user: { roles: { some: { role: { name: "CUSTOMER", isActive: true } } } } },
    orderBy: { createdAt: "asc" },
    select: {
      id: true, userId: true, salonId: true,
      salon: { select: { ownerId: true, parentId: true } },
      user: { select: { roles: { where: { role: { name: "CUSTOMER" } }, select: { roleId: true }, take: 1 } } },
    },
  });
  const selectedCustomers: typeof customerRows = [];
  const selectedCustomerUsers = new Set<string>();
  for (const row of customerRows) {
    if (selectedCustomers.length >= 50) break;
    if (!selectedCustomerUsers.has(row.userId)) {
      selectedCustomers.push(row);
      selectedCustomerUsers.add(row.userId);
    }
  }
  if (selectedCustomers.length < 50) throw new Error(`Tracking demo seed needs 50 existing customers related to the selected vendors; found ${selectedCustomers.length}.`);

  const actors: DemoActor[] = [];
  for (const admin of admins) {
    actors.push({
      actorType: TrackingActorType.ADMIN,
      userId: admin.id,
      vendorId: null, staffId: null, customerId: null, roleId: admin.roles[0]?.roleId ?? null,
      salonId: null, branchId: null, memberships: [],
    });
  }
  for (const vendor of vendors) {
    actors.push({
      actorType: TrackingActorType.VENDOR,
      userId: vendor.id,
      vendorId: vendor.id, staffId: null, customerId: null, roleId: vendor.roles[0]?.roleId ?? null,
      salonId: vendorSalon.get(vendor.id) ?? null, branchId: null, memberships: [],
    });
  }
  for (const staff of selectedStaff) {
    const parentId = staff.salon.parentId;
    actors.push({
      actorType: TrackingActorType.STAFF,
      userId: staff.userId,
      vendorId: staff.salon.ownerId, staffId: staff.id, customerId: null,
      roleId: staff.staffRoleId ?? staff.user.roles[0]?.roleId ?? null,
      salonId: parentId ?? staff.salonId, branchId: parentId ? staff.salonId : null, memberships: [],
    });
  }
  for (const customer of selectedCustomers) {
    const salon = customer.salon;
    actors.push({
      actorType: TrackingActorType.CUSTOMER,
      userId: customer.userId,
      vendorId: salon.ownerId, staffId: null, customerId: customer.userId,
      roleId: customer.user.roles[0]?.roleId ?? null,
      salonId: salon.parentId ?? customer.salonId,
      branchId: salon.parentId ? customer.salonId : null,
      memberships: customerRows.filter(({ userId }) => userId === customer.userId).map((row) => ({
        salonId: row.salon.parentId ?? row.salonId,
        branchId: row.salon.parentId ? row.salonId : null,
        vendorId: row.salon.ownerId,
      })),
    });
  }
  return actors;
}

function availableCrmMenus(menus: Array<{ id: string; label: string; path: string | null; parentId: string | null }>) {
  const priority = ["Dashboard", "Bookings", "Customers", "Staff", "Services", "Attendance", "Reports & Analytics", "Payment & Wallet", "Tracking"];
  return [...menus].sort((left, right) => {
    const leftIndex = priority.findIndex((label) => left.label.toLowerCase().includes(label.toLowerCase()));
    const rightIndex = priority.findIndex((label) => right.label.toLowerCase().includes(label.toLowerCase()));
    return (leftIndex < 0 ? priority.length : leftIndex) - (rightIndex < 0 ? priority.length : rightIndex);
  }).slice(0, 20);
}

async function upsertInBatches<T extends { where: object; create: object; update: object }>(
  records: T[],
  upsert: (record: T) => Promise<unknown>,
  batchSize = 50,
) {
  for (let offset = 0; offset < records.length; offset += batchSize) {
    await Promise.all(records.slice(offset, offset + batchSize).map(upsert));
  }
}

async function main() {
  assertSafeEnvironment();
  const actors = await loadActors();
  const crmMenus = availableCrmMenus(await prisma.menu.findMany({
    where: { path: { not: null } },
    select: { id: true, label: true, path: true, parentId: true },
  }));
  if (crmMenus.length < 5) throw new Error("At least five existing CRM menu records are required to seed menu usage.");

  const now = new Date();
  const sessionRecords: Array<{ where: { sessionId: string }; create: Record<string, unknown>; update: Record<string, unknown> }> = [];
  const activityRecords: Array<{ where: { id: string }; create: Record<string, unknown>; update: Record<string, unknown> }> = [];
  const counters = { sessions: 0, activities: 0, menuViews: 0, customerScreenViews: 0 };
  const activeUsers = new Set<string>();
  let actorIndex = 0;

  for (const actor of actors) {
    const sessionsForActor = actor.actorType === TrackingActorType.CUSTOMER ? 2 : actor.actorType === TrackingActorType.ADMIN ? 1 : 3;
    const activeLimit = actor.actorType === TrackingActorType.ADMIN ? 2
      : actor.actorType === TrackingActorType.VENDOR ? 3
      : actor.actorType === TrackingActorType.STAFF || actor.actorType === TrackingActorType.CUSTOMER ? 5 : 0;

    for (let sessionIndex = 0; sessionIndex < sessionsForActor; sessionIndex += 1) {
      const isActive = sessionIndex === 0 && activeUsers.size < 15 && (
        actor.actorType === TrackingActorType.ADMIN ||
        (actor.actorType === TrackingActorType.VENDOR && [...activeUsers].filter((id) => id.startsWith("VENDOR:")).length < activeLimit) ||
        (actor.actorType === TrackingActorType.STAFF && [...activeUsers].filter((id) => id.startsWith("STAFF:")).length < activeLimit) ||
        (actor.actorType === TrackingActorType.CUSTOMER && [...activeUsers].filter((id) => id.startsWith("CUSTOMER:")).length < activeLimit)
      );
      if (isActive) activeUsers.add(`${actor.actorType}:${actor.userId}`);

      const sessionKey = `${namespace}:session:${actor.actorType}:${actor.userId}:${sessionIndex}`;
      const sessionId = stableUuid(`${sessionKey}:session-id`);
      const id = stableUuid(`${sessionKey}:record-id`);
      const activeDurationSeconds = isActive ? 1800 + (actorIndex % 1800) : 600 + ((actorIndex * 379 + sessionIndex * 421) % 7000);
      const durationSeconds = Math.max(activeDurationSeconds, 3600 + ((actorIndex * 613 + sessionIndex * 727) % 7200));
      const daysAgo = isActive ? 0 : (actorIndex * 7 + sessionIndex * 11) % days;
      const hoursAgo = isActive ? 1 + actorIndex % 4 : (actorIndex * 3 + sessionIndex * 5) % 24;
      const loginAt = new Date(now.getTime() - daysAgo * 86400000 - hoursAgo * 3600000 - (actorIndex % 57) * 60000);
      const lastActivityAt = isActive ? new Date(now.getTime() - 15_000 - (actorIndex % 35) * 1000) : new Date(loginAt.getTime() + durationSeconds * 1000);
      const status = isActive ? TrackingSessionStatus.ACTIVE
        : (actorIndex + sessionIndex) % 7 === 0 ? TrackingSessionStatus.EXPIRED
        : TrackingSessionStatus.LOGGED_OUT;
      const logoutAt = isActive ? null : lastActivityAt;
      const device = devices[(actorIndex * 3 + sessionIndex) % devices.length];
      const location = locations[(actorIndex + sessionIndex * 3) % locations.length];
      const ipAddress = `203.0.113.${10 + (actorIndex * 7 + sessionIndex) % 220}`;
      const memberships = actor.actorType === TrackingActorType.CUSTOMER && actor.memberships.length
        ? [actor.memberships[(actorIndex + sessionIndex) % actor.memberships.length]]
        : [];
      const vendorId = memberships[0]?.vendorId ?? actor.vendorId;
      const salonId = memberships[0]?.salonId ?? actor.salonId;
      const branchId = memberships[0]?.branchId ?? actor.branchId;
      const sessionData = {
        userId: actor.userId,
        actorType: actor.actorType,
        vendorId,
        staffId: actor.staffId,
        customerId: actor.customerId,
        roleId: actor.roleId,
        salonId,
        branchId,
        sessionId,
        loginAt,
        logoutAt,
        lastActivityAt,
        lastHeartbeatAt: lastActivityAt,
        totalDurationSeconds: durationSeconds,
        activeDurationSeconds,
        status,
        ipAddress,
        country: location.country,
        countryCode: location.countryCode,
        state: location.state,
        city: location.city,
        latitude: location.latitude,
        longitude: location.longitude,
        timezone: "Asia/Kolkata",
        locationProvider: "development-seed",
        locationSource: "IP_GEOLOCATION" as const,
        deviceType: device.deviceType,
        deviceName: null,
        operatingSystem: device.operatingSystem,
        browser: device.browser,
        appVersion: actor.actorType === TrackingActorType.CUSTOMER ? `2.${actorIndex % 5}.${sessionIndex + 1}` : null,
        userAgent: `Zippsalon development seed ${device.operatingSystem} ${device.browser}`,
        createdAt: loginAt,
        updatedAt: now,
      };
      sessionRecords.push({
        where: { sessionId },
        create: { id, ...sessionData },
        update: sessionData,
      });
      counters.sessions += 1;

      let eventIndex = 0;
      const makeActivity = (event: Record<string, unknown>, offsetSeconds: number) => {
        const activityId = stableUuid(`${sessionKey}:activity:${eventIndex}`);
        const createdAt = new Date(Math.min(lastActivityAt.getTime(), loginAt.getTime() + offsetSeconds * 1000));
        const data = {
          userId: actor.userId,
          actorType: actor.actorType,
          vendorId,
          staffId: actor.staffId,
          customerId: actor.customerId,
          salonId,
          branchId,
          roleId: actor.roleId,
          sessionId,
          ipAddress,
          country: location.country,
          state: location.state,
          city: location.city,
          createdAt,
          metadata: {
            deviceType: device.deviceType,
            operatingSystem: device.operatingSystem,
            browser: device.browser,
            appVersion: actor.actorType === TrackingActorType.CUSTOMER ? `2.${actorIndex % 5}.${sessionIndex + 1}` : null,
          },
          ...event,
        };
        activityRecords.push({ where: { id: activityId }, create: { id: activityId, ...data }, update: data });
        counters.activities += 1;
        eventIndex += 1;
      };

      makeActivity({ eventType: "LOGIN", action: "LOGIN", status: "SUCCESS" }, 0);
      if (actor.actorType === TrackingActorType.CUSTOMER) {
        makeActivity({ eventType: "APP_OPEN", action: "APP_OPEN", status: "SUCCESS" }, 30);
        const screenCount = 5 + ((actorIndex + sessionIndex) % 4);
        for (let viewIndex = 0; viewIndex < screenCount; viewIndex += 1) {
          const screenName = customerScreens[(viewIndex * 3 + actorIndex + sessionIndex) % customerScreens.length];
          makeActivity({
            eventType: "SCREEN_VIEW",
            action: "ENTER",
            route: `/customer/${screenName.toLowerCase().replace(/\s+/g, "-")}`,
            screenName,
            durationMs: 20_000 + ((actorIndex * 337 + viewIndex * 791) % 240_000),
            status: "SUCCESS",
          }, 60 + viewIndex * 240);
          counters.customerScreenViews += 1;
        }
        if (!isActive) makeActivity({ eventType: "APP_BACKGROUND", action: "APP_BACKGROUND", status: "SUCCESS" }, durationSeconds);
      } else {
        const menuCount = actor.actorType === TrackingActorType.ADMIN ? 3 : 4 + ((actorIndex + sessionIndex) % 4);
        for (let viewIndex = 0; viewIndex < menuCount; viewIndex += 1) {
          const menu = crmMenus[(viewIndex * 7 + actorIndex * 3 + sessionIndex * 5) % crmMenus.length];
          makeActivity({
            eventType: "MENU_VIEW",
            action: "MENU_VIEW",
            route: menu.path,
            menuId: menu.id,
            parentMenuId: menu.parentId,
            menuNameSnapshot: menu.label,
            moduleName: menu.label,
            durationMs: 30_000 + ((actorIndex * 431 + viewIndex * 997) % 300_000),
            status: "SUCCESS",
          }, 120 + viewIndex * 300);
          counters.menuViews += 1;
        }
        const businessEvent = businessEvents[(actorIndex + sessionIndex * 3) % businessEvents.length];
        makeActivity({ ...businessEvent, status: "SUCCESS" }, Math.min(durationSeconds, 900 + sessionIndex * 300));
        if (!isActive) {
          const logoutType = status === TrackingSessionStatus.EXPIRED ? "SESSION_EXPIRED" : "LOGOUT";
          makeActivity({ eventType: logoutType, action: logoutType, status }, durationSeconds);
        }
      }
    }
    actorIndex += 1;
  }

  await upsertInBatches(sessionRecords, ({ where, create, update }) =>
    prisma.userTrackingSession.upsert({ where, create: create as never, update: update as never }));
  await upsertInBatches(activityRecords, ({ where, create, update }) =>
    prisma.userTrackingActivity.upsert({ where, create: create as never, update: update as never }), 100);

  const sessionIds = sessionRecords.map(({ where }) => where.sessionId);
  const activityIds = activityRecords.map(({ where }) => where.id);
  const [persistedSessions, persistedActivities, crmUsage, appUsage, actorCounts] = await Promise.all([
    prisma.userTrackingSession.count({ where: { sessionId: { in: sessionIds } } }),
    prisma.userTrackingActivity.count({ where: { id: { in: activityIds } } }),
    prisma.userTrackingActivity.count({ where: { id: { in: activityIds }, eventType: "MENU_VIEW" } }),
    prisma.userTrackingActivity.count({ where: { id: { in: activityIds }, eventType: "SCREEN_VIEW" } }),
    prisma.userTrackingSession.groupBy({ by: ["actorType"], where: { sessionId: { in: sessionIds } }, _count: { id: true } }),
  ]);
  if (persistedSessions !== counters.sessions || persistedActivities !== counters.activities || crmUsage < 300 || appUsage < 300) {
    throw new Error(`Seed verification failed: sessions=${persistedSessions}/${counters.sessions}, activities=${persistedActivities}/${counters.activities}, menus=${crmUsage}, screens=${appUsage}`);
  }
  const actorsCreated = Object.fromEntries(actorCounts.map(({ actorType, _count }) => [actorType, _count.id]));
  console.log(JSON.stringify({
    environment: process.env.NODE_ENV ?? "development (local database)",
    usersReused: { admins: 2 - createdAdminCount, vendors: 10, staff: 25, customers: 50 },
    usersCreated: { admins: createdAdminCount, vendors: 0, staff: 0, customers: 0 },
    sessions: persistedSessions,
    activities: persistedActivities,
    menuUsageRecords: crmUsage,
    customerAppUsageRecords: appUsage,
    activeSessions: [...sessionRecords].filter(({ create }) => create.status === TrackingSessionStatus.ACTIVE).length,
    actorsByType: actorsCreated,
  }, null, 2));
}

main()
  .catch((error) => {
    console.error("Unable to seed tracking demo data:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
