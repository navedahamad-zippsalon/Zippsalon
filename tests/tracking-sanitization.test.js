const test = require("node:test");
const assert = require("node:assert/strict");

const { parseTrackingEvent } = require("../dist/modules/tracking/tracking.controller");
const { isPublicIpAddress, parseClientInfo } = require("../dist/modules/tracking/tracking.service");
const { filterMenuTree } = require("../dist/modules/rbac/rbac.service");

test("tracking events only accept defined event types and bounded, non-sensitive fields", () => {
  const event = parseTrackingEvent({
    eventType: "MENU_VIEW",
    menuId: "existing-menu-id",
    durationMs: 3600000,
    route: "/admin/bookings?token=not-stored",
    entityId: "eyJhbGci.eyJzdWIi.signature",
    metadata: { moduleName: "Bookings", source: "a.b.c", resultCount: 4, authorization: "secret" },
  });

  assert.equal(event.eventType, "MENU_VIEW");
  assert.equal(event.menuId, "existing-menu-id");
  assert.equal(event.durationMs, 120000);
  assert.equal(event.route, undefined);
  assert.equal(event.entityId, undefined);
  assert.deepEqual(event.metadata, { moduleName: "Bookings", resultCount: 4 });
  assert.throws(() => parseTrackingEvent({ eventType: "LOGIN", password: "never stored" }), { status: 400 });
});

test("customer screen events stay separate from CRM menu events", () => {
  const event = parseTrackingEvent({ eventType: "SCREEN_VIEW", screenName: "Salon Details", route: "/salons/detail" });
  assert.equal(event.eventType, "SCREEN_VIEW");
  assert.equal(event.screenName, "Salon Details");
  assert.equal(event.menuId, undefined);
});

test("client device parsing detects common browser and OS without storing device identifiers", () => {
  const headers = {
    "user-agent": "Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 Chrome/120.0 Mobile Safari/537.36",
    "x-app-version": "2.4.1",
    "x-device-name": "private-hardware-identifier",
  };
  const client = parseClientInfo({ get: (name) => headers[name.toLowerCase()] } );
  assert.equal(client.deviceType, "MOBILE");
  assert.equal(client.operatingSystem, "Android");
  assert.equal(client.browser, "Chrome");
  assert.equal(client.appVersion, "2.4.1");
  assert.equal(client.deviceName, null);
  assert.equal(parseClientInfo({ get: (name) => name.toLowerCase() === "x-app-version" ? "Bearer secret" : undefined }).appVersion, null);
});

test("IP geolocation eligibility excludes private and loopback addresses", () => {
  assert.equal(isPublicIpAddress("8.8.8.8"), true);
  assert.equal(isPublicIpAddress("192.168.1.10"), false);
  assert.equal(isPublicIpAddress("192.0.2.10"), false);
  assert.equal(isPublicIpAddress("203.0.113.10"), false);
  assert.equal(isPublicIpAddress("127.0.0.1"), false);
  assert.equal(isPublicIpAddress("::1"), false);
});

test("tracking menus stay hidden from non-admins even if they hold tracking.view", () => {
  const trackingMenu = [{
    label: "Tracking",
    path: "/tracking",
    menuPermissions: [{ permission: { action: "tracking.view" } }],
    children: [{
      label: "Tracking Overview",
      path: "/tracking",
      menuPermissions: [{ permission: { action: "tracking.overview" } }],
    }],
  }];

  assert.deepEqual(filterMenuTree(trackingMenu, ["VENDOR"], ["tracking.view"]), []);
  assert.equal(filterMenuTree(trackingMenu, ["ADMIN"], ["tracking.view"]).length, 1);
  assert.deepEqual(filterMenuTree(trackingMenu, ["CUSTOMER"], ["tracking.view"]), []);
});
