import { prisma } from "../../infrastructure/database/prisma";
import type { Prisma } from "@prisma/client";
import {
    getSalonsByOwner,
    getSalonById,
    findRoleByName,
    assignRole,
} from "./salon.repository";
import { cacheGetOrSet, cacheInvalidate } from "../../infrastructure/redis/cache";
import { currentSubscription, ensureDefaultVendorSubscription } from "../subscription/subscription.service";
import { hasSalonPermission } from "../../common/utils/permission.util";
import { isVendorUser } from "../../common/utils/role.util";
import bcrypt from "bcrypt";

export const createSalonService = async (
    userId: string,
    data: any
) => {
    const salon = await prisma.$transaction(async (tx) => createSalonWithVendorRole(tx, userId, data));

    await cacheInvalidate("salon:*");

    return salon;
};

export const createSalonWithVendorRole = async (
    tx: Prisma.TransactionClient,
    userId: string,
    data: any
) => {
    const salon = await tx.salon.create({
        data: {
            name: data.name,
            parentId: data.parentId,
            description: data.description,
            avgPrice: data.avgPrice,
            avgWaitTime: data.avgWaitTime,
            timings: data.timings || {},
            isActive: data.isActive,
            ownerId: userId,
            contacts: data.contacts ? { create: data.contacts } : undefined,
            address: data.address ? { create: data.address } : undefined,
        },
    });

    const vendorRole = await tx.role.upsert({
        where: { name: "VENDOR" },
        update: {},
        create: { name: "VENDOR" },
    });
    await tx.userRole.upsert({
        where: { userId_roleId: { userId, roleId: vendorRole.id } },
        update: {},
        create: { userId, roleId: vendorRole.id },
    });

    // A user becomes a vendor through this supported onboarding path.  Keep
    // role, default vendor permissions, canonical Free plan, and subscription
    // in the same transaction as the salon creation.
    await ensureDefaultVendorSubscription(userId, salon.id, tx);

    return salon;
};

export const getMySalonsService = async (userId: string) => {
    return cacheGetOrSet(`salon:owner:${userId}`, () => getSalonsByOwner(userId), 1800);
};

export const getSalonBranchesService = async (salonId: string, currentUser?: { userId: string; roles: string[] }) => {
    const salon = await prisma.salon.findUnique({
        where: { id: salonId },
        select: { id: true, ownerId: true }
    });
    if (!salon) throw { status: 404, message: "Salon not found" };
    if (currentUser && !currentUser.roles.includes("ADMIN") && !currentUser.roles.includes("SUPER_ADMIN")
        && salon.ownerId !== currentUser.userId) {
        throw { status: 404, message: "Salon not found" };
    }

    return prisma.salon.findMany({
        where: { parentId: salonId },
        select: { id: true, name: true, isMain: true, parentId: true },
        orderBy: [{ isMain: "desc" }, { name: "asc" }]
    });
};

export const searchBranchesService = async (
    query: { salonId?: string; vendorId?: string; search?: string; page?: number; limit?: number },
    currentUser: { userId: string; roles: string[] },
) => {
    const isAdmin = currentUser.roles.includes("ADMIN") || currentUser.roles.includes("SUPER_ADMIN");
    const isVendor = isVendorUser(currentUser.roles);
    if (!isAdmin && !isVendor) throw { status: 403, message: "Forbidden: Branch access denied" };
    if (!isAdmin && query.vendorId && query.vendorId !== currentUser.userId) {
        throw { status: 403, message: "Forbidden: You can only access your own branches" };
    }

    const vendorId = isAdmin ? query.vendorId : currentUser.userId;
    if (vendorId) {
        const vendor = await prisma.user.findFirst({
            where: { id: vendorId, roles: { some: { role: { name: { contains: "VENDOR", mode: "insensitive" } } } } },
            select: { id: true },
        });
        if (!vendor) throw { status: 400, message: "Vendor not found" };
    }

    if (query.salonId) {
        const salon = await prisma.salon.findUnique({
            where: { id: query.salonId },
            select: { id: true, ownerId: true, parent: { select: { ownerId: true } } },
        });
        if (!salon) throw { status: 400, message: "Salon not found" };
        const belongsToVendor = !vendorId || salon.ownerId === vendorId || salon.parent?.ownerId === vendorId;
        if (!belongsToVendor) throw { status: isAdmin ? 400 : 403, message: "Salon does not belong to the selected vendor" };
        if (!isAdmin && !await hasSalonPermission(salon.id, currentUser.userId, currentUser.roles)) {
            throw { status: 403, message: "Forbidden: Access denied" };
        }
    }

    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
    const where: any = {
        parentId: query.salonId ?? { not: null },
        ...(vendorId ? { parent: { ownerId: vendorId } } : {}),
        ...(query.search ? { name: { contains: query.search, mode: "insensitive" } } : {}),
    };
    const [branches, total] = await Promise.all([
        prisma.salon.findMany({
            where,
            skip: (page - 1) * limit,
            take: limit,
            select: { id: true, name: true, isMain: true, parentId: true, ownerId: true },
            orderBy: [{ isMain: "desc" }, { name: "asc" }],
        }),
        prisma.salon.count({ where }),
    ]);
    return {
        branches,
        pagination: {
            page,
            limit,
            total,
            totalPages: total ? Math.ceil(total / limit) : 0,
            hasNextPage: page * limit < total,
            hasPreviousPage: page > 1,
        },
    };
};

