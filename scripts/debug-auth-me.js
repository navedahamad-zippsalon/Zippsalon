const http = require("http");
const app = require("../dist/app").default;
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function run() {
  const server = http.createServer(app);
  await new Promise(r => server.listen(0, r));
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}`;

  const email = `test-onboarding-${Date.now()}@example.test`;
  const regRes = await fetch(`${baseUrl}/api/v1/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      firstName: "Onboarding",
      lastName: "Vendor",
      email,
      password: "Vendor@123",
      phone: "9000000099",
      countryCode: "+91",
      source: "WEBSITE"
    })
  });
  const regBody = await regRes.json();
  console.log("Register response:", regRes.status, regBody.success);

  const loginRes = await fetch(`${baseUrl}/api/v1/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password: "Vendor@123" })
  });
  const loginBody = await loginRes.json();
  console.log("Login response:", loginRes.status, loginBody.success);

  const token = loginBody.data.accessToken;
  const [me, currentSub, perms, menus, rbacMenus] = await Promise.all([
    fetch(`${baseUrl}/api/v1/auth/me`, { headers: { Authorization: `Bearer ${token}` } }),
    fetch(`${baseUrl}/api/v1/subscriptions/current`, { headers: { Authorization: `Bearer ${token}` } }),
    fetch(`${baseUrl}/api/v1/auth/permissions`, { headers: { Authorization: `Bearer ${token}` } }),
    fetch(`${baseUrl}/api/v1/auth/menus`, { headers: { Authorization: `Bearer ${token}` } }),
    fetch(`${baseUrl}/api/v1/rbac/menus`, { headers: { Authorization: `Bearer ${token}` } }),
  ]);

  console.log("me status:", me.status, await me.json().catch(e => e.message));
  console.log("currentSub status:", currentSub.status, await currentSub.json().catch(e => e.message));
  console.log("perms status:", perms.status, await perms.json().catch(e => e.message));
  console.log("menus status:", menus.status, await menus.json().catch(e => e.message));
  console.log("rbacMenus status:", rbacMenus.status, await rbacMenus.json().catch(e => e.message));

  await prisma.userRole.deleteMany({ where: { userId: loginBody.data.user.id } });
  await prisma.subscription.deleteMany({ where: { vendorId: loginBody.data.user.id } });
  await prisma.user.delete({ where: { id: loginBody.data.user.id } });
  server.close();
}

run().catch(console.error).finally(() => prisma.$disconnect());
