import { Gender } from "@prisma/client";
import { prisma } from "../../infrastructure/database/prisma";

const validGenders = new Set<Gender>([
  Gender.MALE,
  Gender.FEMALE,
  Gender.OTHER,
  Gender.PREFER_NOT_TO_SAY,
]);

export type CustomerProfileData = {
  firstName: string;
  lastName: string | null;
  dob: Date | null;
  gender: Gender | null;
  passwordConfigured: boolean;
  profileCompletedAt?: Date | null;
  customerAddresses: Array<{
    addressLine1: string;
    city: string;
    state: string;
    country: string;
    postalCode: string;
  }>;
};

export function getMissingCustomerProfileFields(profile: CustomerProfileData): string[] {
  const missing: string[] = [];
  const firstName = profile.firstName.trim();
  const lastName = profile.lastName?.trim() ?? "";
  const dateIsValid = profile.dob instanceof Date
    && !Number.isNaN(profile.dob.getTime())
    && profile.dob.getTime() <= new Date().getTime();
  const address = profile.customerAddresses[0];

  if (firstName.length < 2 || firstName.length > 50) missing.push("firstName");
  if (lastName.length < 2 || lastName.length > 50) missing.push("lastName");
  if (!dateIsValid) missing.push("dob");
  if (!profile.gender || !validGenders.has(profile.gender)) missing.push("gender");
  if (!address
    || !address.addressLine1.trim()
    || !address.city.trim()
    || !address.state.trim()
    || !address.country.trim()
    || !address.postalCode.trim()
    || (address.country.trim().toLowerCase() === "india" && !/^\d{6}$/.test(address.postalCode))) {
    missing.push("primaryAddress");
  }
  if (!profile.passwordConfigured) missing.push("password");
  return missing;
}

export async function getCustomerProfileStatus(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      firstName: true,
      lastName: true,
      dob: true,
      gender: true,
      passwordConfigured: true,
      profileCompletedAt: true,
      customerAddresses: {
        where: { isDefault: true },
        orderBy: { updatedAt: "desc" },
        take: 1,
        select: { addressLine1: true, city: true, state: true, country: true, postalCode: true },
      },
    },
  });

  if (!user) throw { status: 404, code: "CUSTOMER_NOT_FOUND", message: "Customer not found." };
  const missingFields = getMissingCustomerProfileFields(user);
  const profileCompleted = missingFields.length === 0;
  let profileCompletedAt = profileCompleted ? user.profileCompletedAt : null;

  if (profileCompleted && !profileCompletedAt) {
    profileCompletedAt = new Date();
    await prisma.user.update({
      where: { id: userId },
      data: { profileCompletedAt },
    });
  } else if (!profileCompleted && user.profileCompletedAt) {
    await prisma.user.update({
      where: { id: userId },
      data: { profileCompletedAt: null },
    });
  }

  return {
    profileCompleted,
    profileCompletedAt,
    passwordConfigured: user.passwordConfigured,
    missingFields,
  };
}
