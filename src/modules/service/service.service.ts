import { prisma } from "../../infrastructure/database/prisma";
import { hasSalonPermission } from "../../common/utils/permission.util";
import { APP_CONSTANTS } from "../../common/constants/app.constants";
import { saveBase64Image } from "../../common/utils/file.util";

// --- Categories (Admin Only) ---

export const createCategoryService = async (data: any) => {
    return prisma.serviceCategory.create({
        data: {
            name: data.name,
            isActive: data.isActive ?? true
        }
    });
};

export const updateCategoryService = async (id: string, data: any) => {
    const category = await prisma.serviceCategory.update({
        where: { id },
        data: {
            name: data.name,
            isActive: data.isActive
        }
    });

    // If deactivated, we might want to handle services? 
    // The requirement says "those services are deactivted from salons as well".
    // Since we now have direct ownership, we can deactivate services under this category.
    if (data.isActive === false) {
        await prisma.service.updateMany({
            where: { categoryId: id },
            data: { isActive: false }
        });
    }

    return category;
};

export const getAllCategoriesService = async (isAdmin: boolean = false) => {
    return prisma.serviceCategory.findMany({
        where: isAdmin ? {} : { isActive: true },
        orderBy: { name: 'asc' }
    });
};

// --- Services ---

export const createServiceService = async (salonId: string, userId: string, userRoles: string[], payload: any) => {
    if (userRoles.includes(APP_CONSTANTS.ROLES.STAFF)) throw { status: 403, message: "Forbidden: Staff cannot modify services" };
    const hasPerm = await hasSalonPermission(salonId, userId, userRoles);
    if (!hasPerm) throw { status: 403, message: "Forbidden: Access denied" };

    const { images = [], ...data } = payload;

    const processedImages = await Promise.all(images.map(async (img: any) => {
        if (img.startsWith('data:image')) {
            const url = await saveBase64Image(img, 'services');
            return { url };
        }
        return { url: img };
    }));

    return prisma.service.create({
        data: {
            salonId,
            name: data.name,
            description: data.description,
            categoryId: data.categoryId,
            basePrice: parseFloat(data.basePrice),
            baseDuration: parseInt(data.baseDuration),
            isActive: data.isActive ?? true,
            createdById: userId,
            images: {
                create: processedImages.slice(0, 3) // Limit to 3
            }
        },
        include: { images: true, category: true }
    });
};

export const updateServiceService = async (serviceId: string, userId: string, userRoles: string[], payload: any) => {
    if (userRoles.includes(APP_CONSTANTS.ROLES.STAFF)) throw { status: 403, message: "Forbidden: Staff cannot modify services" };
    const service = await prisma.service.findUnique({ where: { id: serviceId } });
    if (!service) throw { status: 404, message: "Service not found" };

    const hasPerm = await hasSalonPermission(service.salonId, userId, userRoles);
    if (!hasPerm) throw { status: 403, message: "Forbidden: Access denied" };

    const { images = [], ...data } = payload;

    const processedImages = await Promise.all(images.map(async (img: any) => {
        if (img.startsWith('data:image')) {
            const url = await saveBase64Image(img, 'services');
            return { url };
        }
        return { url: img };
    }));

    // Update service
    return prisma.$transaction(async (tx) => {
        if (processedImages.length > 0) {
            await tx.serviceImage.deleteMany({ where: { serviceId } });
            await tx.serviceImage.createMany({
                data: processedImages.slice(0, 3).map(img => ({ ...img, serviceId }))
            });
        }

        return tx.service.update({
            where: { id: serviceId },
            data: {
                name: data.name,
                description: data.description,
                categoryId: data.categoryId,
                basePrice: data.basePrice !== undefined ? parseFloat(data.basePrice) : undefined,
                baseDuration: data.baseDuration !== undefined ? parseInt(data.baseDuration) : undefined,
                isActive: data.isActive,
                updatedById: userId
            },
            include: { images: true, category: true }
        });
    });
};

export const getSalonServicesService = async (salonId: string, userId: string, userRoles: string[], query: any = {}) => {
    const { page = 1, limit = 10, search = '' } = query;
    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

    const isAllSalons = salonId === "all";
    let accessibleSalonIds: string[] | undefined;
    if (isAllSalons) {
        if (userRoles.includes(APP_CONSTANTS.ROLES.ADMIN) || userRoles.includes("SUPER_ADMIN")) {
            accessibleSalonIds = undefined;
        } else if (userRoles.includes(APP_CONSTANTS.ROLES.STAFF)) {
            const memberships = await prisma.salonStaff.findMany({
                where: { userId, isActive: true },
                select: { salonId: true },
            });
            accessibleSalonIds = memberships.map(({ salonId: membershipSalonId }) => membershipSalonId);
        } else {
            const salons = await prisma.salon.findMany({
                where: { OR: [{ ownerId: userId }, { parent: { ownerId: userId } }] },
                select: { id: true },
            });
            accessibleSalonIds = salons.map(({ id }) => id);
        }
        if (accessibleSalonIds && accessibleSalonIds.length === 0) {
            return { services: [], meta: { total: 0, page: parseInt(page as string), pages: 0, limit: parseInt(limit as string) } };
        }
    } else {
        const hasPerm = await hasSalonPermission(salonId, userId, userRoles);
        if (!hasPerm) throw { status: 403, message: "Forbidden: Access denied" };
    }

    const where: any = {
        salonId: isAllSalons ? (accessibleSalonIds ? { in: accessibleSalonIds } : undefined) : salonId,
        category: { isActive: true } // Hide services if category is inactive
    };

    if (search) {
        where.OR = [
            { name: { contains: search, mode: 'insensitive' } },
            { description: { contains: search, mode: 'insensitive' } },
        ];
    }

    const [total, services] = await Promise.all([
        prisma.service.count({ where }),
        prisma.service.findMany({
            where,
            include: { images: true, category: true },
            orderBy: { createdAt: 'desc' },
            skip,
            take: parseInt(limit as string)
        })
    ]);

    return {
        services,
        meta: {
            total,
            page: parseInt(page as string),
            pages: Math.ceil(total / parseInt(limit as string)),
            limit: parseInt(limit as string)
        }
    };
};

