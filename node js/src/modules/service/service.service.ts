import crypto from "crypto";
import fs from "fs/promises";
import path from "path";
import { Prisma } from "@prisma/client";
import { prisma } from "../../infrastructure/database/prisma";
import { saveBase64Image } from "../../common/utils/file.util";
import { hasSalonPermission } from "../../common/utils/permission.util";
import { APP_CONSTANTS } from "../../common/constants/app.constants";
import logger from "../../infrastructure/logger/logger";
import sharp from "sharp";

const isStaffOnly = (roles: string[]) =>
    roles.includes(APP_CONSTANTS.ROLES.STAFF) &&
    !roles.includes(APP_CONSTANTS.ROLES.VENDOR) &&
    !roles.includes(APP_CONSTANTS.ROLES.ADMIN) &&
    !roles.includes("SUPER_ADMIN");

const isAdmin = (roles: string[]) =>
    roles.includes(APP_CONSTANTS.ROLES.ADMIN) || roles.includes("SUPER_ADMIN");

const serviceImageDirectory = path.join(process.cwd(), "public", "uploads", "services");
const serviceImageMimeFormats: Record<string, string> = {
    "image/jpeg": "jpeg",
    "image/png": "png",
    "image/webp": "webp",
    "image/gif": "gif",
};

async function storeServiceImage(buffer: Buffer, declaredMimeType?: string) {
    const allowedFormat = declaredMimeType ? serviceImageMimeFormats[declaredMimeType] : undefined;
    if (!allowedFormat || buffer.length === 0 || buffer.length > 10 * 1024 * 1024) {
        throw { status: 400, code: "INVALID_SERVICE_IMAGE", message: "Service images must be valid JPEG, PNG, WEBP, or GIF files up to 10 MB" };
    }
    const image = sharp(buffer, { limitInputPixels: 40_000_000 });
    let metadata: Awaited<ReturnType<typeof image.metadata>>;
    try {
        metadata = await image.metadata();
    } catch {
        throw { status: 400, code: "INVALID_SERVICE_IMAGE", message: "The uploaded service image is invalid" };
    }
    if (metadata.format !== allowedFormat || !metadata.width || !metadata.height) {
        throw { status: 400, code: "INVALID_SERVICE_IMAGE", message: "The uploaded image content does not match its image type" };
    }
    let optimized: Buffer;
    try {
        optimized = await image.rotate().webp({ quality: 85 }).toBuffer();
    } catch {
        throw { status: 400, code: "INVALID_SERVICE_IMAGE", message: "The uploaded service image is invalid" };
    }
    await fs.mkdir(serviceImageDirectory, { recursive: true });
    const fileName = `${crypto.randomUUID()}.webp`;
    const filePath = path.join(serviceImageDirectory, fileName);
    await fs.writeFile(filePath, optimized, { flag: "wx" });
    return { url: `/public/uploads/services/${fileName}`, filePath };
}

