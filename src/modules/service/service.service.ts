import { randomUUID } from "crypto";
import fs from "fs/promises";
import path from "path";
import sharp from "sharp";
import { prisma } from "../../infrastructure/database/prisma";
import { hasSalonPermission } from "../../common/utils/permission.util";
import { APP_CONSTANTS } from "../../common/constants/app.constants";
import { saveBase64Image } from "../../common/utils/file.util";

const isAdmin = (roles: string[]) => roles.includes(APP_CONSTANTS.ROLES.ADMIN) || roles.includes("SUPER_ADMIN");

const saveUploadedImage = async (file: Express.Multer.File, folder = "services") => {
    const safeFolder = folder.replace(/[^a-zA-Z0-9_-]/g, "") || "services";
    const filename = `${randomUUID()}.webp`;
    const directory = path.join(process.cwd(), "public", "uploads", safeFolder);
    await fs.mkdir(directory, { recursive: true });
    await sharp(file.buffer, { limitInputPixels: 40_000_000 })
        .rotate()
        .webp({ quality: 82, smartSubsample: true })
        .toFile(path.join(directory, filename));
    return `/public/uploads/${safeFolder}/${filename}`;
};

const removeUploadedImage = async (url?: string | null) => {
    if (!url?.startsWith("/public/uploads/services/")) return;
    const filename = path.basename(url);
    if (!filename || filename !== url.slice(url.lastIndexOf("/") + 1)) return;
    await fs.unlink(path.join(process.cwd(), "public", "uploads", "services", filename));
};

const resolveServiceLocation = async (
    salonId: string,
    userId: string,
    userRoles: string[],
    vendorId?: string,
    branchId?: string,
) => {
    const requestedSalon = await prisma.salon.findUnique({
        where: { id: salonId },
        select: { id: true, ownerId: true, parentId: true },
    });
    if (!requestedSalon) throw { status: 404, code: "SALON_NOT_FOUND", message: "Salon not found" };

    const rootSalonId = requestedSalon.parentId ?? requestedSalon.id;
    const rootSalon = requestedSalon.parentId
        ? await prisma.salon.findUnique({
            where: { id: rootSalonId },
            select: { id: true, ownerId: true },
        })
        : requestedSalon;
    if (!rootSalon) throw { status: 404, code: "SALON_NOT_FOUND", message: "Salon not found" };

    if (isAdmin(userRoles)) {
        if (vendorId) {
            const vendor = await prisma.user.findFirst({
                where: {
                    id: vendorId,
                    isActive: true,
                    roles: { some: { role: { name: APP_CONSTANTS.ROLES.VENDOR } } },
                },
                select: { id: true },
            });
            if (!vendor) throw { status: 400, code: "INVALID_VENDOR", message: "Select an active Vendor" };
            if (vendor.id !== rootSalon.ownerId) {
                throw { status: 400, code: "INVALID_VENDOR_SALON_RELATIONSHIP", message: "The selected Salon does not belong to the selected Vendor" };
            }
        }
    } else {
        if (vendorId && vendorId !== userId) {
            throw { status: 403, code: "VENDOR_ACCESS_DENIED", message: "You cannot create or move a service for another Vendor." };
        }
        const hasRootPermission = await hasSalonPermission(rootSalon.id, userId, userRoles);
        if (!hasRootPermission) throw { status: 403, code: "SALON_ACCESS_DENIED", message: "You do not have access to this salon." };
    }

    let locationId = requestedSalon.id;
    if (branchId) {
        const branch = await prisma.salon.findUnique({
            where: { id: branchId },
            select: { id: true, parentId: true },
        });
        if (!branch || branch.parentId !== rootSalon.id) {
            const vendorUser = userRoles.includes(APP_CONSTANTS.ROLES.VENDOR);
            throw {
                status: isAdmin(userRoles) || !vendorUser ? 400 : 403,
                code: isAdmin(userRoles) || !vendorUser ? "INVALID_SALON_BRANCH_RELATIONSHIP" : "BRANCH_ACCESS_DENIED",
                message: isAdmin(userRoles) || !vendorUser
                    ? "The selected Branch does not belong to the selected Salon"
                    : "You do not have access to this branch.",
            };
        }
        if (!isAdmin(userRoles) && !userRoles.includes(APP_CONSTANTS.ROLES.VENDOR)
            && !await hasSalonPermission(branch.id, userId, userRoles)) {
            throw { status: 403, code: "BRANCH_ACCESS_DENIED", message: "You do not have access to this branch." };
        }
        locationId = branch.id;
    }

    return locationId;
};

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

