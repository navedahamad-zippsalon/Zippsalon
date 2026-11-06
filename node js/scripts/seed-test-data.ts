import "dotenv/config";
import bcrypt from "bcrypt";
import { PrismaClient } from "@prisma/client";

if (process.env.NODE_ENV === "production") throw new Error("seed:test refuses to run in production");
if (!process.env.TEST_DATABASE_URL) throw new Error("TEST_DATABASE_URL is required; the test seed never uses DATABASE_URL");

const prisma = new PrismaClient({ datasources: { db: { url: process.env.TEST_DATABASE_URL } } });
const password = bcrypt.hashSync("Admin@12345", 10);

async function main() {
    const roles = await Promise.all(["ADMIN", "VENDOR", "STAFF", "CUSTOMER"].map((name) => prisma.role.upsert({ where: { name }, update: {}, create: { name } })));
    const roleByName = new Map(roles.map((role) => [role.name, role]));
    const users = await Promise.all([
        prisma.user.upsert({ where: { email: "admin@test.zippsalon.local" }, update: {}, create: { firstName: "Test", lastName: "Admin", email: "admin@test.zippsalon.local", phone: "9000000001", countryCode: "+91", password } }),
        prisma.user.upsert({ where: { email: "vendor@test.zippsalon.local" }, update: {}, create: { firstName: "Test", lastName: "Vendor", email: "vendor@test.zippsalon.local", phone: "9000000002", countryCode: "+91", password } }),
        prisma.user.upsert({ where: { email: "staff@test.zippsalon.local" }, update: {}, create: { firstName: "Test", lastName: "Staff", email: "staff@test.zippsalon.local", phone: "9000000003", countryCode: "+91", password } }),
    ]);
    await Promise.all(users.map((user, index) => prisma.userRole.upsert({ where: { userId_roleId: { userId: user.id, roleId: roles[index].id } }, update: {}, create: { userId: user.id, roleId: roles[index].id } })));
    const customer = await prisma.user.upsert({
        where: { email: "customer@test.zippsalon.local" },
        update: {},
        create: { firstName: "Test", lastName: "Customer", email: "customer@test.zippsalon.local", phone: "9000000004", countryCode: "+91", password },
    });
    await prisma.userRole.upsert({ where: { userId_roleId: { userId: customer.id, roleId: roles[3].id } }, update: {}, create: { userId: customer.id, roleId: roles[3].id } });
    const salon = await prisma.salon.upsert({ where: { id: "00000000-0000-4000-8000-000000000001" }, update: {}, create: { id: "00000000-0000-4000-8000-000000000001", name: "Demo Salon 01", ownerId: users[1].id, timings: {}, isActive: true } });
    const branch = await prisma.salon.upsert({ where: { id: "00000000-0000-4000-8000-000000000002" }, update: {}, create: { id: "00000000-0000-4000-8000-000000000002", name: "Demo Branch 01", parentId: salon.id, ownerId: users[1].id, timings: {}, isActive: true } });
    const category = await prisma.serviceCategory.upsert({ where: { name: "Demo Services" }, update: {}, create: { name: "Demo Services" } });
    const service = await prisma.service.upsert({ where: { id: "00000000-0000-4000-8000-000000000003" }, update: {}, create: { id: "00000000-0000-4000-8000-000000000003", salonId: salon.id, name: "Demo Haircut", categoryId: category.id, basePrice: 500, baseDuration: 30, createdById: users[1].id } });
    await prisma.salonStaff.upsert({
        where: { userId_salonId: { userId: users[2].id, salonId: salon.id } },
        update: { isActive: true },
        create: { userId: users[2].id, salonId: salon.id, role: "Stylist", isActive: true },
    });
    await prisma.salonCustomer.upsert({ where: { salonId_userId: { salonId: salon.id, userId: customer.id } }, update: {}, create: { salonId: salon.id, userId: customer.id } });
    const staff = await prisma.salonStaff.findUniqueOrThrow({ where: { userId_salonId: { userId: users[2].id, salonId: salon.id } } });
    const demoBookings = [
        { id: "00000000-0000-4000-8000-000000000004", source: "APP" as const, medium: "APP" as const, dayOffset: 2 },
        { id: "00000000-0000-4000-8000-000000000005", source: "WEB" as const, medium: "ONLINE" as const, dayOffset: 3 },
    ];
    for (const fixture of demoBookings) {
        await prisma.booking.upsert({
            where: { id: fixture.id },
            update: { salonId: salon.id, branchId: branch.id, customerId: customer.id, staffId: staff.id, bookingDate: new Date(Date.now() + fixture.dayOffset * 86_400_000), status: "CONFIRMED", medium: fixture.medium, totalAmount: 500, finalAmount: 500, notes: `test:booking-source:${fixture.source}` },
            create: { id: fixture.id, salonId: salon.id, branchId: branch.id, customerId: customer.id, staffId: staff.id, bookingDate: new Date(Date.now() + fixture.dayOffset * 86_400_000), status: "CONFIRMED", medium: fixture.medium, totalAmount: 500, finalAmount: 500, notes: `test:booking-source:${fixture.source}`, services: { create: { serviceId: service.id, name: service.name, price: 500 } } },
        });
    }
    console.log(JSON.stringify({ seeded: true, accounts: { admin: "admin@test.zippsalon.local", vendor: "vendor@test.zippsalon.local", staff: "staff@test.zippsalon.local", customer: "customer@test.zippsalon.local" }, bookings: { app: demoBookings[0].id, web: demoBookings[1].id }, salonId: salon.id, branchId: branch.id, roles: Array.from(roleByName.keys()) }));
}

main().finally(() => prisma.$disconnect());