async function resolveServiceLocation(input: {
    salonId: string;
    branchId?: string;
    vendorId?: string;
    userId: string;
    userRoles: string[];
    allowSalonMembership?: boolean;
}) {
    const admin = isAdmin(input.userRoles);
    if (isStaffOnly(input.userRoles)) throw { status: 403, message: "Forbidden: Staff cannot modify services" };
    const vendorUser = input.userRoles.includes(APP_CONSTANTS.ROLES.VENDOR);
    if (!admin && !vendorUser && !input.allowSalonMembership) {
        throw { status: 403, message: "Forbidden: Access denied" };
    }
    if (vendorUser && input.vendorId && input.vendorId !== input.userId) {
        throw { status: 403, code: "SERVICE_VENDOR_SCOPE_DENIED", message: "Vendors can only create or manage services under their own account" };
    }

    const selectedSalon = await prisma.salon.findUnique({
        where: { id: input.salonId },
        select: {
            id: true,
            ownerId: true,
            parentId: true,
            isActive: true,
            owner: {
                select: {
                    isActive: true,
                    roles: { select: { role: { select: { name: true } } } },
                },
            },
        },
    });
    if (!selectedSalon) throw { status: 404, code: "SERVICE_SALON_NOT_FOUND", message: "Salon not found" };

    const rootSalonId = selectedSalon.parentId ?? selectedSalon.id;
    const rootSalon = selectedSalon.parentId
        ? await prisma.salon.findUnique({
            where: { id: selectedSalon.parentId },
            select: {
                id: true,
                ownerId: true,
                isActive: true,
                owner: {
                    select: {
                        isActive: true,
                        roles: { select: { role: { select: { name: true } } } },
                    },
                },
            },
        })
        : selectedSalon;
    if (!rootSalon || !rootSalon.isActive || !rootSalon.owner.isActive
        || !rootSalon.owner.roles.some(({ role }) => role.name === APP_CONSTANTS.ROLES.VENDOR)) {
        throw { status: 400, code: "INVALID_SERVICE_VENDOR", message: "An active Vendor-owned salon is required" };
    }
    if (input.vendorId && input.vendorId !== rootSalon.ownerId) {
        throw {
            status: admin ? 400 : 403,
            code: admin ? "SERVICE_VENDOR_SALON_MISMATCH" : "SALON_ACCESS_DENIED",
            message: admin ? "The selected salon does not belong to the selected Vendor" : "You do not have access to this salon.",
        };
    }
    if (!selectedSalon.isActive) throw { status: 400, code: "INACTIVE_SERVICE_SALON", message: "The selected salon is inactive" };
    if (vendorUser && !admin && rootSalon.ownerId !== input.userId) {
        throw { status: 403, code: "SALON_ACCESS_DENIED", message: "You do not have access to this salon." };
    }

    let targetSalonId = selectedSalon.id;
    if (input.branchId) {
        const branch = await prisma.salon.findUnique({
            where: { id: input.branchId },
            select: { id: true, parentId: true, isActive: true },
        });
        if (!branch || !branch.parentId) {
            throw { status: 400, code: "INVALID_SERVICE_BRANCH", message: "The selected Branch does not exist" };
        }
        if (branch.parentId !== rootSalonId) {
            throw {
                status: admin ? 400 : 403,
                code: admin ? "SERVICE_BRANCH_SALON_MISMATCH" : "BRANCH_ACCESS_DENIED",
                message: admin ? "The selected Branch does not belong to the selected Salon" : "You do not have access to this branch.",
            };
        }
        if (!branch.isActive) throw { status: 400, code: "INACTIVE_SERVICE_BRANCH", message: "The selected Branch is inactive" };
        targetSalonId = branch.id;
    }

    if (!admin) {
        const hasPermission = await hasSalonPermission(targetSalonId, input.userId, input.userRoles);
        if (!hasPermission || (vendorUser && rootSalon.ownerId !== input.userId)) {
            throw { status: 403, code: "SERVICE_SCOPE_DENIED", message: "The selected service location is outside your authorized scope" };
        }
    }
    return { salonId: targetSalonId, vendorId: rootSalon.ownerId, rootSalonId };
}

async function resolveCreateServiceLocation(
    salonId: string,
    payload: { salonId?: string; branchId?: string; vendorId?: string },
    userId: string,
    userRoles: string[],
) {
    if (payload.salonId && payload.salonId !== salonId) {
        throw { status: 400, code: "SERVICE_SALON_MISMATCH", message: "salonId must match the selected salon" };
    }
    return resolveServiceLocation({
        salonId,
        branchId: payload.branchId,
        vendorId: payload.vendorId,
        userId,
        userRoles,
    });
}

async function processServiceImages(images: string[], uploadedImage?: Express.Multer.File) {
    const processed: Array<{ url: string; filePath?: string }> = [];
    try {
        if (uploadedImage) processed.push(await storeServiceImage(uploadedImage.buffer, uploadedImage.mimetype));
        for (const image of images.slice(0, 3 - processed.length)) {
            if (image.startsWith("data:image/")) {
                const match = image.match(/^data:(image\/(?:jpeg|png|webp|gif));base64,([A-Za-z0-9+/=]+)$/);
                if (!match) throw { status: 400, code: "INVALID_SERVICE_IMAGE", message: "Service image data is invalid" };
                processed.push(await storeServiceImage(Buffer.from(match[2], "base64"), match[1]));
            } else {
                processed.push({ url: image });
            }

        }
        return processed;
    } catch (error) {
        await Promise.all(processed.flatMap(({ filePath }) => filePath ? [fs.unlink(filePath).catch(() => undefined)] : []));
        throw error;
    }
}

async function removeReplacedServiceImages(urls: string[]) {
    const prefix = "/public/uploads/services/";
    await Promise.all(urls.filter((url) => url.startsWith(prefix)).map(async (url) => {
        const fileName = path.basename(url);
        if (fileName !== url.slice(prefix.length)) return;
        try {
            await fs.unlink(path.join(serviceImageDirectory, fileName));
        } catch (error) {
            if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
                logger.warn("service_image_cleanup_failed", { fileName });
            }
        }
    }));
}

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

