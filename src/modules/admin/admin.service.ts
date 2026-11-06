import { prisma } from "../../infrastructure/database/prisma";
import bcrypt from "bcrypt";
import { createSalonWithVendorRole } from "../salon/salon.service";
import { cacheInvalidate } from "../../infrastructure/redis/cache";

export const adminCreateSalonService = async (payload: any) => {
    const salon = await prisma.$transaction(async (tx) => {
        let ownerId = payload.user.id;

        if (ownerId) {
            const existingUser = await tx.user.findUnique({ where: { id: ownerId }, select: { id: true } });
            if (!existingUser) throw { status: 404, message: "Salon owner user not found" };
        } else {
            const existing = await tx.user.findUnique({ where: { email: payload.user.email }, select: { id: true } });
            if (existing) throw { status: 409, message: "A user with this email already exists. Use the existing user ID." };

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
            ownerId = newUser.id;
        }

        return createSalonWithVendorRole(tx, ownerId, payload.salon);
    });

    await cacheInvalidate("salon:*");
    return salon;
};

export const getAdminServicesService = async (query: any = {}, exportAll = false, currentUser?: { userId: string; roles: string[] }) => {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
    const where: any = {
        ...(query.status && { isActive: query.status === 'ACTIVE' }),
        ...(query.categoryId && { categoryId: query.categoryId }),
    };

    if (query.search) {
        where.OR = [
            { name: { contains: query.search, mode: 'insensitive' } },
            { category: { name: { contains: query.search, mode: 'insensitive' } } },
        ];
    }

    // Determine target salon IDs based on branchId, salonId, and vendorId
    if (query.branchId) {
        const branch = await prisma.salon.findUnique({
            where: { id: query.branchId },
            select: { id: true, parentId: true, ownerId: true },
        });
        if (branch) {
            const ids = [branch.id, branch.parentId].filter(Boolean) as string[];
            where.salonId = { in: ids };
        } else {
            where.salonId = query.branchId;
        }
    } else if (query.salonId) {
        const branches = await prisma.salon.findMany({
            where: { parentId: query.salonId },
            select: { id: true },
        });
        where.salonId = { in: [query.salonId, ...branches.map((b) => b.id)] };
    }

    // Vendor and location filters
    const vendorScopeId = (currentUser && !currentUser.roles.includes('ADMIN') && !currentUser.roles.includes('SUPER_ADMIN'))
        ? currentUser.userId
        : query.vendorId;

    if (vendorScopeId || query.country || query.city || query.state) {
        where.salon = {
            ...(vendorScopeId && {
                OR: [
                    { ownerId: vendorScopeId },
                    { parent: { ownerId: vendorScopeId } }
                ]
            }),
            ...((query.country || query.city || query.state) && {
                address: {
                    ...(query.country && { country: { equals: query.country, mode: 'insensitive' } }),
                    ...(query.city && { city: { equals: query.city, mode: 'insensitive' } }),
                    ...(query.state && { state: { equals: query.state, mode: 'insensitive' } }),
                },
            }),
        };
    }

    if (query.createdFrom || query.createdTo) {
        where.createdAt = {
            ...(query.createdFrom && { gte: new Date(query.createdFrom) }),
            ...(query.createdTo && { lte: new Date(query.createdTo) }),
        };
    }
    if (query.updatedFrom || query.updatedTo) {
        where.updatedAt = {
            ...(query.updatedFrom && { gte: new Date(query.updatedFrom) }),
            ...(query.updatedTo && { lte: new Date(query.updatedTo) }),
        };
    }

    const [items, total] = await Promise.all([
        prisma.service.findMany({
            where,
            ...(exportAll ? {} : { skip: (page - 1) * limit, take: limit }),
            orderBy: { createdAt: 'desc' },
            include: {
                images: true,
                category: { select: { id: true, name: true } },
                salon: {
                    select: {
                        id: true,
                        name: true,
                        parentId: true,
                        parent: { select: { id: true, name: true } },
                        address: true,
                        ownerId: true,
                        owner: { select: { id: true, firstName: true, lastName: true, email: true } },
                    },
                },
            },
        }),
        prisma.service.count({ where }),
    ]);
    return { items, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
};

export const getAllUsersService = async (currentUser?: { userId: string; roles: string[] }) => {
    const where: any = {};
    if (currentUser && !currentUser.roles.includes('ADMIN') && !currentUser.roles.includes('SUPER_ADMIN')) {
        const userId = currentUser.userId;
        where.OR = [
            { id: userId },
            {
                staffIn: {
                    some: {
                        salon: {
                            OR: [
                                { ownerId: userId },
                                { parent: { ownerId: userId } }
                            ]
                        }
                    }
                }
            },
            {
                ownedSalons: {
                    some: {
                        parent: { ownerId: userId }
                    }
                }
            }
        ];
    }

    return prisma.user.findMany({
        where,
        select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            isActive: true,
            roles: {
                select: {
                    role: {
                        select: {
                            name: true
                        }
                    }
                }
            }
        }
    });
};

