import { Prisma } from "@prisma/client";

export function userNameContains(value: string): Prisma.UserWhereInput {
  const words = value.trim().split(/\s+/).filter(Boolean);
  return {
    AND: words.map((word) => ({
      OR: [
        { firstName: { contains: word, mode: "insensitive" } },
        { lastName: { contains: word, mode: "insensitive" } },
      ],
    })),
  };
}

export function userSearchWhere(value: string): Prisma.UserWhereInput {
  const words = value.trim().split(/\s+/).filter(Boolean);
  return {
    OR: [
      { email: { contains: value, mode: "insensitive" } },
      { phone: { contains: value } },
      userNameContains(value),
    ],
  };
}
