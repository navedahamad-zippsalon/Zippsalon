import "dotenv/config";
import { PrismaClient } from "@prisma/client";

if (process.env.NODE_ENV === "production") {
  throw new Error("CRITICAL: Refusing to run seed:staff:reset in production environment!");
}

const prisma = new PrismaClient();

export async function resetStaffDemo() {
  console.log("\n============================================================");
  console.log("  ZIPP SALON - RESETTING STAFF DEMO DATA");
  console.log("============================================================\n");

  const stylistEmail = "stylist@zippsalon.com";
  const vendorEmail = "owner@zippsalon.com";

  // 1. Find Stylist
  const stylist = await prisma.user.findUnique({ where: { email: stylistEmail } });
  if (stylist) {
    console.log(`Found stylist user: ${stylist.email} (${stylist.id})`);

    const staffRecords = await prisma.salonStaff.findMany({ where: { userId: stylist.id } });
    const staffIds = staffRecords.map((s) => s.id);

    // Delete Attendances
    if (staffIds.length > 0) {
      const deletedAttendance = await prisma.attendance.deleteMany({
        where: { staffId: { in: staffIds } },
      });
      console.log(`Deleted ${deletedAttendance.count} attendance records.`);

      // Delete Bookings (cascades payments & bookingServices)
      const deletedBookings = await prisma.booking.deleteMany({
        where: { staffId: { in: staffIds } },
      });
      console.log(`Deleted ${deletedBookings.count} bookings.`);
    }

    // Delete Feed Posts created by stylist
    const posts = await prisma.feedPost.findMany({ where: { createdBy: stylist.id } });
    if (posts.length > 0) {
      const postIds = posts.map((p) => p.id);
      await prisma.feedPostLike.deleteMany({ where: { postId: { in: postIds } } });
      await prisma.feedComment.deleteMany({ where: { postId: { in: postIds } } });
      await prisma.feedPostView.deleteMany({ where: { postId: { in: postIds } } });
      await prisma.feedMedia.deleteMany({ where: { postId: { in: postIds } } });
      const deletedPosts = await prisma.feedPost.deleteMany({ where: { id: { in: postIds } } });
      console.log(`Deleted ${deletedPosts.count} feed posts.`);
    }

    // Delete SalonStaff & UserRoles
    await prisma.salonStaff.deleteMany({ where: { userId: stylist.id } });
    await prisma.userRole.deleteMany({ where: { userId: stylist.id } });
    await prisma.user.delete({ where: { id: stylist.id } });
    console.log(`Deleted stylist user record: ${stylistEmail}`);
  } else {
    console.log("No stylist user found to clean up.");
  }

  // 2. Demo Customers
  const customerEmails = [
    "amit.patel@gmail.com", "priya.sharma@gmail.com", "vikram.singh@gmail.com",
    "sneha.rao@gmail.com", "rohan.verma@gmail.com", "neha.gupta@gmail.com",
    "ananya.desai@gmail.com", "aditya.mehta@gmail.com", "pooja.joshi@gmail.com",
    "siddharth.m@gmail.com", "ritu.sen@gmail.com", "kunal.kapoor@gmail.com",
    "tanvi.shah@gmail.com", "rahul.singhal@gmail.com", "divya.nair@gmail.com",
    "aman.verma@gmail.com", "vikas.mehta@gmail.com", "arjun.nair@gmail.com",
    "sunita.rao@gmail.com", "deepak.chopra@gmail.com", "karan.johar@gmail.com",
    "nisha.agarwal@gmail.com"
  ];

  const demoCustomers = await prisma.user.findMany({
    where: { email: { in: customerEmails } },
  });

  if (demoCustomers.length > 0) {
    const custIds = demoCustomers.map((c) => c.id);
    await prisma.booking.deleteMany({ where: { customerId: { in: custIds } } });
    await prisma.salonCustomer.deleteMany({ where: { userId: { in: custIds } } });
    await prisma.userRole.deleteMany({ where: { userId: { in: custIds } } });
    const deletedCust = await prisma.user.deleteMany({ where: { id: { in: custIds } } });
    console.log(`Deleted ${deletedCust.count} demo customer accounts.`);
  }

  // 3. Demo Salons: Cyber City Branch and Gurgaon Main Salon
  const demoSalons = await prisma.salon.findMany({
    where: { name: { in: ["Zipp Salon - Gurgaon", "Zipp Salon - Cyber City"] } },
  });

  for (const s of demoSalons.filter((sal) => sal.parentId !== null)) {
    // Child branch first
    await prisma.address.deleteMany({ where: { salonId: s.id } });
    await prisma.gSTConfiguration.deleteMany({ where: { salonId: s.id } });
    await prisma.service.deleteMany({ where: { salonId: s.id } });
    await prisma.salonStaff.deleteMany({ where: { salonId: s.id } });
    await prisma.salonCustomer.deleteMany({ where: { salonId: s.id } });
    await prisma.salon.delete({ where: { id: s.id } });
    console.log(`Deleted demo branch: ${s.name}`);
  }

  for (const s of demoSalons.filter((sal) => sal.parentId === null)) {
    // Main salon next
    await prisma.address.deleteMany({ where: { salonId: s.id } });
    await prisma.gSTConfiguration.deleteMany({ where: { salonId: s.id } });
    await prisma.staffRole.deleteMany({ where: { salonId: s.id } });
    await prisma.service.deleteMany({ where: { salonId: s.id } });
    await prisma.salonStaff.deleteMany({ where: { salonId: s.id } });
    await prisma.salonCustomer.deleteMany({ where: { salonId: s.id } });
    await prisma.salon.delete({ where: { id: s.id } });
    console.log(`Deleted demo salon: ${s.name}`);
  }

  // 4. Demo Vendor (if no other salons exist for them)
  const vendor = await prisma.user.findUnique({ where: { email: vendorEmail } });
  if (vendor) {
    const remainingSalons = await prisma.salon.count({ where: { ownerId: vendor.id } });
    if (remainingSalons === 0) {
      await prisma.userRole.deleteMany({ where: { userId: vendor.id } });
      await prisma.user.delete({ where: { id: vendor.id } });
      console.log(`Deleted demo vendor user: ${vendorEmail}`);
    }
  }

  console.log("\n============================================================");
  console.log("  STAFF DEMO DATA RESET COMPLETE!");
  console.log("============================================================\n");
}

if (require.main === module) {
  resetStaffDemo()
    .catch((err) => {
      console.error("Staff demo reset failed:", err);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