export const createServiceService = async (
    salonId: string,
    userId: string,
    userRoles: string[],
    payload: any,
    uploadedImage?: Express.Multer.File,
) => {
    const location = await resolveCreateServiceLocation(salonId, payload, userId, userRoles);
    const { images = [], ...data } = payload;
    const category = await prisma.serviceCategory.findUnique({ where: { id: data.categoryId }, select: { id: true, isActive: true } });
    if (!category?.isActive) throw { status: 400, code: "INVALID_SERVICE_CATEGORY", message: "An active service category is required" };
    const processedImages = await processServiceImages(images, uploadedImage);
    try {
        return await prisma.service.create({
            data: {
                salonId: location.salonId,
                name: data.name,
                description: data.description,
                categoryId: data.categoryId,
                basePrice: parseFloat(data.basePrice),
                baseDuration: parseInt(data.baseDuration),
                isActive: data.isActive ?? true,
                createdById: userId,
                images: {
                    create: processedImages.map(({ url }) => ({ url })),
                },
            },
            include: { images: true, category: true, salon: { select: { id: true, name: true, parentId: true, ownerId: true } } },
        });
    } catch (error) {
        await Promise.all(processedImages.flatMap(({ filePath }) => filePath ? [fs.unlink(filePath).catch(() => undefined)] : []));
        throw error;
    }
};

export const updateServiceService = async (
    serviceId: string,
    userId: string,
    userRoles: string[],
    payload: any,
    uploadedImage?: Express.Multer.File,
) => {
    if (isStaffOnly(userRoles)) throw { status: 403, message: "Forbidden: Staff cannot modify services" };
    const service = await prisma.service.findUnique({ where: { id: serviceId }, include: { images: true } });
    if (!service) throw { status: 404, message: "Service not found" };
    const currentSalon = await prisma.salon.findUnique({ where: { id: service.salonId }, select: { id: true, parentId: true } });
    if (!currentSalon) throw { status: 404, message: "Service salon not found" };
    const { images = [], ...data } = payload;
    const mainSalonId = data.salonId ?? currentSalon.parentId ?? currentSalon.id;
    const targetLocation = await resolveServiceLocation({
        salonId: mainSalonId,
        branchId: data.branchId ?? (data.salonId ? undefined : currentSalon.parentId ? service.salonId : undefined),
        vendorId: data.vendorId,
        userId,
        userRoles,
    });
    if (data.categoryId) {
        const category = await prisma.serviceCategory.findUnique({ where: { id: data.categoryId }, select: { id: true, isActive: true } });
        if (!category?.isActive) throw { status: 400, code: "INVALID_SERVICE_CATEGORY", message: "An active service category is required" };
    }
    const replaceImages = Object.prototype.hasOwnProperty.call(payload, "images") || Boolean(uploadedImage);
    const processedImages = replaceImages
        ? await processServiceImages(images, uploadedImage)
        : [];
    try {
        const updatedService = await prisma.$transaction(async (tx) => {
            if (replaceImages) {
                await tx.serviceImage.deleteMany({ where: { serviceId } });
                if (processedImages.length > 0) {
                    await tx.serviceImage.createMany({
                        data: processedImages.map(({ url }) => ({ url, serviceId })),
                    });
                }
            }
            return tx.service.update({
                where: { id: serviceId },
                data: {
                    salonId: targetLocation.salonId,
                    name: data.name,
                    description: data.description,
                    categoryId: data.categoryId,
                    basePrice: data.basePrice !== undefined ? parseFloat(data.basePrice) : undefined,
                    baseDuration: data.baseDuration !== undefined ? parseInt(data.baseDuration) : undefined,
                    isActive: data.isActive,
                    updatedById: userId,
                },
                include: { images: true, category: true, salon: { select: { id: true, name: true, parentId: true, ownerId: true } } },
            });
        });
        if (replaceImages) {
            await removeReplacedServiceImages(service.images.map(({ url }) => url));
        }
        return updatedService;
    } catch (error) {
        await Promise.all(processedImages.flatMap(({ filePath }) => filePath ? [fs.unlink(filePath).catch(() => undefined)] : []));
        throw error;
    }
};

