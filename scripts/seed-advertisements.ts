import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import {
  AdvertisementActionType,
  AdvertisementDurationUnit,
  AdvertisementMediaType,
  AdvertisementStatus,
  AdvertisementTargetAudience,
  AdvertisementTargetingMode,
  Prisma,
  PrismaClient,
} from "@prisma/client";

const titlePrefix = "[Demo Advertisement]";
const pincodePool = ["110001", "110002", "110003", "110005", "110006", "400001", "400050", "560001", "560002", "700001", "500001", "411001", "600001", "380001", "302001"];

const scenarios = [
  { slug: "diwali-delhi", title: "Diwali Beauty Offer", description: "Festive-ready salon services at a special price.", mode: "PINCODE", pincodes: ["110001"], days: 30, offset: -2, status: "ACTIVE", media: "IMAGE", action: true },
  { slug: "new-customer-delhi", title: "New Customer Offer", description: "A welcome offer for your first appointment.", mode: "PINCODE", pincodes: ["110002", "110003"], days: 7, offset: -1, status: "ACTIVE", media: "TEXT", action: true },
  { slug: "delhi-campaign", title: "Delhi Salon Campaign", description: "Refresh your style at participating Delhi salons.", mode: "PINCODE", pincodes: ["110001", "110005"], months: 3, offset: -1, status: "ACTIVE", media: "IMAGE" },
  { slug: "mumbai-campaign", title: "Mumbai Monsoon Campaign", description: "A month of special Mumbai salon offers.", mode: "PINCODE", pincodes: ["400001", "400050"], months: 1, offset: -3, status: "ACTIVE", media: "TEXT" },
  { slug: "bengaluru-campaign", title: "Bengaluru Hair Care", description: "Annual hair-care savings in Bengaluru.", mode: "PINCODE", pincodes: ["560001", "560002"], years: 1, offset: -10, status: "ACTIVE", media: "VIDEO", action: true },
  { slug: "pan-india", title: "Pan India Offer", description: "Explore offers from salons across India.", mode: "ALL", pincodes: [], months: 1, offset: -1, status: "ACTIVE", media: "TEXT", action: true },
  { slug: "expired-delhi", title: "Expired Delhi Offer", description: "A completed campaign retained for admin history.", mode: "PINCODE", pincodes: ["110001"], days: 30, offset: -60, status: "EXPIRED", media: "TEXT" },
  { slug: "scheduled-kolkata", title: "Scheduled Festive Campaign", description: "A future campaign that is not yet visible to customers.", mode: "PINCODE", pincodes: ["700001"], days: 14, offset: 5, status: "SCHEDULED", media: "IMAGE" },
  { slug: "kolkata-style-week", title: "Kolkata Style Week", description: "Limited-time styling packages in Kolkata.", mode: "PINCODE", pincodes: ["700001"], days: 7, offset: -2, status: "ACTIVE", media: "TEXT" },
  { slug: "hyderabad-hair-spa", title: "Hyderabad Hair Spa", description: "Relax with a premium hair spa experience.", mode: "PINCODE", pincodes: ["500001"], months: 6, offset: -2, status: "ACTIVE", media: "VIDEO" },
  { slug: "pune-bridal", title: "Pune Bridal Preview", description: "Plan your bridal beauty consultation.", mode: "PINCODE", pincodes: ["411001"], days: 30, offset: -2, status: "ACTIVE", media: "TEXT", action: true },
  { slug: "north-delhi-haircut", title: "North Delhi Haircut Days", description: "Special prices on selected haircut services.", mode: "PINCODE", pincodes: ["110006", "110005"], days: 7, offset: -1, status: "ACTIVE", media: "IMAGE" },
  { slug: "all-location-skincare", title: "All Locations Skincare", description: "Discover skincare services at nearby salons.", mode: "ALL", pincodes: [], months: 3, offset: -1, status: "ACTIVE", media: "TEXT" },
  { slug: "mumbai-styling", title: "Mumbai Premium Styling", description: "Premium styling for special occasions.", mode: "PINCODE", pincodes: ["400050"], months: 2, offset: -2, status: "ACTIVE", media: "IMAGE", action: true },
  { slug: "bengaluru-grooming", title: "Bengaluru Grooming Edit", description: "Modern grooming services in Bengaluru.", mode: "PINCODE", pincodes: ["560002"], days: 30, offset: -1, status: "ACTIVE", media: "TEXT" },
  { slug: "chennai-spotlight", title: "Chennai Salon Spotlight", description: "Featured services at selected Chennai salons.", mode: "PINCODE", pincodes: ["600001"], years: 1, offset: -3, status: "ACTIVE", media: "VIDEO" },
  { slug: "ahmedabad-color", title: "Ahmedabad Color Refresh", description: "Refresh your colour with salon professionals.", mode: "PINCODE", pincodes: ["380001"], days: 15, offset: -2, status: "ACTIVE", media: "TEXT", action: true },
  { slug: "jaipur-wedding", title: "Jaipur Wedding Season", description: "Wedding-season beauty packages in Jaipur.", mode: "PINCODE", pincodes: ["302001"], months: 3, offset: -2, status: "ACTIVE", media: "IMAGE" },
  { slug: "draft-promotion", title: "Draft Salon Promotion", description: "A draft campaign for admin review.", mode: "PINCODE", pincodes: ["500001", "700001"], days: 7, offset: 2, status: "DRAFT", media: "TEXT" },
  { slug: "inactive-beauty-week", title: "Inactive Beauty Week", description: "A paused campaign retained in admin history.", mode: "PINCODE", pincodes: ["110002"], days: 7, offset: -2, status: "INACTIVE", media: "TEXT" },
] as const;