// --- Combos ---

export const createComboService = async (salonId: string, userId: string, userRoles: string[], payload: any) => {
    if (userRoles.includes(APP_CONSTANTS.ROLES.STAFF)) throw { status: 403, message: "Forbidden: Staff cannot modify services" };
    const hasPerm = await hasSalonPermission(salonId, userId, userRoles);
    if (!hasPerm) throw { status: 403, message: "Forbidden: Access denied" };

    const { serviceIds = [], ...data } = payload;

    let imageUrl = data.imageUrl;
    if (imageUrl && imageUrl.startsWith('data:image')) {
        imageUrl = await saveBase64Image(imageUrl, 'combos');
    }

    return prisma.combo.create({
        data: {
            salonId,
            name: data.name,
            description: data.description,
            price: parseFloat(data.price),
            duration: parseInt(data.duration),
            isActive: data.isActive ?? true,
            imageUrl,
            items: {
                create: serviceIds.map((sId: string) => ({ serviceId: sId }))
            }
        },
        include: { items: { include: { service: { include: { images: true } } } } }
    });
};

export const updateComboService = async (comboId: string, userId: string, userRoles: string[], payload: any) => {
    if (userRoles.includes(APP_CONSTANTS.ROLES.STAFF)) throw { status: 403, message: "Forbidden: Staff cannot modify services" };
    const combo = await prisma.combo.findUnique({ where: { id: comboId } });
    if (!combo) throw { status: 404, message: "Combo not found" };

    const hasPerm = await hasSalonPermission(combo.salonId, userId, userRoles);
    if (!hasPerm) throw { status: 403, message: "Forbidden: Access denied" };

    const { serviceIds, ...data } = payload;

    let imageUrl = data.imageUrl;
    if (imageUrl && imageUrl.startsWith('data:image')) {
        imageUrl = await saveBase64Image(imageUrl, 'combos');
    }

    return prisma.$transaction(async (tx) => {
        if (serviceIds) {
            await tx.comboItem.deleteMany({ where: { comboId } });
            await tx.comboItem.createMany({
                data: serviceIds.map((sId: string) => ({ comboId, serviceId: sId }))
            });
        }

        return tx.combo.update({
            where: { id: comboId },
            data: {
                name: data.name,
                description: data.description,
                price: data.price !== undefined ? parseFloat(data.price) : undefined,
                duration: data.duration !== undefined ? parseInt(data.duration) : undefined,
                isActive: data.isActive,
                imageUrl
            },
            include: { items: { include: { service: true } } }
        });
    });
};

export const getCombosBySalonService = async (salonId: string, userId: string, userRoles: string[], query: any = {}) => {
    const { page = 1, limit = 10, search = '' } = query;
    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

    const isAllSalons = salonId === "all";
    let accessibleSalonIds: string[] | undefined;
    if (isAllSalons) {
        if (userRoles.includes(APP_CONSTANTS.ROLES.ADMIN) || userRoles.includes("SUPER_ADMIN")) {
            accessibleSalonIds = undefined;
        } else if (userRoles.includes(APP_CONSTANTS.ROLES.STAFF)) {
            const memberships = await prisma.salonStaff.findMany({
                where: { userId, isActive: true },
                select: { salonId: true },
            });
            accessibleSalonIds = memberships.map(({ salonId: membershipSalonId }) => membershipSalonId);
        } else {
            const salons = await prisma.salon.findMany({
                where: { OR: [{ ownerId: userId }, { parent: { ownerId: userId } }] },
                select: { id: true },
            });
            accessibleSalonIds = salons.map(({ id }) => id);
        }
        if (accessibleSalonIds && accessibleSalonIds.length === 0) {
            return { combos: [], meta: { total: 0, page: parseInt(page as string), pages: 0, limit: parseInt(limit as string) } };
        }
    } else {
        const hasPerm = await hasSalonPermission(salonId, userId, userRoles);
        if (!hasPerm) throw { status: 403, message: "Forbidden: Access denied" };
    }

    const where: any = {
        salonId: isAllSalons ? (accessibleSalonIds ? { in: accessibleSalonIds } : undefined) : salonId,
        items: {
            every: {
                service: {
                    isActive: true,
                    category: { isActive: true }
                }
            }
        }
    };

    if (search) {
        where.OR = [
            { name: { contains: search, mode: 'insensitive' } },
            { description: { contains: search, mode: 'insensitive' } },
        ];
    }

    const [total, combos] = await Promise.all([
        prisma.combo.count({ where }),
        prisma.combo.findMany({
            where,
            include: { items: { include: { service: { include: { images: true, category: true } } } } },
            orderBy: { createdAt: 'desc' },
            skip,
            take: parseInt(limit as string)
        })
    ]);

    return {
        combos,
        meta: {
            total,
            page: parseInt(page as string),
            pages: Math.ceil(total / parseInt(limit as string)),
            limit: parseInt(limit as string)
        }
    };
};