export const deleteServiceService = async (serviceId: string, userId: string, userRoles: string[]) => {
    if (isStaffOnly(userRoles)) throw { status: 403, message: "Forbidden: Staff cannot modify services" };
    const service = await prisma.service.findUnique({ where: { id: serviceId }, select: { id: true, salonId: true } });
    if (!service) throw { status: 404, message: "Service not found" };

    const hasPerm = await hasSalonPermission(service.salonId, userId, userRoles);
    if (!hasPerm) throw { status: 403, message: "Forbidden: Access denied" };

    return prisma.service.update({
        where: { id: serviceId },
        data: { isActive: false, updatedById: userId },
        include: { images: true, category: true }
    });
};

export const getSalonServicesService = async (salonId: string, userId: string, userRoles: string[], query: any = {}) => {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 10));
    const skip = (page - 1) * limit;
    const search = query.search ? String(query.search).trim() : "";
    const isAdmin = userRoles.includes(APP_CONSTANTS.ROLES.ADMIN) || userRoles.includes("SUPER_ADMIN");
    const requestedVendorId = query.vendorId ? String(query.vendorId).trim() : undefined;
    const requestedSalonId = salonId && salonId !== "all" ? salonId : (query.salonId ? String(query.salonId).trim() : undefined);
    const requestedBranchId = query.branchId ? String(query.branchId).trim() : undefined;

    // 1. Fetch & Validate Requested Entities
    const branch = requestedBranchId
        ? await prisma.salon.findUnique({
            where: { id: requestedBranchId },
            include: { parent: true, address: true }
        })
        : null;
    if (requestedBranchId && !branch) throw { status: 404, message: "Branch not found" };
    if (requestedBranchId && branch && (!branch.parentId || !branch.isActive)) {
        throw { status: 400, message: "branchId must identify an active branch" };
    }

    const requestedSalon = requestedSalonId
        ? await prisma.salon.findUnique({
            where: { id: requestedSalonId },
            include: { parent: true, branches: true, address: true }
        })
        : null;
    if (requestedSalonId && !requestedSalon) throw { status: 404, message: "Salon not found" };

    const vendor = requestedVendorId
        ? await prisma.user.findUnique({
            where: { id: requestedVendorId }
        })
        : null;
    if (requestedVendorId && !vendor) throw { status: 404, message: "Vendor not found" };

    // 2. Validate Combinations
    if (branch && requestedSalon) {
        if (branch.parentId !== (requestedSalon.parentId ?? requestedSalon.id) && branch.id !== requestedSalon.id) {
            throw { status: 400, message: "branchId does not belong to salonId" };
        }
    }

    if (requestedSalon && requestedVendorId) {
        const salonBelongs = requestedSalon.ownerId === requestedVendorId || (requestedSalon.parent && requestedSalon.parent.ownerId === requestedVendorId);
        if (!salonBelongs) {
            throw { status: 400, message: "salonId/branchId does not belong to vendorId" };
        }
    }

    if (branch && requestedVendorId) {
        const branchBelongs = branch.ownerId === requestedVendorId || (branch.parent && branch.parent.ownerId === requestedVendorId);
        if (!branchBelongs) {
            throw { status: 400, message: "salonId/branchId does not belong to vendorId" };
        }
    }

    // 3. RBAC & Access Control
    let accessibleSalonIds: string[] | undefined;
    if (!isAdmin) {
        if (isStaffOnly(userRoles)) {
            const memberships = await prisma.salonStaff.findMany({
                where: { userId, isActive: true },
                select: { salonId: true }
            });
            const allowedSalonIds = memberships.map(m => m.salonId);
            if (requestedSalonId && !allowedSalonIds.includes(requestedSalonId)) {
                throw { status: 403, message: "Forbidden: Access denied" };
            }
            if (requestedBranchId && !allowedSalonIds.includes(requestedBranchId)) {
                throw { status: 403, message: "Forbidden: Access denied" };
            }
            accessibleSalonIds = allowedSalonIds;
            if (!accessibleSalonIds.length) return { services: [], meta: { total: 0, page, pages: 0, limit } };
        } else if (userRoles.includes(APP_CONSTANTS.ROLES.VENDOR)) {
            if (requestedVendorId && requestedVendorId !== userId) {
                throw { status: 403, message: "Forbidden: Access denied" };
            }

            const ownedSalons = await prisma.salon.findMany({
                where: { ownerId: userId },
                select: { id: true, parentId: true }
            });
            const ownedMainIds = ownedSalons.filter(s => !s.parentId).map(s => s.id);
            const childBranches = ownedMainIds.length > 0
                ? await prisma.salon.findMany({
                    where: { parentId: { in: ownedMainIds } },
                    select: { id: true }
                })
                : [];
            const branchParentIds = ownedSalons.filter(s => s.parentId).map(s => s.parentId as string);

            const vendorSalonIds = new Set([
                ...ownedSalons.map(s => s.id),
                ...childBranches.map(s => s.id),
                ...branchParentIds
            ]);

            if (requestedSalonId && !vendorSalonIds.has(requestedSalonId)) {
                throw { status: 403, message: "Forbidden: Access denied" };
            }
            if (requestedBranchId && !vendorSalonIds.has(requestedBranchId)) {
                throw { status: 403, message: "Forbidden: Access denied" };
            }

            accessibleSalonIds = Array.from(vendorSalonIds);
            if (!accessibleSalonIds.length) return { services: [], meta: { total: 0, page, pages: 0, limit } };
        } else {
            throw { status: 403, message: "Forbidden: Access denied" };
        }
    }

    // 4. Determine Target Salon IDs (Direct vs Inheritance)
    let targetSalonIds: string[] | undefined;
    const targetBranch = branch ?? (requestedSalon && requestedSalon.parentId ? requestedSalon : null);

    if (targetBranch) {
        // Branch query: direct services if present, else inherit from parent
        const directCount = await prisma.service.count({
            where: { salonId: targetBranch.id }
        });
        if (directCount > 0) {
            targetSalonIds = [targetBranch.id];
        } else {
            targetSalonIds = [targetBranch.parentId!];
        }
    } else if (requestedSalon) {
        // Main Salon query: salon + child branches
        const childBranches = await prisma.salon.findMany({
            where: { parentId: requestedSalon.id },
            select: { id: true }
        });
        targetSalonIds = [requestedSalon.id, ...childBranches.map(b => b.id)];
    } else {
        // Vendor or All query
        const targetVendorId = requestedVendorId || (!isAdmin && userRoles.includes(APP_CONSTANTS.ROLES.VENDOR) ? userId : undefined);
        if (targetVendorId) {
            const vendorSalons = await prisma.salon.findMany({
                where: { ownerId: targetVendorId },
                include: { branches: { select: { id: true } } }
            });
            const vendorNetworkIds = new Set<string>();
            for (const s of vendorSalons) {
                if (!s.parentId) {
                    vendorNetworkIds.add(s.id);
                    for (const b of s.branches) {
                        vendorNetworkIds.add(b.id);
                    }
                } else {
                    const direct = await prisma.service.count({ where: { salonId: s.id } });
                    if (direct > 0) {
                        vendorNetworkIds.add(s.id);
                    } else {
                        vendorNetworkIds.add(s.parentId);
                    }
                }
            }
            targetSalonIds = Array.from(vendorNetworkIds);
        } else if (accessibleSalonIds) {
            const resolvedSalonIds = new Set<string>();
            for (const sId of accessibleSalonIds) {
                const sRec = await prisma.salon.findUnique({ where: { id: sId }, select: { id: true, parentId: true } });
                if (sRec?.parentId) {
                    const direct = await prisma.service.count({ where: { salonId: sRec.id } });
                    resolvedSalonIds.add(direct > 0 ? sRec.id : sRec.parentId);
                } else if (sRec) {
                    resolvedSalonIds.add(sRec.id);
                }
            }
            targetSalonIds = Array.from(resolvedSalonIds);
        }
    }

    if (targetSalonIds && targetSalonIds.length === 0) {
        return { services: [], meta: { total: 0, page, pages: 0, limit } };
    }

    // 5. Construct Where Query
    const where: any = {
        ...(targetSalonIds ? { salonId: { in: targetSalonIds } } : {})
    };

    if (query.categoryId) {
        where.categoryId = String(query.categoryId).trim();
    }

    if (query.status !== undefined) {
        const statusStr = String(query.status).trim().toLowerCase();
        if (statusStr === "active" || statusStr === "true") {
            where.isActive = true;
        } else if (statusStr === "inactive" || statusStr === "false") {
            where.isActive = false;
        } else {
            throw { status: 400, message: "status must be active or inactive" };
        }
    } else {
        // The booking client uses this endpoint. A service is bookable only
        // while active; management clients can explicitly request inactive.
        where.isActive = true;
    }

    if (query.city) {
        where.salon = {
            ...where.salon,
            address: {
                ...(where.salon?.address || {}),
                city: { equals: String(query.city).trim(), mode: 'insensitive' }
            }
        };
    }

    if (query.country) {
        where.salon = {
            ...where.salon,
            address: {
                ...(where.salon?.address || {}),
                country: { equals: String(query.country).trim(), mode: 'insensitive' }
            }
        };
    }

    const andConditions: any[] = [];
    if (search) {
        andConditions.push({
            OR: [
                { name: { contains: search, mode: 'insensitive' } },
                { description: { contains: search, mode: 'insensitive' } },
            ]
        });
    }

    if (!query.categoryId) {
        andConditions.push({
            OR: [
                { categoryId: null },
                { category: { isActive: true } }
            ]
        });
    }

    if (andConditions.length > 0) {
        where.AND = andConditions;
    }

    const [total, services] = await Promise.all([
        prisma.service.count({ where }),
        prisma.service.findMany({
            where,
            include: {
                images: true,
                category: true,
                salon: {
                    select: {
                        id: true,
                        name: true,
                        ownerId: true,
                        parentId: true,
                        parent: {
                            select: {
                                id: true,
                                name: true,
                                owner: { select: { id: true, firstName: true, lastName: true } },
                            },
                        },
                        address: { select: { city: true, state: true, country: true } },
                        owner: { select: { id: true, firstName: true, lastName: true, email: true } },
                    }
                }
            },
            orderBy: { createdAt: 'desc' },
            skip,
            take: limit
        })
    ]);

    return {
        services,
        meta: {
            total,
            page,
            pages: Math.ceil(total / limit),
            limit
        }
    };
};