type DurationUnit = "DAYS" | "MONTHS" | "YEARS";

function addDuration(startAt: Date, amount: number, unit: DurationUnit) {
  const endAt = new Date(startAt);
  if (unit === "DAYS") {
    endAt.setUTCDate(endAt.getUTCDate() + amount);
    return endAt;
  }

  const originalDay = endAt.getUTCDate();
  endAt.setUTCDate(1);
  if (unit === "MONTHS") endAt.setUTCMonth(endAt.getUTCMonth() + amount);
  else endAt.setUTCFullYear(endAt.getUTCFullYear() + amount);
  endAt.setUTCDate(Math.min(originalDay, new Date(Date.UTC(endAt.getUTCFullYear(), endAt.getUTCMonth() + 1, 0)).getUTCDate()));
  return endAt;
}

function findLocalMedia(extension: ".jpg" | ".jpeg" | ".png" | ".webp" | ".mp4") {
  const directory = path.join(process.cwd(), "public", "uploads", "feed");
  if (!fs.existsSync(directory)) return null;
  const file = fs.readdirSync(directory).find((name) => path.extname(name).toLowerCase() === extension);
  return file ? `/public/uploads/feed/${file}` : null;
}

function assertLocalDatabase() {
  if (process.env.NODE_ENV === "production") {
    throw new Error("Advertisement dummy data cannot be seeded in production.");
  }
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL is required.");
  const hostname = new URL(connectionString).hostname.toLowerCase();
  if (!["localhost", "127.0.0.1", "::1"].includes(hostname)) {
    throw new Error(`Refusing to seed a non-local database (${hostname}).`);
  }
}

function durationFor(scenario: (typeof scenarios)[number]) {
  if ("days" in scenario) return { durationValue: scenario.days, durationUnit: AdvertisementDurationUnit.DAYS };
  if ("months" in scenario) return { durationValue: scenario.months, durationUnit: AdvertisementDurationUnit.MONTHS };
  return { durationValue: scenario.years, durationUnit: AdvertisementDurationUnit.YEARS };
}

