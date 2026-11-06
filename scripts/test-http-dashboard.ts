import jwt from "jsonwebtoken";
import axios from "axios";
import { prisma } from "../src/infrastructure/database/prisma";

async function main() {
  const secret = process.env.JWT_SECRET || "your-secret-key";

  // Check health
  try {
    const health = await axios.get("http://localhost:4000/health");
    console.log("Health check:", health.data);
  } catch (err: any) {
    console.error("Backend not running or health failed:", err.message);
    return;
  }

  // Admin user
  const admin = await prisma.user.findFirst({
    where: { roles: { some: { role: { name: "ADMIN" } } } },
    include: { roles: { include: { role: true } } },
  });
  if (admin) {
    const token = jwt.sign({ userId: admin.id, roles: admin.roles.map(r => r.role.name) }, secret, { expiresIn: '1h' });
    try {
      const res = await axios.get("http://localhost:4000/api/v1/dashboard", {
        headers: { Authorization: `Bearer ${token}` },
        params: { country: "India" }
      });
      console.log("\n--- Admin Dashboard Response ---");
      console.log("Status:", res.status);
      console.log("kpis:", res.data?.data?.kpis);
      console.log("summary:", res.data?.data?.summary);
      console.log("todaySchedule:", res.data?.data?.todaySchedule);
    } catch (err: any) {
      console.error("Admin dashboard fetch error:", err.response?.data || err.message);
    }
  }

  // Zipp Beauty Vendor
  const vendor = await prisma.user.findUnique({
    where: { email: "zippbeauty.demo@zippsalon.test" },
    include: { roles: { include: { role: true } } },
  });
  if (vendor) {
    const token = jwt.sign({ userId: vendor.id, roles: vendor.roles.map(r => r.role.name) }, secret, { expiresIn: '1h' });
    try {
      const res = await axios.get("http://localhost:4000/api/v1/dashboard", {
        headers: { Authorization: `Bearer ${token}` },
        params: { country: "India" }
      });
      console.log("\n--- Vendor Dashboard Response ---");
      console.log("Status:", res.status);
      console.log("kpis:", res.data?.data?.kpis);
      console.log("summary:", res.data?.data?.summary);
      console.log("todaySchedule:", res.data?.data?.todaySchedule);
    } catch (err: any) {
      console.error("Vendor dashboard fetch error:", err.response?.data || err.message);
    }
  }
}

main().finally(() => prisma.$disconnect());