export const getServiceDetailsService = async (serviceId: string, userId: string, userRoles: string[]) => {
    const service = await prisma.service.findUnique({
        where: { id: serviceId },
        include: {
            images: true,
            category: true,
            salon: {
                include: {
                parent: {
                    select: {
                        id: true,
                        name: true,
                        ownerId: true,
                        owner: { select: { id: true, firstName: true, lastName: true } },
                    },
                },
                    owner: { select: { id: true, firstName: true, lastName: true, isActive: true } },
                    address: { select: { city: true, state: true, country: true } },
                },
            },
        },
    });
    if (!service) throw { status: 404, code: "SERVICE_NOT_FOUND", message: "Service not found" };
    if (!isAdmin(userRoles)) {
        const hasPermission = await hasSalonPermission(service.salonId, userId, userRoles);
        const ownerId = service.salon.parent?.ownerId ?? service.salon.ownerId;
        if (!hasPermission || (userRoles.includes(APP_CONSTANTS.ROLES.VENDOR) && ownerId !== userId)) {
            throw { status: 403, code: "SERVICE_SCOPE_DENIED", message: "Access to this service is denied" };
        }
    }
    return service;
};

export const listServiceLookupsService = async (
    type: "vendors" | "salons" | "branches",
    userId: string,
    userRoles: string[],
    query: { search?: string; vendorId?: string; salonId?: string; page: number; limit: number },
) => {
    const admin = isAdmin(userRoles);
    const skip = (query.page - 1) * query.limit;
    const search = query.search?.trim();
    if (type === "vendors") {
        if (!admin) throw { status: 403, code: "SERVICE_LOOKUP_FORBIDDEN", message: "Only administrators can select a Vendor" };
        const where: Prisma.UserWhereInput = {
            isActive: true,
            roles: { some: { role: { name: APP_CONSTANTS.ROLES.VENDOR } } },
            ...(search ? {
                OR: [
                    { firstName: { contains: search, mode: "insensitive" } },
                    { lastName: { contains: search, mode: "insensitive" } },
                    { email: { contains: search, mode: "insensitive" } },
                ],
            } : {}),
        };
        const [rows, total] = await Promise.all([
            prisma.user.findMany({
                where,
                select: { id: true, firstName: true, lastName: true, email: true },
                orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
                skip,
                take: query.limit,
            }),
            prisma.user.count({ where }),
        ]);
        return {
            data: rows.map(({ id, firstName, lastName, email }) => ({ id, name: `${firstName} ${lastName ?? ""}`.trim(), email })),
            pagination: { page: query.page, limit: query.limit, total, totalPages: Math.ceil(total / query.limit) },
        };
    }

    if (!admin && !userRoles.includes(APP_CONSTANTS.ROLES.VENDOR)) {
        throw { status: 403, code: "SERVICE_LOOKUP_FORBIDDEN", message: "Access to service scope lookups is denied" };
    }
    if (!admin && query.vendorId && query.vendorId !== userId) {
        throw { status: 403, code: "SERVICE_VENDOR_SCOPE_DENIED", message: "Vendors can only select their own salons and branches" };
    }

    if (type === "salons") {
        const vendorId = admin ? query.vendorId : userId;
        if (admin && !vendorId) {
            throw { status: 400, code: "SERVICE_VENDOR_REQUIRED", message: "Select a Vendor before loading salons" };
        }
        const where: Prisma.SalonWhereInput = {
            parentId: null,
            isActive: true,
            ownerId: vendorId,
            owner: { isActive: true, roles: { some: { role: { name: APP_CONSTANTS.ROLES.VENDOR } } } },
            ...(search ? { name: { contains: search, mode: "insensitive" } } : {}),
        };
        const [rows, total] = await Promise.all([
            prisma.salon.findMany({ where, select: { id: true, name: true }, orderBy: { name: "asc" }, skip, take: query.limit }),
            prisma.salon.count({ where }),
        ]);
        return {
            data: rows.map(({ id, name }) => ({ id, name, label: name })),
            pagination: { page: query.page, limit: query.limit, total, totalPages: Math.ceil(total / query.limit) },
        };
    }

    if (!query.salonId) throw { status: 400, code: "SERVICE_SALON_REQUIRED", message: "Select a Salon before loading branches" };
    const salon = await prisma.salon.findUnique({
        where: { id: query.salonId },
        select: { id: true, ownerId: true, parentId: true, isActive: true },
    });
    if (!salon || salon.parentId || !salon.isActive) {
        throw { status: 400, code: "INVALID_SERVICE_SALON", message: "Select an active main Salon before loading branches" };
    }
    if ((!admin && salon.ownerId !== userId) || (query.vendorId && query.vendorId !== salon.ownerId)) {
        throw { status: 403, code: "SERVICE_SALON_SCOPE_DENIED", message: "The selected Salon is outside the authorized Vendor scope" };
    }
    const where: Prisma.SalonWhereInput = {
        parentId: salon.id,
        isActive: true,
        ...(search ? { name: { contains: search, mode: "insensitive" } } : {}),
    };
    const [rows, total] = await Promise.all([
        prisma.salon.findMany({ where, select: { id: true, name: true }, orderBy: { name: "asc" }, skip, take: query.limit }),
        prisma.salon.count({ where }),
    ]);
    return {
        data: rows.map(({ id, name }) => ({ id, name, label: name })),
        pagination: { page: query.page, limit: query.limit, total, totalPages: Math.ceil(total / query.limit) },
    };
};