export const getAllSalonsService = async (
    page: number, 
    limit: number, 
    search?: string, 
    sortBy: string = 'createdAt', 
    sortOrder: string = 'desc',
    parentId?: string | null,
    filter?: 'only_head_offices' | 'only_branches',
    currentUser?: { userId: string; roles: string[] },
    location?: { country?: string; state?: string; city?: string; status?: 'ACTIVE' | 'INACTIVE'; createdFrom?: Date; createdTo?: Date; updatedFrom?: Date; updatedTo?: Date; vendorId?: string },
    exportAll = false
) => {
    const skip = (page - 1) * limit;
    
    const where: any = {};
    const andConditions: any[] = [];
    if (location?.vendorId) {
        andConditions.push({
            OR: [
                { ownerId: location.vendorId },
                { parent: { ownerId: location.vendorId } }
            ]
        });
    }
    if (location?.status) where.isActive = location.status === 'ACTIVE';
    if (location?.createdFrom || location?.createdTo) where.createdAt = { ...(location.createdFrom && { gte: location.createdFrom }), ...(location.createdTo && { lte: location.createdTo }) };
    if (location?.updatedFrom || location?.updatedTo) where.updatedAt = { ...(location.updatedFrom && { gte: location.updatedFrom }), ...(location.updatedTo && { lte: location.updatedTo }) };
    if (location?.country || location?.state || location?.city) where.address = { ...(location.country && { country: { equals: location.country, mode: 'insensitive' } }), ...(location.state && { state: { equals: location.state, mode: 'insensitive' } }), ...(location.city && { city: { equals: location.city, mode: 'insensitive' } }) };
    if (search) {
        andConditions.push({
            OR: [
                { name: { contains: search, mode: 'insensitive' } },
                { owner: { email: { contains: search, mode: 'insensitive' } } },
                { owner: { firstName: { contains: search, mode: 'insensitive' } } },
            ]
        });
    }
    if (andConditions.length > 0) {
        where.AND = andConditions;
    }

    if (currentUser && !currentUser.roles.includes('ADMIN') && !currentUser.roles.includes('SUPER_ADMIN')) {
        // Vendor context
        const userId = currentUser.userId;
        const vendorSalonsFilter = {
            OR: [
                { ownerId: userId },
                { parent: { ownerId: userId } }
            ]
        };

        if (parentId !== undefined && parentId !== null) {
            where.AND = [
                ...(where.AND || []),
                { parentId: parentId },
                vendorSalonsFilter
            ];
        } else if (filter === 'only_head_offices') {
            where.AND = [
                ...(where.AND || []),
                { parentId: null },
                { ownerId: userId }
            ];
        } else if (filter === 'only_branches') {
            where.AND = [
                ...(where.AND || []),
                { parentId: { not: null } },
                { parent: { ownerId: userId } }
            ];
        } else {
            where.AND = [
                ...(where.AND || []),
                vendorSalonsFilter
            ];
        }
    } else {
        // Admin context
        if (parentId !== undefined) {
            where.parentId = parentId;
        } else if (filter === 'only_head_offices') {
            where.parentId = null;
        } else if (filter === 'only_branches') {
            where.parentId = { not: null };
        }
    }

    // Handle nested sorting like owner.firstName
    let orderBy: any = {};
    if (sortBy.includes('.')) {
        const [relation, field] = sortBy.split('.');
        orderBy[relation] = { [field]: sortOrder };
    } else {
        orderBy[sortBy] = sortOrder;
    }

    const [salons, total] = await Promise.all([
        prisma.salon.findMany({
            where,
            ...(exportAll ? {} : { skip, take: limit }),
            include: {
                owner: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        email: true,
                        phone: true,
                    }
                },
                parent: {
                    select: {
                        id: true,
                        name: true,
                        ownerId: true
                    }
                },
                contacts: true,
                address: true,
                branches: true,
            },
            orderBy
        }),
        prisma.salon.count({ where })
    ]);

    return { salons, total, page, limit, totalPages: Math.ceil(total / limit) };
};