export const createBranchService = async (headOfficeId: string, payload: any, currentUser?: { userId: string; roles: string[] }) => {
    // Verification that headOffice exists and belongs to the owner
    const headOffice = await prisma.salon.findUnique({
        where: { id: headOfficeId }
    });
    if (!headOffice) {
        throw { status: 404, message: "Head Office salon not found" };
    }

    if (currentUser && !currentUser.roles.includes("ADMIN") && !currentUser.roles.includes("SUPER_ADMIN")) {
        if (headOffice.ownerId !== currentUser.userId) {
            throw { status: 403, message: "Forbidden: You do not own this Head Office salon" };
        }
        if (headOffice.parentId !== null || !headOffice.isActive) {
            throw { status: 400, code: "INVALID_BRANCH_PARENT", message: "Branches must be created under an active Head Office salon." };
        }
        const subscription = await currentSubscription(currentUser.userId);
        const maxBranches = subscription?.plan.maxBranches;
        if (maxBranches !== null && maxBranches !== undefined) {
            const branchCount = await prisma.salon.count({ where: { parentId: headOfficeId, isActive: true } });
            if (branchCount >= maxBranches) {
                throw { status: 403, code: "BRANCH_LIMIT_REACHED", message: `Your current subscription allows ${maxBranches} branches. Upgrade your plan to add another branch.` };
            }
        }
    }

    const branch = await prisma.$transaction(async (tx) => {
        const isAdmin = currentUser?.roles.includes("ADMIN") || currentUser?.roles.includes("SUPER_ADMIN");
        let branchOwnerId = currentUser && !isAdmin
            ? currentUser.userId
            : payload.user?.id as string | undefined;

        if (branchOwnerId) {
            const existingUser = await tx.user.findUnique({ where: { id: branchOwnerId }, select: { id: true } });
            if (!existingUser) throw { status: 404, message: "Branch owner user not found" };
        } else {
            const hashedPassword = await bcrypt.hash(payload.user.password, 10);
            const newUser = await tx.user.create({
                data: {
                    firstName: payload.user.firstName,
                    lastName: payload.user.lastName,
                    email: payload.user.email,
                    phone: payload.user.phone,
                    countryCode: payload.user.countryCode,
                    password: hashedPassword,
                },
                select: { id: true },
            });
            branchOwnerId = newUser.id;
        }

        return createSalonWithVendorRole(tx, branchOwnerId, {
            ...payload.salon,
            parentId: headOfficeId,
        });
    });

    await cacheInvalidate("salon:*");

    return branch;
};

export const getSalonByIdService = async (salonId: string, currentUser?: { userId: string; roles: string[] }) => {
    const salon = await cacheGetOrSet(`salon:detail:${salonId}`, async () => {
        const salon = await getSalonById(salonId);
        if (!salon) {
            throw { status: 404, message: "Salon not found" };
        }
        return salon;
    }, 1800);
    if (currentUser && !currentUser.roles.includes("ADMIN") && !currentUser.roles.includes("SUPER_ADMIN")
        && salon.ownerId !== currentUser.userId && salon.parent?.ownerId !== currentUser.userId) {
        throw { status: 404, message: "Salon not found" };
    }
    return salon;
};