// --- Combos ---

export const createComboService = async (
    salonId: string,
    userId: string,
    userRoles: string[],
    payload: any,
    uploadedImage?: Express.Multer.File,
) => {
    const location = await resolveServiceLocation({
        salonId,
        branchId: payload.branchId,
        vendorId: payload.vendorId,
        userId,
        userRoles,
        allowSalonMembership: true,
    });
    if (payload.salonId && payload.salonId !== salonId) {
        throw { status: 400, code: "SERVICE_SALON_MISMATCH", message: "salonId must match the selected salon" };
    }

    const { serviceIds = [], vendorId: _vendorId, branchId: _branchId, salonId: _salonId, ...data } = payload;

    let imageUrl = data.imageUrl;
    const storedImage = uploadedImage
        ? await storeServiceImage(uploadedImage.buffer, uploadedImage.mimetype)
        : undefined;
    if (storedImage) imageUrl = storedImage.url;
    else if (imageUrl && imageUrl.startsWith("data:image")) imageUrl = await saveBase64Image(imageUrl, "combos");

    try {
        return await prisma.combo.create({
            data: {
                salonId: location.salonId,
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
            include: {
                items: { include: { service: { include: { images: true } } } },
                salon: {
                    select: {
                        id: true,
                        name: true,
                        parentId: true,
                        owner: { select: { id: true, firstName: true, lastName: true } },
                        parent: { select: { id: true, name: true } },
                    },
                },
            }
        });
    } catch (error) {
        if (storedImage) await fs.unlink(storedImage.filePath).catch(() => undefined);
        throw error;
    }
};

export const updateComboService = async (
    comboId: string,
    userId: string,
    userRoles: string[],
    payload: any,
    uploadedImage?: Express.Multer.File,
) => {
    if (isStaffOnly(userRoles)) throw { status: 403, message: "Forbidden: Staff cannot modify services" };
    const combo = await prisma.combo.findUnique({
        where: { id: comboId },
        include: { salon: { select: { id: true, parentId: true } } },
    });
    if (!combo) throw { status: 404, message: "Combo not found" };
    const { serviceIds, ...data } = payload;

    const selectedSalonId = data.salonId ?? combo.salon.parentId ?? combo.salonId;
    const selectedBranchId = data.branchId
        ?? (data.salonId !== undefined ? undefined : combo.salon.parentId ? combo.salonId : undefined);
    const targetLocation = await resolveServiceLocation({
        salonId: selectedSalonId,
        branchId: selectedBranchId,
        vendorId: data.vendorId,
        userId,
        userRoles,
        allowSalonMembership: true,
    });

    const { vendorId: _vendorId, branchId: _branchId, salonId: _salonId, ...updateData } = data;

    let imageUrl = updateData.imageUrl;
    const storedImage = uploadedImage
        ? await storeServiceImage(uploadedImage.buffer, uploadedImage.mimetype)
        : undefined;
    if (storedImage) imageUrl = storedImage.url;
    else if (imageUrl && imageUrl.startsWith("data:image")) imageUrl = await saveBase64Image(imageUrl, "combos");

    try {
        return await prisma.$transaction(async (tx) => {
            if (serviceIds) {
                await tx.comboItem.deleteMany({ where: { comboId } });
                await tx.comboItem.createMany({
                    data: serviceIds.map((sId: string) => ({ comboId, serviceId: sId }))
                });
            }

            return tx.combo.update({
                where: { id: comboId },
                data: {
                    salonId: targetLocation.salonId,
                    name: updateData.name,
                    description: updateData.description,
                    price: updateData.price !== undefined ? parseFloat(updateData.price) : undefined,
                    duration: updateData.duration !== undefined ? parseInt(updateData.duration) : undefined,
                    isActive: updateData.isActive,
                    imageUrl
                },
                include: {
                    items: { include: { service: true } },
                    salon: {
                        select: {
                            id: true,
                            name: true,
                            parentId: true,
                            owner: { select: { id: true, firstName: true, lastName: true } },
                            parent: { select: { id: true, name: true } },
                        },
                    },
                }
            });
        });
    } catch (error) {
        if (storedImage) await fs.unlink(storedImage.filePath).catch(() => undefined);
        throw error;
    }
};

export const getCombosBySalonService = async (salonId: string, userId: string, userRoles: string[], query: any = {}) => {
    const { page = 1, limit = 10, search = '' } = query;
    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

    const isAllSalons = salonId === "all";
    let accessibleSalonIds: string[] | undefined;
    if (isAllSalons) {
        if (userRoles.includes(APP_CONSTANTS.ROLES.ADMIN) || userRoles.includes("SUPER_ADMIN")) {
            accessibleSalonIds = undefined;
        } else if (isStaffOnly(userRoles)) {
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

    let comboSalonIds: string[] | undefined;
    if (!isAllSalons) {
        const location = await prisma.salon.findUnique({ where: { id: salonId }, select: { id: true, parentId: true, isActive: true } });
        if (!location) throw { status: 404, message: "Salon not found" };
        if (location.parentId) {
            if (!location.isActive) throw { status: 404, message: "Branch not found" };
            // A branch can define its own combos, while salon-wide combos are
            // available at every active branch.
            comboSalonIds = [location.id, location.parentId];
        } else {
            const branches = await prisma.salon.findMany({ where: { parentId: location.id, isActive: true }, select: { id: true } });
            comboSalonIds = [location.id, ...branches.map(({ id }) => id)];
        }
    }

    const where: any = {
        salonId: isAllSalons ? (accessibleSalonIds ? { in: accessibleSalonIds } : undefined) : { in: comboSalonIds },
        isActive: true,
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
            include: {
                items: { include: { service: { include: { images: true, category: true } } } },
                salon: {
                    select: {
                        id: true,
                        name: true,
                        parentId: true,
                        parent: {
                            select: {
                                id: true,
                                name: true,
                                owner: { select: { id: true, firstName: true, lastName: true } },
                            },
                        },
                        owner: { select: { id: true, firstName: true, lastName: true } },
                    },
                },
            },
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