export const getSalonByIdService = async (id: string, currentUser?: { userId: string; roles: string[] }) => {
    const salon = await prisma.salon.findUnique({
        where: { id },
        include: {
            owner: {
                select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    email: true,
                    phone: true,
                }
            },
            parent: {
                select: {
                    id: true,
                    name: true,
                    ownerId: true
                }
            },
            contacts: true,
            address: true,
        }
    });
    if (!salon) throw { status: 404, message: "Salon not found" };

    if (currentUser && !currentUser.roles.includes('ADMIN') && !currentUser.roles.includes('SUPER_ADMIN')) {
        const isOwner = salon.ownerId === currentUser.userId;
        const isParentOwner = salon.parent?.ownerId === currentUser.userId;
        if (!isOwner && !isParentOwner) {
            throw { status: 403, message: "Forbidden: You do not own this salon or branch" };
        }
    }

    return salon;
};

export const updateSalonService = async (id: string, payload: any, currentUser?: { userId: string; roles: string[] }) => {
    const existing = await prisma.salon.findUnique({ 
        where: { id },
        include: { parent: true }
    });
    if (!existing) throw { status: 404, message: "Salon not found" };

    if (currentUser && !currentUser.roles.includes('ADMIN') && !currentUser.roles.includes('SUPER_ADMIN')) {
        const isOwner = existing.ownerId === currentUser.userId;
        const isParentOwner = existing.parent?.ownerId === currentUser.userId;
        if (!isOwner && !isParentOwner) {
            throw { status: 403, message: "Forbidden: You do not own this salon or branch" };
        }
    }

    // Use transaction to update salon, address and contacts
    const updatedSalon = await prisma.$transaction(async (tx) => {
        const salon = await tx.salon.update({
            where: { id },
            data: {
                name: payload.name,
                description: payload.description,
                avgPrice: payload.avgPrice,
                avgWaitTime: payload.avgWaitTime,
                timings: payload.timings ? payload.timings : undefined,
                isActive: payload.isActive,
                address: payload.address ? {
                    upsert: {
                        create: (() => {
                            const { id, salonId, ...rest } = payload.address;
                            return rest;
                        })(),
                        update: (() => {
                            const { id, salonId, ...rest } = payload.address;
                            return rest;
                        })()
                    }
                } : undefined,
            },
            include: { address: true, contacts: true }
        });

        if (payload.contacts && Array.isArray(payload.contacts)) {
            // delete old contacts
            await tx.salonContact.deleteMany({ where: { salonId: id } });
            // create new
            if (payload.contacts.length > 0) {
                await tx.salonContact.createMany({
                    data: payload.contacts.map((c: any) => ({ ...c, salonId: id }))
                });
            }
        }

        return tx.salon.findUnique({
            where: { id },
            include: { address: true, contacts: true, owner: { select: { firstName: true, lastName: true, email: true } } }
        });
    });
    await cacheInvalidate("salon:*");
    return updatedSalon;
};

export const deleteSalonService = async (id: string, currentUser?: { userId: string; roles: string[] }) => {
    const salon = await prisma.salon.findUnique({ 
        where: { id },
        include: { parent: true }
    });
    if (!salon) throw { status: 404, message: "Salon not found" };

    if (currentUser && !currentUser.roles.includes('ADMIN') && !currentUser.roles.includes('SUPER_ADMIN')) {
        const isOwner = salon.ownerId === currentUser.userId;
        const isParentOwner = salon.parent?.ownerId === currentUser.userId;
        if (!isOwner && !isParentOwner) {
            throw { status: 403, message: "Forbidden: You do not own this salon or branch" };
        }
    }

    const ownerId = salon.ownerId;

    await prisma.$transaction(async (tx) => {
        // Delete salon
        await tx.salon.delete({ where: { id } });

        // Check if owner has other salons
        const otherSalonsCount = await tx.salon.count({ where: { ownerId } });
        
        if (otherSalonsCount === 0) {
            // Find VENDOR role
            const vendorRole = await tx.role.findUnique({ where: { name: 'VENDOR' } });
            if (vendorRole) {
                // Remove VENDOR role from this user
                await tx.userRole.deleteMany({
                    where: {
                        userId: ownerId,
                        roleId: vendorRole.id
                    }
                });
            }
        }
    });

    await cacheInvalidate("salon:*");
    return true;
};