export const createServiceService = async (salonId: string, userId: string, userRoles: string[], payload: any, file?: Express.Multer.File) => {
    if (userRoles.includes(APP_CONSTANTS.ROLES.STAFF)) throw { status: 403, message: "Forbidden: Staff cannot modify services" };
    const targetSalonId = await resolveServiceLocation(salonId, userId, userRoles, payload.vendorId, payload.branchId);

    const { images = [], ...data } = payload;

    const processedImages = await Promise.all(images.map(async (img: any) => {
        if (img.startsWith('data:image')) {
            const url = await saveBase64Image(img, 'services');
            return { url };
        }
        return { url: img };
    }));
    if (file) processedImages.unshift({ url: await saveUploadedImage(file) });

    return prisma.service.create({
        data: {
            salonId: targetSalonId,
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

export const updateServiceService = async (serviceId: string, userId: string, userRoles: string[], payload: any, file?: Express.Multer.File) => {
    if (userRoles.includes(APP_CONSTANTS.ROLES.STAFF)) throw { status: 403, message: "Forbidden: Staff cannot modify services" };
    const service = await prisma.service.findUnique({ where: { id: serviceId } });
    if (!service) throw { status: 404, message: "Service not found" };

    const hasLocationChange = payload.salonId !== undefined || payload.branchId !== undefined || payload.vendorId !== undefined;
    if (hasLocationChange && !isAdmin(userRoles)) {
        throw { status: 403, code: "SALON_ACCESS_DENIED", message: "You cannot move a service to another salon or branch." };
    }
    const targetSalonId = hasLocationChange
        ? await resolveServiceLocation(payload.salonId ?? service.salonId, userId, userRoles, payload.vendorId, payload.branchId)
        : service.salonId;
    if (!hasLocationChange && !await hasSalonPermission(service.salonId, userId, userRoles)) {
        throw { status: 403, message: "Forbidden: Access denied" };
    }

    const { images = [], ...data } = payload;

    const processedImages = await Promise.all(images.map(async (img: any) => {
        if (img.startsWith('data:image')) {
            const url = await saveBase64Image(img, 'services');
            return { url };
        }
        return { url: img };
    }));
    if (file) processedImages.unshift({ url: await saveUploadedImage(file) });
    const previousImages = processedImages.length
        ? await prisma.serviceImage.findMany({ where: { serviceId }, select: { url: true } })
        : [];

    // Update service
    const updatedService = await prisma.$transaction(async (tx) => {
        if (processedImages.length > 0) {
            await tx.serviceImage.deleteMany({ where: { serviceId } });
            await tx.serviceImage.createMany({
                data: processedImages.slice(0, 3).map((img: { url: string }) => ({ ...img, serviceId }))
            });
        }

        return tx.service.update({
            where: { id: serviceId },
            data: {
                salonId: targetSalonId,
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
    if (processedImages.length > 0) {
        const replacementUrls = new Set(processedImages.slice(0, 3).map(({ url }) => url));
        await Promise.all(previousImages
            .filter(({ url }) => !replacementUrls.has(url))
            .map(({ url }) => removeUploadedImage(url)));
    }
    return updatedService;
};

export const deleteServiceService = async (serviceId: string, userId: string, userRoles: string[]) => {
    if (userRoles.includes(APP_CONSTANTS.ROLES.STAFF)) throw { status: 403, message: "Forbidden: Staff cannot modify services" };
    const service = await prisma.service.findUnique({ where: { id: serviceId }, select: { id: true, salonId: true } });
    if (!service) throw { status: 404, message: "Service not found" };
    if (!await hasSalonPermission(service.salonId, userId, userRoles)) {
        throw { status: 403, message: "Forbidden: Access denied" };
    }
    return prisma.service.update({
        where: { id: serviceId },
        data: { isActive: false, updatedById: userId },
    });
};

export const getServiceDetailsService = async (serviceId: string, userId: string, userRoles: string[]) => {
    const service = await prisma.service.findUnique({
        where: { id: serviceId },
        include: {
            images: true,
            category: true,
            salon: { include: { owner: { select: { id: true, firstName: true, lastName: true } } } },
        },
    });
    if (!service) throw { status: 404, message: "Service not found" };
    if (!await hasSalonPermission(service.salonId, userId, userRoles)) {
        throw { status: 403, message: "Forbidden: Access denied" };
    }
    return service;
};

export const listServiceLookupsService = async (
    type: "vendors" | "salons" | "branches",
    userId: string,
    userRoles: string[],
    query: { search?: string; vendorId?: string; salonId?: string; page: number; limit: number },
) => {
    const { page, limit, search } = query;
    const skip = (page - 1) * limit;
    const admin = isAdmin(userRoles);
    const vendorUser = userRoles.includes(APP_CONSTANTS.ROLES.VENDOR);

    if (type === "vendors" && !admin) {
        throw { status: 403, code: "SERVICE_LOOKUP_FORBIDDEN", message: "Only administrators can select a Vendor." };
    }
    if (type === "branches" && !query.salonId) {
        return { data: [], pagination: { page, limit, total: 0, totalPages: 0 } };
    }

    let where: any;
    let count: number;
    let rows: any[];
    if (type === "vendors") {
        where = {
            isActive: true,
            roles: { some: { role: { name: APP_CONSTANTS.ROLES.VENDOR } } },
            ownedSalons: { some: { parentId: null } },
            ...(search ? {
                OR: [
                    { firstName: { contains: search, mode: "insensitive" } },
                    { lastName: { contains: search, mode: "insensitive" } },
                    { email: { contains: search, mode: "insensitive" } },
                ],
            } : {}),
        };
        [count, rows] = await Promise.all([
            prisma.user.count({ where }),
            prisma.user.findMany({
                where, skip, take: limit, orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
                select: { id: true, firstName: true, lastName: true, email: true },
            }),
        ]);
        rows = rows.map((vendor) => ({ id: vendor.id, name: [vendor.firstName, vendor.lastName].filter(Boolean).join(" "), email: vendor.email }));
    } else if (type === "salons") {
        if (!admin && vendorUser && query.vendorId && query.vendorId !== userId) {
            throw { status: 403, code: "VENDOR_ACCESS_DENIED", message: "You cannot select another Vendor's Salon." };
        }
        where = {
            parentId: null,
            ...(admin
                ? query.vendorId ? { ownerId: query.vendorId } : {}
                : vendorUser
                    ? { ownerId: userId }
                    : { OR: [{ ownerId: userId }, { staff: { some: { userId, isActive: true } } }] }),
            ...(search ? { name: { contains: search, mode: "insensitive" } } : {}),
        };
        [count, rows] = await Promise.all([
            prisma.salon.count({ where }),
            prisma.salon.findMany({
                where, skip, take: limit, orderBy: { name: "asc" },
                select: { id: true, name: true, ownerId: true },
            }),
        ]);
        rows = rows.map(({ id, name, ownerId }) => ({ id, name, vendorId: ownerId }));
    } else {
        const salon = await prisma.salon.findUnique({
            where: { id: query.salonId! },
            select: { id: true, ownerId: true, parentId: true },
        });
        if (!salon) throw { status: 404, code: "SALON_NOT_FOUND", message: "Salon not found" };
        if (salon.parentId || !admin && !await hasSalonPermission(salon.id, userId, userRoles)) {
            throw { status: 403, code: "BRANCH_ACCESS_DENIED", message: "You do not have access to this salon." };
        }
        if (admin && query.vendorId && query.vendorId !== salon.ownerId) {
            throw { status: 400, code: "INVALID_VENDOR_SALON_RELATIONSHIP", message: "The selected Salon does not belong to the selected Vendor" };
        }
        where = {
            parentId: salon.id,
            ...(!admin && !vendorUser && salon.ownerId !== userId
                ? { staff: { some: { userId, isActive: true } } }
                : {}),
            ...(search ? { name: { contains: search, mode: "insensitive" } } : {}),
        };
        [count, rows] = await Promise.all([
            prisma.salon.count({ where }),
            prisma.salon.findMany({
                where, skip, take: limit, orderBy: { name: "asc" },
                select: { id: true, name: true, parentId: true },
            }),
        ]);
        rows = rows.map(({ id, name, parentId }) => ({ id, name, salonId: parentId }));
    }

    const pagination = { page, limit, total: count, totalPages: Math.ceil(count / limit) };
    return { data: rows, pagination };
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

export const createComboService = async (salonId: string, userId: string, userRoles: string[], payload: any, file?: Express.Multer.File) => {
    if (userRoles.includes(APP_CONSTANTS.ROLES.STAFF)) throw { status: 403, message: "Forbidden: Staff cannot modify services" };
    const targetSalonId = await resolveServiceLocation(salonId, userId, userRoles, payload.vendorId, payload.branchId);

    const { serviceIds = [], ...data } = payload;

    let imageUrl = data.imageUrl;
    if (imageUrl && imageUrl.startsWith('data:image')) {
        imageUrl = await saveBase64Image(imageUrl, 'combos');
    }
    if (file) imageUrl = await saveUploadedImage(file);

    return prisma.combo.create({
        data: {
            salonId: targetSalonId,
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

export const updateComboService = async (comboId: string, userId: string, userRoles: string[], payload: any, file?: Express.Multer.File) => {
    if (userRoles.includes(APP_CONSTANTS.ROLES.STAFF)) throw { status: 403, message: "Forbidden: Staff cannot modify services" };
    const combo = await prisma.combo.findUnique({ where: { id: comboId } });
    if (!combo) throw { status: 404, message: "Combo not found" };

    const hasLocationChange = payload.salonId !== undefined || payload.branchId !== undefined || payload.vendorId !== undefined;
    if (hasLocationChange && !isAdmin(userRoles)) {
        throw { status: 403, code: "SALON_ACCESS_DENIED", message: "You cannot move a combo to another salon or branch." };
    }
    const targetSalonId = hasLocationChange
        ? await resolveServiceLocation(payload.salonId ?? combo.salonId, userId, userRoles, payload.vendorId, payload.branchId)
        : combo.salonId;
    if (!hasLocationChange && !await hasSalonPermission(combo.salonId, userId, userRoles)) {
        throw { status: 403, message: "Forbidden: Access denied" };
    }

    const { serviceIds, ...data } = payload;

    let imageUrl = data.imageUrl;
    if (imageUrl && imageUrl.startsWith('data:image')) {
        imageUrl = await saveBase64Image(imageUrl, 'combos');
    }
    if (file) imageUrl = await saveUploadedImage(file);

    const updatedCombo = await prisma.$transaction(async (tx) => {
        if (serviceIds) {
            await tx.comboItem.deleteMany({ where: { comboId } });
            await tx.comboItem.createMany({
                data: serviceIds.map((sId: string) => ({ comboId, serviceId: sId }))
            });
        }

        return tx.combo.update({
            where: { id: comboId },
            data: {
                salonId: targetSalonId,
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
    if (file && combo.imageUrl && combo.imageUrl !== imageUrl) await removeUploadedImage(combo.imageUrl);
    return updatedCombo;
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