async function main() {
  assertLocalDatabase();
  const prisma = new PrismaClient();
  try {
    const admin = await prisma.user.findFirst({
      where: { roles: { some: { role: { name: { in: ["ADMIN", "SUPER_ADMIN"] } } } } },
      orderBy: { createdAt: "asc" },
      select: { id: true },
    });
    if (!admin) throw new Error("Create/seed an ADMIN or SUPER_ADMIN user before seeding advertisements.");

    const imageUrl = findLocalMedia(".jpg") ?? findLocalMedia(".jpeg") ?? findLocalMedia(".png") ?? findLocalMedia(".webp");
    const videoUrl = findLocalMedia(".mp4");
    const now = new Date();
    const results = await prisma.$transaction(async (tx) => {
      let created = 0;
      let updated = 0;
      for (const scenario of scenarios) {
        for (const pincode of scenario.pincodes) {
          if (!/^\d{6}$/.test(pincode) || !pincodePool.includes(pincode)) {
            throw new Error(`Invalid configured demo pincode for ${scenario.slug}.`);
          }
        }

        const startAt = new Date(now);
        startAt.setUTCDate(startAt.getUTCDate() + scenario.offset);
        startAt.setUTCHours(0, 0, 0, 0);
        const { durationValue, durationUnit } = durationFor(scenario);
        const durationType = durationUnit as DurationUnit;
        const mediaUrl = scenario.media === "IMAGE" ? imageUrl : scenario.media === "VIDEO" ? videoUrl : null;
        const mediaType = scenario.media === "IMAGE" && imageUrl
          ? AdvertisementMediaType.IMAGE
          : scenario.media === "VIDEO" && videoUrl ? AdvertisementMediaType.VIDEO : AdvertisementMediaType.TEXT;
        const actionEnabled = "action" in scenario && scenario.action === true;
        const title = `${titlePrefix} ${scenario.title}`;
        const existing = await tx.advertisement.findFirst({ where: { title }, select: { id: true } });
        const values: Prisma.AdvertisementUncheckedUpdateInput = {
          title,
          description: scenario.description,
          mediaType,
          mediaUrl: mediaType === AdvertisementMediaType.TEXT ? null : mediaUrl,
          image: mediaType === AdvertisementMediaType.IMAGE ? mediaUrl : null,
          media: mediaType === AdvertisementMediaType.TEXT ? null : mediaUrl,
          thumbnailUrl: mediaType === AdvertisementMediaType.VIDEO ? videoUrl : null,
          targetAudience: AdvertisementTargetAudience.BOTH,
          targetingMode: scenario.mode,
          targetType: scenario.mode,
          durationValue,
          durationUnit,
          startAt,
          endAt: addDuration(startAt, durationValue, durationType),
          status: scenario.status,
          actionEnabled,
          actionButtonName: actionEnabled ? "View offer" : null,
          actionType: actionEnabled ? AdvertisementActionType.DEEP_LINK : AdvertisementActionType.NONE,
          actionUrl: actionEnabled ? "/salons" : null,
          ctaText: actionEnabled ? "View offer" : null,
          displayOrder: scenarios.indexOf(scenario),
          priority: scenarios.indexOf(scenario),
          ...(existing ? { updatedById: admin.id } : { createdById: admin.id }),
        };
        const pincodeMappings = {
            deleteMany: {},
            ...(scenario.mode === "PINCODE" ? { create: scenario.pincodes.map((pincode) => ({ pincode })) } : {}),
        };

        if (existing) {
          await tx.advertisement.update({ where: { id: existing.id }, data: { ...values, pincodes: pincodeMappings } });
          updated += 1;
        } else {
          await tx.advertisement.create({
            data: {
              ...values,
              createdById: admin.id,
              pincodes: scenario.mode === "PINCODE" ? { create: scenario.pincodes.map((pincode) => ({ pincode })) } : undefined,
            } as Prisma.AdvertisementUncheckedCreateInput,
          });
          created += 1;
        }
      }
      return { created, updated };
    });
    console.log(`Advertisement dummy seed complete: ${results.created} created, ${results.updated} updated (${scenarios.length} total).`);
    console.log("Only rows with the [Demo Advertisement] title prefix were written; other advertisements were not changed.");
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error("Advertisement dummy seed failed:", error);
  process.exitCode = 1;
});
