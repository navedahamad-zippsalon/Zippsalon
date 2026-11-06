import { prisma } from "../../infrastructure/database/prisma";
import fs from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";
import { AttendanceStatus } from "@prisma/client";
import { startOfDay, endOfDay, subDays } from "date-fns";
import bcrypt from "bcrypt";
import { hasSalonPermission } from "../../common/utils/permission.util";
import { APP_CONSTANTS } from "../../common/constants/app.constants";
import { encrypt, decrypt } from "../whatsapp/utils/encryption";
import QRCode from "qrcode";
import { StaffBankDetailsInput } from "../../validators/staff-bank-details";
import { isVendorUser } from "../../common/utils/role.util";

export const addStaffService = async (adminId: string, payload: any, adminRoles: string[] = []) => {
    const hasPermission = await hasSalonPermission(payload.salonId, adminId, adminRoles);
    if (!hasPermission) {
        throw { status: 403, message: "Forbidden: You don't have permission for this salon" };
    }

    return prisma.$transaction(async (tx) => {
        const assignedLocation = await tx.salon.findUnique({
            where: { id: payload.salonId },
            select: { id: true, isActive: true },
        });
        if (!assignedLocation || (isVendorUser(adminRoles) && !assignedLocation.isActive)) {
            throw { status: 400, code: "INVALID_STAFF_LOCATION", message: "Select an active Salon or Branch." };
        }

        let staffUserId = payload.user.id;
        if (staffUserId) {
            const existingUser = await tx.user.findUnique({ where: { id: staffUserId }, select: { id: true } });
            if (!existingUser) throw { status: 404, message: "User not found" };
        } else {
            const existing = await tx.user.findFirst({
                where: {
                    OR: [
                        { email: { equals: payload.user.email, mode: "insensitive" } },
                        { phone: payload.user.phone, countryCode: payload.user.countryCode || "+91" },
                    ],
                },
                select: { id: true },
            });
            if (existing) throw { status: 409, message: "A user with this email or phone number already exists" };
            const hashedPassword = await bcrypt.hash(payload.user.password || "Staff@123", 10);
            const newUser = await tx.user.create({
                data: {
                    firstName: payload.user.firstName,
                    lastName: payload.user.lastName,
                    email: payload.user.email.trim().toLowerCase(),
                    phone: payload.user.phone,
                    countryCode: payload.user.countryCode || "+91",
                    password: hashedPassword,
                },
                select: { id: true },
            });
            staffUserId = newUser.id;
        }

        const staffRole = await tx.role.upsert({
            where: { name: "STAFF" },
            update: {},
            create: { name: "STAFF" },
            select: { id: true },
        });
        await tx.userRole.upsert({
            where: { userId_roleId: { userId: staffUserId, roleId: staffRole.id } },
            update: {},
            create: { userId: staffUserId, roleId: staffRole.id },
        });
        const created = await tx.salonStaff.create({
            data: {
                userId: staffUserId,
                salonId: payload.salonId,
                role: payload.role,
                staffRoleId: payload.staffRoleId,
                isActive: payload.isActive ?? true,
                createdById: adminId,
            },
            include: {
                user: { select: { id: true, firstName: true, lastName: true, email: true, phone: true, countryCode: true, isActive: true } },
                salon: { include: { parent: { select: { id: true, name: true } } } },
            },
        });
        const isBranch = Boolean(created.salon.parent);
        return {
            ...created,
            mainSalonId: isBranch ? created.salon.parent!.id : created.salon.id,
            branchId: isBranch ? created.salon.id : null,
            branch: isBranch ? { id: created.salon.id, name: created.salon.name } : null,
        };
    });
};

export const updateStaffService = async (staffId: string, adminId: string, payload: any, adminRoles: string[] = []) => {
    const staff = await prisma.salonStaff.findUnique({
        where: { id: staffId },
        include: { salon: { select: { id: true, parentId: true } } },
    });
    if (!staff) throw { status: 404, message: "Staff record not found" };

    const hasPermission = await hasSalonPermission(staff.salonId, adminId, adminRoles);
    if (!hasPermission) {
        throw { status: 403, message: "Forbidden: You don't have permission to update this staff" };
    }

    const targetSalonId = payload.branchId === null
        ? payload.salonId ?? staff.salon.parentId ?? staff.salonId
        : payload.branchId ?? payload.salonId;
    if (targetSalonId !== undefined && !await hasSalonPermission(targetSalonId, adminId, adminRoles)) {
        throw { status: 403, code: "STAFF_LOCATION_ACCESS_DENIED", message: "You don't have permission to assign this Staff member to that Salon or Branch." };
    }

    return prisma.$transaction(async (tx) => {
        let assignedSalonId = staff.salonId;
        if (targetSalonId !== undefined) {
            const target = await tx.salon.findUnique({
                where: { id: targetSalonId },
                select: {
                    id: true,
                    parentId: true,
                    isActive: true,
                    ownerId: true,
                    parent: { select: { ownerId: true } },
                },
            });
            if (!target || !target.isActive) {
                throw { status: 400, code: "INVALID_STAFF_LOCATION", message: "Select an active Salon or Branch." };
            }
            if (isVendorUser(adminRoles) && target.ownerId !== adminId && target.parent?.ownerId !== adminId) {
                throw { status: 403, code: "STAFF_LOCATION_ACCESS_DENIED", message: "You don't have permission to assign this Staff member to that Salon or Branch." };
            }
            const currentRootId = staff.salon.parentId ?? staff.salonId;
            const targetRootId = target.parentId ?? target.id;
            if (targetRootId !== currentRootId) {
                throw { status: 400, code: "STAFF_LOCATION_SALON_MISMATCH", message: "The selected Branch must belong to the Staff member's Salon." };
            }
            const duplicateAssignment = await tx.salonStaff.findFirst({
                where: { userId: staff.userId, salonId: target.id, id: { not: staffId } },
                select: { id: true },
            });
            if (duplicateAssignment) {
                throw { status: 409, code: "STAFF_ALREADY_ASSIGNED", message: "This Staff member is already assigned to the selected Salon or Branch." };
            }
            assignedSalonId = target.id;
        }

        const updated = await tx.salonStaff.update({
            where: { id: staffId },
            data: {
                ...(payload.role !== undefined ? { role: payload.role } : {}),
                ...(payload.isActive !== undefined ? { isActive: payload.isActive } : {}),
                ...(payload.staffRoleId !== undefined ? { staffRoleId: payload.staffRoleId } : {}),
                salonId: assignedSalonId,
                updatedById: adminId,
            },
            include: {
                user: { select: { id: true, firstName: true, lastName: true, email: true, phone: true, countryCode: true, isActive: true } },
                salon: { include: { parent: { select: { id: true, name: true } } } },
            },
        });
        if (payload.user) {
            const userData = {
                ...(payload.user.firstName !== undefined ? { firstName: payload.user.firstName } : {}),
                ...(payload.user.lastName !== undefined ? { lastName: payload.user.lastName } : {}),
                ...(payload.user.email !== undefined ? { email: payload.user.email.trim().toLowerCase() } : {}),
                ...(payload.user.phone !== undefined ? { phone: payload.user.phone } : {}),
                ...(payload.user.countryCode !== undefined ? { countryCode: payload.user.countryCode } : {}),
            };
            if (Object.keys(userData).length) {
                await tx.user.update({ where: { id: staff.userId }, data: userData });
            }
        }
        const isBranch = Boolean(updated.salon.parent);
        return {
            ...updated,
            mainSalonId: isBranch ? updated.salon.parent!.id : updated.salon.id,
            branchId: isBranch ? updated.salon.id : null,
            branch: isBranch ? { id: updated.salon.id, name: updated.salon.name } : null,
            user: payload.user ? await tx.user.findUniqueOrThrow({
                where: { id: staff.userId },
                select: { id: true, firstName: true, lastName: true, email: true, phone: true, countryCode: true, isActive: true },
            }) : updated.user,
        };
    });
};

export const getStaffByIdService = async (staffId: string, userId: string, roles: string[] = []) => {
    const staff = await prisma.salonStaff.findUnique({
        where: { id: staffId },
        include: {
            user: { select: { id: true, firstName: true, lastName: true, email: true, phone: true, countryCode: true, isActive: true } },
            salon: { include: { parent: { select: { id: true, name: true } } } },
            staffRole: true,
        },
    });
    if (!staff) throw { status: 404, message: "Staff record not found" };
    if (!await hasSalonPermission(staff.salonId, userId, roles)) {
        throw { status: 404, message: "Staff record not found" };
    }
    const isBranch = Boolean(staff.salon.parent);
    return {
        ...staff,
        mainSalonId: isBranch ? staff.salon.parent!.id : staff.salon.id,
        branchId: isBranch ? staff.salon.id : null,
        branch: isBranch ? { id: staff.salon.id, name: staff.salon.name } : null,
    };
};

// Keep historical bookings, attendance, and reviews intact by deactivating
// the salon membership instead of deleting the staff record.
export const deleteStaffService = async (staffId: string, adminId: string, adminRoles: string[] = []) => {
    const staff = await prisma.salonStaff.findUnique({ where: { id: staffId }, select: { id: true, salonId: true, isActive: true } });
    if (!staff) throw { status: 404, message: "Staff record not found" };
    if (!await hasSalonPermission(staff.salonId, adminId, adminRoles)) {
        throw { status: 403, message: "Forbidden: You don't have permission to delete this staff" };
    }
    return prisma.salonStaff.update({
        where: { id: staffId },
        data: { isActive: false, updatedById: adminId },
    });
};

export const getAllStaffService = async (adminId: string, adminRoles: string[] = [], query: any = {}) => {
    const isAdmin = adminRoles.includes(APP_CONSTANTS.ROLES.ADMIN) || adminRoles.includes("SUPER_ADMIN");
    const isVendor = isVendorUser(adminRoles);
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 10));
    const search = typeof query.search === "string" ? query.search.trim() : "";
    const now = new Date();
    const monthStart = query.month ? new Date(`${query.month}-01T00:00:00.000Z`) : new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    const monthEnd = query.month
        ? new Date(Date.UTC(monthStart.getUTCFullYear(), monthStart.getUTCMonth() + 1, 1) - 1)
        : now;
    const bookingStart = query.startDate ? new Date(`${query.startDate}T00:00:00.000Z`) : monthStart;
    const bookingEnd = query.endDate ? new Date(`${query.endDate}T23:59:59.999Z`) : monthEnd;
    const attendanceStart = query.attendanceStartDate ? new Date(`${query.attendanceStartDate}T00:00:00.000Z`) : bookingStart;
    const attendanceEnd = query.attendanceEndDate ? new Date(`${query.attendanceEndDate}T23:59:59.999Z`) : bookingEnd;
    const sortOrder = query.sortOrder === "asc" ? "asc" : "desc";
    const orderBy: any = query.sortBy === "name"
        ? { user: { firstName: sortOrder } }
        : query.sortBy === "designation"
            ? { staffRole: { name: sortOrder } }
            : query.sortBy === "status"
                ? { isActive: sortOrder }
                : { createdAt: sortOrder };
    const assignedSalonIds = !isAdmin && !isVendor
        ? (await prisma.salonStaff.findMany({
            where: { userId: adminId, isActive: true },
            select: { salonId: true },
        })).map(({ salonId }) => salonId)
        : [];

    // Reject a vendor's attempt to probe another owner's location before
    // querying staff. The scope predicate below remains the defense-in-depth
    // check applied to both the data and count queries.
    if (!isAdmin) {
        for (const locationId of [query.salonId, query.branchId].filter(Boolean)) {
            if (!await hasSalonPermission(locationId, adminId, adminRoles)) {
                throw { status: 403, message: "Forbidden: You don't have permission for this salon or branch" };
            }
        }
    }

    const searchCondition = search ? {
        OR: [
            { user: { firstName: { contains: search, mode: "insensitive" } } },
            { user: { lastName: { contains: search, mode: "insensitive" } } },
            { user: { email: { contains: search, mode: "insensitive" } } },
            { user: { phone: { contains: search, mode: "insensitive" } } },
            { role: { contains: search, mode: "insensitive" } },
            { staffRole: { name: { contains: search, mode: "insensitive" } } },
        ],
    } : {};
    const where: any = {
        AND: [
            isVendor ? {
                OR: [
                    { salon: { ownerId: adminId } },
                    { salon: { parent: { ownerId: adminId } } }
                ]
            } : !isAdmin ? { salonId: { in: assignedSalonIds } } : {},
            // A branch is represented by a child Salon. When both filters are
            // present, branchId is the membership location and salonId is its
            // parent; otherwise salonId retains the legacy direct filter.
            query.salonId && !query.branchId ? { salonId: query.salonId } : {},
            query.branchId ? {
                salonId: query.branchId,
                ...(query.salonId ? { salon: { parentId: query.salonId } } : {}),
            } : {},
            query.status ? { isActive: query.status === "ACTIVE" } : {},
            query.role ? { role: { equals: query.role, mode: "insensitive" } } : {},
            query.designation ? { staffRole: { name: { equals: query.designation, mode: "insensitive" } } } : {},
            searchCondition,
        ],
    };

    const [items, total] = await Promise.all([
        prisma.salonStaff.findMany({
            where,
            skip: (page - 1) * limit,
            take: limit,
        include: { 
            user: {
                select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    email: true,
                    phone: true,
                    countryCode: true,
                    isActive: true,
                }
            }, 
            salon: {
                select: {
                    id: true,
                    name: true,
                    parentId: true,
                    parent: { select: { id: true, name: true } }
                }
            },
            createdBy: {
                select: { firstName: true, lastName: true }
            },
            updatedBy: {
                select: { firstName: true, lastName: true }
            },
            staffRole: { select: { id: true, name: true } },
        },
            orderBy,
        }),
        prisma.salonStaff.count({ where }),
    ]);

    const staffIds = items.map((item) => item.id);
    const [bookingRows, reviewRows, attendanceRows] = staffIds.length ? await Promise.all([
        prisma.booking.groupBy({
            by: ["staffId", "status"],
            where: { staffId: { in: staffIds }, bookingDate: { gte: bookingStart, lte: bookingEnd } },
            _count: { _all: true },
            _sum: { totalPaid: true },
        }),
        prisma.review.groupBy({
            by: ["staffId"],
            where: { staffId: { in: staffIds }, status: "PUBLISHED" },
            _count: { _all: true },
            _avg: { rating: true },
        }),
        prisma.attendance.groupBy({
            by: ["staffId", "status"],
            where: { staffId: { in: staffIds }, date: { gte: attendanceStart, lte: attendanceEnd } },
            _count: { _all: true },
        }),
    ]) : [[], [], []] as const;

    const bookingPerformance = new Map<string, { totalBookings: number; completedBookings: number; cancelledBookings: number; pendingBookings: number; monthlyRevenue: number }>();
    for (const row of bookingRows) {
        if (!row.staffId) continue;
        const current = bookingPerformance.get(row.staffId) ?? { totalBookings: 0, completedBookings: 0, cancelledBookings: 0, pendingBookings: 0, monthlyRevenue: 0 };
        const count = row._count._all;
        current.totalBookings += count;
        if (row.status === "DONE") {
            current.completedBookings += count;
            // totalPaid reflects only completed payments in the existing flow.
            current.monthlyRevenue += Number(row._sum.totalPaid ?? 0);
        } else if (row.status === "CANCELLED" || row.status === "NO_SHOW") current.cancelledBookings += count;
        else if (row.status === "PENDING") current.pendingBookings += count;
        bookingPerformance.set(row.staffId, current);
    }
    const reviewPerformance = new Map(reviewRows.filter((row) => row.staffId).map((row) => [row.staffId!, { rating: Number(row._avg.rating ?? 0), reviewCount: row._count._all }]));
    const attendancePerformance = new Map<string, { applicable: number; present: number }>();
    for (const row of attendanceRows) {
        const current = attendancePerformance.get(row.staffId) ?? { applicable: 0, present: 0 };
        current.applicable += row._count._all;
        current.present += row.status === "PRESENT" ? row._count._all : row.status === "HALF_DAY" ? row._count._all * 0.5 : 0;
        attendancePerformance.set(row.staffId, current);
    }

    const totalPages = Math.ceil(total / limit);
    return {
        items: items.map((item) => {
            const bookings = bookingPerformance.get(item.id) ?? { totalBookings: 0, completedBookings: 0, cancelledBookings: 0, pendingBookings: 0, monthlyRevenue: 0 };
            const reviews = reviewPerformance.get(item.id) ?? { rating: 0, reviewCount: 0 };
            const attendance = attendancePerformance.get(item.id) ?? { applicable: 0, present: 0 };
            const isBranch = Boolean(item.salon.parentId);
            return {
                ...item,
                name: `${item.user.firstName} ${item.user.lastName || ""}`.trim(),
                firstName: item.user.firstName,
                lastName: item.user.lastName,
                email: item.user.email,
                phone: item.user.phone,
                avatar: null,
                designation: item.staffRole?.name ?? item.role ?? null,
                status: item.isActive && item.user.isActive !== false ? "ACTIVE" : "INACTIVE",
                salon: isBranch ? item.salon.parent : { id: item.salon.id, name: item.salon.name },
                branch: isBranch ? { id: item.salon.id, name: item.salon.name } : null,
                commission: { percentage: 0, source: "none" },
                performance: {
                    ...bookings,
                    rating: Math.round(reviews.rating * 10) / 10,
                    reviewCount: reviews.reviewCount,
                    attendancePercentage: attendance.applicable ? Math.round((attendance.present / attendance.applicable) * 100) : 0,
                },
            };
        }),
        pagination: {
            page,
            limit,
            total,
            totalPages,
            hasNextPage: page < totalPages,
            hasPreviousPage: page > 1 && totalPages > 0,
        },
    };
};

export const getStaffFilterOptionsService = async (userId: string, roles: string[] = []) => {
    const isAdmin = roles.includes(APP_CONSTANTS.ROLES.ADMIN) || roles.includes("SUPER_ADMIN");
    const isVendor = isVendorUser(roles);
    const salonScope: any = isAdmin ? {} : {
        OR: [
            ...(isVendor ? [{ ownerId: userId }, { parent: { ownerId: userId } }] : []),
            { staff: { some: { userId, isActive: true } } },
        ],
    };
    const salons = await prisma.salon.findMany({
        where: salonScope,
        select: { id: true, name: true, parentId: true, parent: { select: { id: true, name: true } } },
        orderBy: { name: "asc" },
    });
    const locationIds = salons.map((salon) => salon.id);
    const staff = locationIds.length ? await prisma.salonStaff.findMany({
        where: { salonId: { in: locationIds } },
        select: { role: true, staffRole: { select: { name: true } } },
    }) : [];
    return {
        salons: salons.filter((salon) => !salon.parentId).map(({ id, name }) => ({ id, name })),
        branches: salons.filter((salon) => salon.parentId).map(({ id, name, parentId }) => ({ id, name, salonId: parentId })),
        statuses: ["ACTIVE", "INACTIVE"],
        roles: [...new Set(staff.map((member) => member.role).filter(Boolean))].sort(),
        designations: [...new Set(staff.map((member) => member.staffRole?.name).filter(Boolean))].sort(),
    };
};

export const getAdminStaffService = async (query: any = {}, exportAll = false) => {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
    const where: any = { ...(query.salonId && { salonId: query.salonId }), ...(query.status && { isActive: query.status === 'ACTIVE' }) };
    if (query.branchId) where.salon = { id: query.branchId };
    if (query.country || query.city || query.state) where.salon = { ...(where.salon || {}), address: { ...(query.country && { country: { equals: query.country, mode: 'insensitive' } }), ...(query.city && { city: { equals: query.city, mode: 'insensitive' } }), ...(query.state && { state: { equals: query.state, mode: 'insensitive' } }) } };
    if (query.search) where.user = { OR: [{ firstName: { contains: query.search, mode: 'insensitive' } }, { lastName: { contains: query.search, mode: 'insensitive' } }, { email: { contains: query.search, mode: 'insensitive' } }, { phone: { contains: query.search, mode: 'insensitive' } }] };
    const [items, total] = await Promise.all([
        prisma.salonStaff.findMany({ where, ...(exportAll ? {} : { skip: (page - 1) * limit, take: limit }), orderBy: { createdAt: 'desc' }, include: { user: { select: { id: true, firstName: true, lastName: true, email: true, phone: true, countryCode: true, gender: true } }, salon: { select: { id: true, name: true, parentId: true, isActive: true, address: true, parent: { select: { id: true, name: true } } } } } }),
        prisma.salonStaff.count({ where }),
    ]);
    return { items, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
};

export const markAttendanceService = async (
    staffId: string,
    dateString: string,
    status: AttendanceStatus,
    adminId: string,
    adminRoles: string[] = []
) => {
    // verify marker user exists
    const markerExists = await prisma.user.findUnique({ where: { id: adminId } });
    if (!markerExists) {
        throw { status: 401, message: "Unauthorized: Marking user does not exist. Please log out and log in again." };
    }

    // verify permission
    const staff = await prisma.salonStaff.findUnique({ where: { id: staffId }});
    if (!staff) throw { status: 404, message: "Staff not found" };

    const hasPermission = await hasSalonPermission(staff.salonId, adminId, adminRoles);
    if (!hasPermission) {
        throw { status: 403, message: "Forbidden: You don't have permission to mark attendance for this staff" };
    }

    const date = new Date(dateString);

    const attendance = await prisma.attendance.upsert({
        where: {
            staffId_date: {
                staffId,
                date,
            },
        },
        update: {
            status,
            markedById: adminId,
        },
        create: {
            staffId,
            date,
            status,
            markedById: adminId,
        },
    });

    return attendance;
};

type AttendanceListFilters = {
    vendorId?: string;
    salonId?: string;
    branchId?: string;
    staffId?: string;
    status?: AttendanceStatus;
    search?: string;
    date?: string;
    month?: string;
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
};

const attendancePage = (page: number, limit: number, total: number) => ({
    page,
    limit,
    total,
    totalPages: total ? Math.ceil(total / limit) : 0,
    hasNextPage: page * limit < total,
    hasPreviousPage: page > 1,
});

const utcDay = (value: string) => new Date(`${value}T00:00:00.000Z`);

async function validateAttendanceHierarchy(filters: AttendanceListFilters, userId: string, roles: string[], isAdmin: boolean) {
    const vendorId = filters.vendorId;
    if (vendorId) {
        const vendor = await prisma.user.findFirst({
            where: { id: vendorId, roles: { some: { role: { name: APP_CONSTANTS.ROLES.VENDOR } } } },
            select: { id: true },
        });
        if (!vendor) throw { status: 400, message: "Vendor not found" };
        if (!isAdmin && vendorId !== userId) throw { status: 403, message: "Forbidden: You can only access your own attendance" };
    }

    const effectiveVendorId = isAdmin ? vendorId : userId;
    if (!isAdmin && !roles.includes(APP_CONSTANTS.ROLES.VENDOR)) {
        throw { status: 403, message: "Forbidden: Attendance access denied" };
    }

    let salon: { id: string; ownerId: string; parentId: string | null } | null = null;
    if (filters.salonId) {
        salon = await prisma.salon.findUnique({
            where: { id: filters.salonId },
            select: { id: true, ownerId: true, parentId: true },
        });
        if (!salon) throw { status: 400, message: "Salon not found" };
        if (effectiveVendorId && salon.ownerId !== effectiveVendorId && !await prisma.salon.findFirst({
            where: { id: salon.id, parent: { ownerId: effectiveVendorId } },
            select: { id: true },
        })) {
            throw { status: isAdmin ? 400 : 403, message: "Salon does not belong to the selected vendor" };
        }
        if (!isAdmin && !await hasSalonPermission(salon.id, userId, roles)) {
            throw { status: 403, message: "Forbidden: Access denied" };
        }
    }

    let branch: { id: string; ownerId: string; parentId: string | null } | null = null;
    if (filters.branchId) {
        branch = await prisma.salon.findUnique({
            where: { id: filters.branchId },
            select: { id: true, ownerId: true, parentId: true },
        });
        if (!branch || !branch.parentId) throw { status: 400, message: "Branch not found" };
        if (salon && branch.parentId !== salon.id) throw { status: 400, message: "Branch does not belong to the selected salon" };
        if (effectiveVendorId && branch.ownerId !== effectiveVendorId && !await prisma.salon.findFirst({
            where: { id: branch.id, parent: { ownerId: effectiveVendorId } },
            select: { id: true },
        })) {
            throw { status: isAdmin ? 400 : 403, message: "Branch does not belong to the selected vendor" };
        }
        if (!isAdmin && !await hasSalonPermission(branch.id, userId, roles)) {
            throw { status: 403, message: "Forbidden: Access denied" };
        }
    }

    if (filters.staffId) {
        const staff = await prisma.salonStaff.findUnique({
            where: { id: filters.staffId },
            select: { id: true, salonId: true, salon: { select: { ownerId: true, parentId: true } } },
        });
        if (!staff) throw { status: 400, message: "Staff not found" };
        if (branch && staff.salonId !== branch.id) throw { status: 400, message: "Staff does not belong to the selected branch" };
        if (salon && staff.salonId !== salon.id && staff.salon.parentId !== salon.id) {
            throw { status: 400, message: "Staff does not belong to the selected salon" };
        }
        if (effectiveVendorId && staff.salon.ownerId !== effectiveVendorId && !await prisma.salon.findFirst({
            where: { id: staff.salonId, parent: { ownerId: effectiveVendorId } },
            select: { id: true },
        })) {
            throw { status: isAdmin ? 400 : 403, message: "Staff does not belong to the selected vendor" };
        }
    }
}

export const getSalonAttendanceService = async (
    salonIdOrFilters: string | AttendanceListFilters | undefined,
    adminId: string,
    adminRoles: string[] = [],
    startDate?: string,
    endDate?: string,
) => {
    const filters: AttendanceListFilters = typeof salonIdOrFilters === "string"
        ? { salonId: salonIdOrFilters, startDate, endDate }
        : salonIdOrFilters ?? {};
    const page = Math.max(1, Number(filters.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(filters.limit) || 20));
    const isAdmin = adminRoles.includes(APP_CONSTANTS.ROLES.ADMIN) || adminRoles.includes("SUPER_ADMIN");
    const isVendor = adminRoles.includes(APP_CONSTANTS.ROLES.VENDOR);
    if (!isAdmin && !isVendor) throw { status: 403, message: "Forbidden: Attendance access denied" };
    await validateAttendanceHierarchy(filters, adminId, adminRoles, isAdmin);

    const vendorId = isAdmin ? filters.vendorId : adminId;
    const staffConditions: any[] = [];
    if (filters.staffId) staffConditions.push({ id: filters.staffId });
    if (filters.branchId) staffConditions.push({ salonId: filters.branchId });
    if (filters.salonId && !filters.branchId) {
        staffConditions.push({ OR: [{ salonId: filters.salonId }, { salon: { parentId: filters.salonId } }] });
    }
    if (vendorId) {
        staffConditions.push({
            OR: [
                { salon: { ownerId: vendorId } },
                { salon: { parent: { ownerId: vendorId } } },
            ],
        });
    }
    if (filters.search) {
        staffConditions.push({
            user: {
                OR: [
                    { firstName: { contains: filters.search, mode: "insensitive" } },
                    { lastName: { contains: filters.search, mode: "insensitive" } },
                    { email: { contains: filters.search, mode: "insensitive" } },
                    { phone: { contains: filters.search, mode: "insensitive" } },
                ],
            },
        });
    }
    if (filters.branchId && filters.salonId) staffConditions.push({ salon: { parentId: filters.salonId } });
    const staffWhere: any = staffConditions.length ? { AND: staffConditions } : {};

    const start = [
        filters.date ? utcDay(filters.date) : undefined,
        filters.month ? utcDay(`${filters.month}-01`) : undefined,
        filters.startDate ? utcDay(filters.startDate) : undefined,
    ].filter((value): value is Date => Boolean(value)).sort((a, b) => b.getTime() - a.getTime())[0];
    const endExclusiveCandidates = [
        filters.date ? new Date(utcDay(filters.date).getTime() + 86400000) : undefined,
        filters.month ? (() => {
            const [year, month] = filters.month!.split("-").map(Number);
            return new Date(Date.UTC(year, month, 1));
        })() : undefined,
        filters.endDate ? new Date(utcDay(filters.endDate).getTime() + 86400000) : undefined,
    ].filter((value): value is Date => Boolean(value)).sort((a, b) => a.getTime() - b.getTime())[0];

    const where: any = {
        staff: staffWhere,
        ...(filters.status ? { status: filters.status } : {}),
        ...(start || endExclusiveCandidates ? {
            date: {
                ...(start ? { gte: start } : {}),
                ...(endExclusiveCandidates ? { lt: endExclusiveCandidates } : {}),
            },
        } : {}),
    };
    const [attendances, total] = await Promise.all([
        prisma.attendance.findMany({
            where,
            skip: (page - 1) * limit,
            take: limit,
            include: {
                staff: {
                    include: {
                        user: { select: { firstName: true, lastName: true } },
                        salon: { select: { id: true, name: true, parentId: true, ownerId: true } },
                    },
                },
            },
            orderBy: { date: "asc" },
        }),
        prisma.attendance.count({ where }),
    ]);
    return { attendances, pagination: attendancePage(page, limit, total) };
};

export const getMyAttendanceService = async (userId: string) => {
    const staffRecords = await prisma.salonStaff.findMany({
        where: { userId },
        select: { id: true },
    });

    const staffIds = staffRecords.map((s) => s.id);

    return prisma.attendance.findMany({
        where: {
            staffId: { in: staffIds },
        },
        orderBy: { date: "desc" },
    });
};

export const getMyProfileService = async (userId: string) => {
    const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
            roles: { include: { role: true } },
            staffIn: {
                include: {
                    salon: {
                        include: { address: true }
                    },
                    staffRole: true
                }
            }
        }
    });

    if (!user) throw { status: 404, message: "User not found" };

    const staffRecord = user.staffIn[0];
    const salon = staffRecord?.salon;
    const addressStr = salon?.address
        ? `${salon.address.line1}${salon.address.line2 ? ', ' + salon.address.line2 : ''}, ${salon.address.city}, ${salon.address.state}, ${salon.address.country} - ${salon.address.pincode}`
        : "Sector 29, Gurgaon, Haryana, India";

    return {
        id: user.id,
        staffId: staffRecord?.id || null,
        firstName: user.firstName,
        lastName: user.lastName,
        name: `${user.firstName} ${user.lastName || ''}`.trim(),
        email: user.email,
        phone: user.phone,
        countryCode: user.countryCode,
        gender: user.gender || "MALE",
        avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80",
        designation: staffRecord?.role || "Senior Hair Stylist",
        role: "STAFF",
        status: user.isActive ? "ACTIVE" : "INACTIVE",
        salon: salon ? {
            id: salon.id,
            name: salon.name,
            address: addressStr,
            city: salon.address?.city || "Gurgaon",
            state: salon.address?.state || "Haryana",
            country: salon.address?.country || "India",
            pincode: salon.address?.pincode || "122002",
            timings: salon.timings
        } : null,
        specializations: [
            "Hair Cut",
            "Hair Styling",
            "Hair Coloring",
            "Beard Styling",
            "Hair Spa"
        ],
        experience: "5 years",
        commissionRate: "30%",
        commissionRateNumber: 0.30,
        rating: 4.8,
        totalReviews: 126,
        profileCompletion: 95,
        availability: "Monday-Saturday",
        workingHours: "10:00 AM - 8:00 PM",
        breakHours: "2:00 PM - 3:00 PM",
        bio: "Award-winning Senior Stylist specializing in modern fades, balayage color, and premium grooming.",
        stats: {
            followers: 2450,
            following: 180,
            totalPosts: 12,
            totalLikes: 3842,
            totalViews: 18500
        },
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
    };
};

export const getMyDashboardService = async (userId: string) => {
    const now = new Date();
    const todayStart = startOfDay(now);
    const todayEnd = endOfDay(now);

    const monthStart = startOfDay(new Date(now.getFullYear(), now.getMonth(), 1));
    const monthEnd = endOfDay(now);

    const staffRecord = await prisma.salonStaff.findFirst({
        where: { userId },
        include: { user: true, salon: true }
    });

    if (!staffRecord) throw { status: 404, message: "Staff record not found for this user" };

    const staffId = staffRecord.id;

    // 1. Today's completed bookings & revenue
    const [todayCompletedBookings, todayCompletedPayments, todayServicesCount] = await Promise.all([
        prisma.booking.findMany({
            where: {
                staffId,
                bookingDate: { gte: todayStart, lte: todayEnd },
                status: "DONE"
            },
            include: { services: true, customer: { select: { firstName: true, lastName: true, phone: true } } }
        }),
        prisma.payment.aggregate({
            where: {
                status: "COMPLETED",
                booking: { staffId, bookingDate: { gte: todayStart, lte: todayEnd } }
            },
            _sum: { amount: true }
        }),
        prisma.bookingService.count({
            where: {
                booking: {
                    staffId,
                    bookingDate: { gte: todayStart, lte: todayEnd },
                    status: "DONE"
                }
            }
        })
    ]);

    // 2. Month's completed bookings & revenue
    const [monthServicesCount, monthRevenueResult] = await Promise.all([
        prisma.bookingService.count({
            where: {
                booking: {
                    staffId,
                    bookingDate: { gte: monthStart, lte: monthEnd },
                    status: "DONE"
                }
            }
        }),
        prisma.payment.aggregate({
            where: {
                status: "COMPLETED",
                booking: { staffId, bookingDate: { gte: monthStart, lte: monthEnd } }
            },
            _sum: { amount: true }
        })
    ]);

    // 3. Upcoming bookings for today
    const upcomingToday = await prisma.booking.findMany({
        where: {
            staffId,
            bookingDate: { gte: now },
            status: { in: ["CONFIRMED", "CHECKED_IN", "PENDING"] }
        },
        include: {
            customer: { select: { firstName: true, lastName: true, phone: true } },
            services: true
        },
        orderBy: { bookingDate: "asc" },
        take: 5
    });

    // 4. In-progress bookings for today
    const inProgressToday = await prisma.booking.findMany({
        where: {
            staffId,
            status: "CHECKED_IN",
            bookingDate: { gte: todayStart, lte: todayEnd }
        },
        include: {
            customer: { select: { firstName: true, lastName: true, phone: true } },
            services: true
        }
    });

    // 5. Today's attendance
    const todayDateOnly = new Date(now.toISOString().split("T")[0]);
    const todayAttendance = await prisma.attendance.findFirst({
        where: {
            staffId,
            date: todayDateOnly
        }
    });

    const todayEarnings = todayCompletedPayments._sum.amount || (todayCompletedBookings.reduce((sum, b) => sum + b.finalAmount, 0)) || 4200;
    const todayServices = todayServicesCount || 7;

    const monthlyRevenue = monthRevenueResult._sum.amount || 125000;
    const monthlyServices = monthServicesCount || 156;
    const commissionRate = 0.30;
    const monthlyCommission = Math.round(monthlyRevenue * commissionRate); // ₹37,500
    const paidCommission = 25000;
    const pendingCommission = Math.max(0, monthlyCommission - paidCommission); // ₹12,500

    return {
        greeting: `👋 Hi ${staffRecord.user.firstName}!`,
        staff: {
            id: staffRecord.id,
            userId: staffRecord.userId,
            name: `${staffRecord.user.firstName} ${staffRecord.user.lastName || ''}`.trim(),
            designation: staffRecord.role || "Senior Hair Stylist",
            salonName: staffRecord.salon.name
        },
        badge: {
            isTopPerformer: true,
            title: "🏆 Top Performer This Month!",
            rank: 1,
            totalStaff: 12
        },
        todaySummary: {
            services: todayServices,
            earnings: todayEarnings,
            targetServices: 8,
            targetEarnings: 5000,
            completionRate: "87.5%"
        },
        monthlyCommission: {
            period: "March 2026",
            services: monthlyServices,
            revenue: monthlyRevenue,
            commissionRate: "30%",
            commissionRateValue: commissionRate,
            commissionAmount: monthlyCommission,
            paidAmount: paidCommission,
            pendingAmount: pendingCommission,
            nextPayoutDate: "1 Apr 2026",
            status: "ON_TRACK"
        },
        todayAttendance: {
            status: todayAttendance?.status || "PRESENT",
            checkIn: "09:42 AM",
            expectedCheckOut: "07:30 PM",
            markedAt: todayAttendance?.createdAt
        },
        inProgressServices: inProgressToday.map(b => ({
            id: b.id,
            customerName: `${b.customer.firstName} ${b.customer.lastName || ''}`.trim(),
            serviceName: b.services.map(s => s.name).join(", "),
            amount: b.finalAmount,
            startTime: b.bookingDate,
            status: b.status
        })),
        upcomingAppointments: upcomingToday.map(b => ({
            id: b.id,
            customerName: `${b.customer.firstName} ${b.customer.lastName || ''}`.trim(),
            serviceName: b.services.map(s => s.name).join(", "),
            amount: b.finalAmount,
            time: b.bookingDate,
            status: b.status
        }))
    };
};

export const getMyAppointmentsService = async (userId: string, query: any = {}) => {
    const staffRecord = await prisma.salonStaff.findFirst({ where: { userId } });
    if (!staffRecord) throw { status: 404, message: "Staff record not found" };

    const { status, range, date } = query;
    const now = new Date();

    const where: any = { staffId: staffRecord.id };

    if (status) {
        where.status = status;
    }

    if (date) {
        const d = new Date(date);
        where.bookingDate = { gte: startOfDay(d), lte: endOfDay(d) };
    } else if (range === 'today') {
        where.bookingDate = { gte: startOfDay(now), lte: endOfDay(now) };
    } else if (range === 'tomorrow') {
        const tomorrow = new Date(now);
        tomorrow.setDate(now.getDate() + 1);
        where.bookingDate = { gte: startOfDay(tomorrow), lte: endOfDay(tomorrow) };
    } else if (range === 'upcoming') {
        where.bookingDate = { gte: now };
        where.status = { in: ['CONFIRMED', 'PENDING', 'CHECKED_IN'] };
    } else if (range === 'completed') {
        where.status = 'DONE';
    }

    const bookings = await prisma.booking.findMany({
        where,
        include: {
            customer: { select: { id: true, firstName: true, lastName: true, phone: true, email: true } },
            services: true,
            payments: true
        },
        orderBy: { bookingDate: 'desc' }
    });

    return bookings.map(b => ({
        id: b.id,
        bookingDate: b.bookingDate,
        status: b.status,
        medium: b.medium,
        totalAmount: b.totalAmount,
        discountAmount: b.discountAmount,
        finalAmount: b.finalAmount,
        totalPaid: b.totalPaid,
        customer: b.customer,
        services: b.services.map(s => ({ id: s.id, name: s.name, price: s.price })),
        paymentStatus: b.payments[0]?.status || (b.totalPaid >= b.finalAmount ? 'COMPLETED' : 'PENDING'),
        paymentMethod: b.payments[0]?.method || 'UPI',
        notes: b.notes
    }));
};

export const getMyEarningsService = async (userId: string) => {
    const staffRecord = await prisma.salonStaff.findFirst({ where: { userId } });
    if (!staffRecord) throw { status: 404, message: "Staff record not found" };

    const now = new Date();
    const todayStart = startOfDay(now);
    const todayEnd = endOfDay(now);

    const yesterdayStart = startOfDay(subDays(now, 1));
    const yesterdayEnd = endOfDay(subDays(now, 1));

    const weekStart = startOfDay(subDays(now, 7));
    const prevWeekStart = startOfDay(subDays(now, 14));
    const prevWeekEnd = endOfDay(subDays(now, 7));

    const monthStart = startOfDay(new Date(now.getFullYear(), now.getMonth(), 1));

    const [todayDone, yesterdayDone, thisWeekDone, prevWeekDone, monthDone, allCompleted] = await Promise.all([
        prisma.booking.findMany({ where: { staffId: staffRecord.id, status: 'DONE', bookingDate: { gte: todayStart, lte: todayEnd } }, include: { services: true } }),
        prisma.booking.findMany({ where: { staffId: staffRecord.id, status: 'DONE', bookingDate: { gte: yesterdayStart, lte: yesterdayEnd } }, include: { services: true } }),
        prisma.booking.findMany({ where: { staffId: staffRecord.id, status: 'DONE', bookingDate: { gte: weekStart, lte: todayEnd } }, include: { services: true } }),
        prisma.booking.findMany({ where: { staffId: staffRecord.id, status: 'DONE', bookingDate: { gte: prevWeekStart, lte: prevWeekEnd } }, include: { services: true } }),
        prisma.booking.findMany({ where: { staffId: staffRecord.id, status: 'DONE', bookingDate: { gte: monthStart, lte: todayEnd } }, include: { services: true } }),
        prisma.booking.findMany({
            where: { staffId: staffRecord.id, status: 'DONE' },
            include: { customer: { select: { firstName: true, lastName: true } }, services: true, payments: true },
            orderBy: { bookingDate: 'desc' },
            take: 50
        })
    ]);

    const sumAmounts = (arr: any[]) => arr.reduce((s, b) => s + b.finalAmount, 0);

    const todayGross = sumAmounts(todayDone) || 4200;
    const yesterdayGross = sumAmounts(yesterdayDone) || 4800;
    const thisWeekGross = sumAmounts(thisWeekDone) || 31200;
    const prevWeekGross = sumAmounts(prevWeekDone) || 34500;
    const monthGross = sumAmounts(monthDone) || 125000;

    return {
        currency: "INR",
        commissionRate: "30%",
        commissionRateNumber: 0.30,
        periods: {
            today: { services: todayDone.length || 7, grossAmount: todayGross, commission: Math.round(todayGross * 0.30) },
            yesterday: { services: yesterdayDone.length || 6, grossAmount: yesterdayGross, commission: Math.round(yesterdayGross * 0.30) },
            thisWeek: { services: thisWeekDone.length || 38, grossAmount: thisWeekGross, commission: Math.round(thisWeekGross * 0.30) },
            previousWeek: { services: prevWeekDone.length || 42, grossAmount: prevWeekGross, commission: Math.round(prevWeekGross * 0.30) },
            thisMonth: { services: monthDone.length || 156, grossAmount: monthGross, commission: Math.round(monthGross * 0.30) }
        },
        recentEarnings: allCompleted.map(b => ({
            id: b.id,
            date: b.bookingDate,
            customerName: `${b.customer.firstName} ${b.customer.lastName || ''}`.trim(),
            serviceName: b.services.map(s => s.name).join(", "),
            grossAmount: b.finalAmount,
            discount: b.discountAmount,
            netAmount: b.finalAmount,
            commissionRate: "30%",
            commissionAmount: Math.round(b.finalAmount * 0.30),
            paymentStatus: b.payments[0]?.status || 'COMPLETED',
            paymentMethod: b.payments[0]?.method || 'UPI'
        }))
    };
};

export const getMyCommissionsService = async (userId: string) => {
    const staffRecord = await prisma.salonStaff.findFirst({ where: { userId } });
    if (!staffRecord) throw { status: 404, message: "Staff record not found" };

    return {
        summary: {
            currentMonth: "March 2026",
            totalRevenue: 125000,
            commissionRate: "30%",
            commissionAmount: 37500,
            paidCommission: 25000,
            pendingCommission: 12500,
            nextPayoutDate: "1 Apr 2026"
        },
        payoutHistory: [
            {
                id: "PAY-COMM-001",
                paymentDate: "2026-03-05T12:00:00.000Z",
                amount: 10000,
                period: "1 Mar 2026 - 5 Mar 2026",
                status: "PAID",
                method: "BANK_TRANSFER",
                transactionId: "TXN-CMS-9921",
                salonId: staffRecord.salonId
            },
            {
                id: "PAY-COMM-002",
                paymentDate: "2026-03-15T12:00:00.000Z",
                amount: 15000,
                period: "6 Mar 2026 - 15 Mar 2026",
                status: "PAID",
                method: "BANK_TRANSFER",
                transactionId: "TXN-CMS-9948",
                salonId: staffRecord.salonId
            },
            {
                id: "PAY-COMM-003",
                paymentDate: "2026-04-01T10:00:00.000Z",
                amount: 12500,
                period: "16 Mar 2026 - 31 Mar 2026",
                status: "PENDING",
                method: "BANK_TRANSFER",
                transactionId: null,
                salonId: staffRecord.salonId
            }
        ]
    };
};

export const getMyScheduleService = async (userId: string) => {
    return {
        workingHours: {
            monday: "10:00 AM - 8:00 PM",
            tuesday: "10:00 AM - 8:00 PM",
            wednesday: "10:00 AM - 8:00 PM",
            thursday: "10:00 AM - 8:00 PM",
            friday: "10:00 AM - 8:00 PM",
            saturday: "10:00 AM - 8:00 PM",
            sunday: "OFF"
        },
        breakTime: "2:00 PM - 3:00 PM",
        slotsToday: [
            { time: "09:30 AM - 10:15 AM", status: "COMPLETED", service: "Men's Haircut", customer: "Rohan Verma", price: 500 },
            { time: "10:30 AM - 11:15 AM", status: "COMPLETED", service: "Premium Haircut", customer: "Aarav Patel", price: 800 },
            { time: "11:30 AM - 12:15 PM", status: "COMPLETED", service: "Head Massage", customer: "Vikas Mehta", price: 600 },
            { time: "12:30 PM - 01:15 PM", status: "COMPLETED", service: "Men's Haircut", customer: "Karan Kapoor", price: 500 },
            { time: "01:15 PM - 02:00 PM", status: "CANCELLED", service: "Men's Haircut", customer: "Arjun Nair", price: 500 },
            { time: "02:00 PM - 03:00 PM", status: "BREAK", service: "Lunch Break", customer: null, price: 0 },
            { time: "03:00 PM - 03:45 PM", status: "IN_PROGRESS", service: "Premium Haircut", customer: "Aman Verma", price: 800 },
            { time: "04:00 PM - 05:00 PM", status: "IN_PROGRESS", service: "Hair Spa", customer: "Vikas Mehta", price: 1200 },
            { time: "05:30 PM - 06:30 PM", status: "UPCOMING", service: "Hair Spa", customer: "Rohan Verma", price: 1200 },
            { time: "07:00 PM - 07:45 PM", status: "UPCOMING", service: "Beard Styling", customer: "Siddharth Malhotra", price: 350 },
            { time: "07:45 PM - 08:00 PM", status: "AVAILABLE", service: null, customer: null, price: 0 }
        ]
    };
};

export const getMyReviewsService = async (userId: string) => {
    return {
        summary: {
            averageRating: 4.8,
            totalReviews: 126,
            ratingDistribution: {
                "5": 22,
                "4": 6,
                "3": 2,
                "2": 0,
                "1": 0
            }
        },
        reviews: [
            { id: "REV-001", customerName: "Aarav Patel", rating: 5, service: "Men's Haircut", comment: "Rahul is a master stylist! Best fade haircut I have had in Gurgaon.", date: "2026-03-08" },
            { id: "REV-002", customerName: "Rohan Verma", rating: 5, service: "Hair Spa", comment: "Super relaxing hair spa and massage. Highly recommended!", date: "2026-03-08" },
            { id: "REV-003", customerName: "Vikas Mehta", rating: 5, service: "Premium Haircut", comment: "Very professional, paid great attention to detail.", date: "2026-03-07" },
            { id: "REV-004", customerName: "Aman Verma", rating: 5, service: "Hair Coloring", comment: "Amazing balayage shade, exactly what I requested.", date: "2026-03-07" },
            { id: "REV-005", customerName: "Siddharth Malhotra", rating: 4, service: "Beard Styling", comment: "Sharp beard trim and hot towel finish.", date: "2026-03-06" },
            { id: "REV-006", customerName: "Karan Kapoor", rating: 5, service: "Men's Haircut", comment: "Clean salon, punctual appointment, great haircut.", date: "2026-03-06" },
            { id: "REV-007", customerName: "Arjun Nair", rating: 5, service: "Head Massage", comment: "Pure bliss! Relieved all my headache and stress.", date: "2026-03-05" },
            { id: "REV-008", customerName: "Aditya Singhania", rating: 4, service: "Hair Treatment", comment: "Noticeable difference in hair texture and shine.", date: "2026-03-05" },
            { id: "REV-009", customerName: "Neha Gupta", rating: 5, service: "Hair Styling", comment: "Styled my hair perfectly for a party. Received so many compliments!", date: "2026-03-04" },
            { id: "REV-010", customerName: "Ananya Sen", rating: 5, service: "Hair Spa", comment: "Luxe experience, premium products used.", date: "2026-03-04" },
            { id: "REV-011", customerName: "Priya Iyer", rating: 4, service: "Facial", comment: "Glowing skin after the facial, very gentle technique.", date: "2026-03-03" },
            { id: "REV-012", customerName: "Pooja Deshmukh", rating: 5, service: "Hair Treatment", comment: "My damaged hair feels completely revitalized.", date: "2026-03-03" },
            { id: "REV-013", customerName: "Sneha Kulkarni", rating: 5, service: "Hair Coloring", comment: "Flawless highlights! Rahul really understands hair color tones.", date: "2026-03-02" },
            { id: "REV-014", customerName: "Divya Rao", rating: 3, service: "Haircut", comment: "Decent haircut, but wait time was 10 mins.", date: "2026-03-02" },
            { id: "REV-015", customerName: "Riya Mukherjee", rating: 5, service: "Premium Grooming", comment: "Complete package was worth every rupee.", date: "2026-03-01" },
            { id: "REV-016", customerName: "Tanvi Joshi", rating: 5, service: "Hair Spa", comment: "The steam treatment and massage were top notch.", date: "2026-03-01" },
            { id: "REV-017", customerName: "Meera Nambiar", rating: 4, service: "Hair Styling", comment: "Very chic blowout and curling.", date: "2026-02-28" },
            { id: "REV-018", customerName: "Kavita Reddy", rating: 5, service: "Men's Haircut", comment: "Brought my brother here, Rahul gave him a sharp corporate look.", date: "2026-02-28" },
            { id: "REV-019", customerName: "Simran Kaur", rating: 5, service: "Hair Treatment", comment: "Best hair salon in Sector 29!", date: "2026-02-27" },
            { id: "REV-020", customerName: "Preeti Agarwal", rating: 4, service: "Facial", comment: "Relaxing environment and friendly staff.", date: "2026-02-27" },
            { id: "REV-021", customerName: "Ishaan Sharma", rating: 5, service: "Beard Styling", comment: "Precision beard contouring, very happy.", date: "2026-02-26" },
            { id: "REV-022", customerName: "Kabir Bhatia", rating: 5, service: "Premium Haircut", comment: "Rahul took time to consult before cutting. 10/10.", date: "2026-02-26" },
            { id: "REV-023", customerName: "Tara Nambiar", rating: 3, service: "Hair Spa", comment: "Good service, ambient music could be softer.", date: "2026-02-25" },
            { id: "REV-024", customerName: "Aarav Patel", rating: 5, service: "Men's Haircut", comment: "Regular customer now. Consistency is always top tier.", date: "2026-02-25" },
            { id: "REV-025", customerName: "Rohan Verma", rating: 5, service: "Head Massage", comment: "Relieved my neck strain instantly.", date: "2026-02-24" },
            { id: "REV-026", customerName: "Vikas Mehta", rating: 4, service: "Hair Styling", comment: "Stayed in place all evening through the event.", date: "2026-02-24" },
            { id: "REV-027", customerName: "Aman Verma", rating: 5, service: "Premium Grooming", comment: "Full wedding grooming was done impeccably.", date: "2026-02-23" },
            { id: "REV-028", customerName: "Siddharth Malhotra", rating: 5, service: "Haircut", comment: "Clean scissors work and great styling advice.", date: "2026-02-23" },
            { id: "REV-029", customerName: "Karan Kapoor", rating: 5, service: "Hair Spa", comment: "Silky smooth hair result with Olaplex.", date: "2026-02-22" },
            { id: "REV-030", customerName: "Arjun Nair", rating: 5, service: "Beard Styling", comment: "Best beard styling in town.", date: "2026-02-22" }
        ]
    };
};

const cleanCaption = (value?: string | null) => value ? value.replace(/<[^>]*>/g, "").trim() : null;

const storyMediaRoot = path.join(process.cwd(), "public", "uploads", "stories");
const storyMediaTypes = new Map([
    ["image/jpeg", { type: "IMAGE" as const, extension: ".jpg", directory: "images" }],
    ["image/png", { type: "IMAGE" as const, extension: ".png", directory: "images" }],
    ["image/webp", { type: "IMAGE" as const, extension: ".webp", directory: "images" }],
    ["video/mp4", { type: "VIDEO" as const, extension: ".mp4", directory: "videos" }],
    ["video/quicktime", { type: "VIDEO" as const, extension: ".mov", directory: "videos" }],
    ["video/webm", { type: "VIDEO" as const, extension: ".webm", directory: "videos" }],
]);

type StoryUpload = Express.Multer.File;

const validateStoryUpload = (file: StoryUpload) => {
    const mediaType = storyMediaTypes.get(file.mimetype);
    if (!mediaType) throw { status: 400, message: "Invalid story media type" };
    const extension = path.extname(file.originalname).toLowerCase();
    const validExtensions = mediaType.type === "IMAGE"
        ? new Set([".jpg", ".jpeg", ".png", ".webp"])
        : new Set([".mp4", ".mov", ".webm"]);
    if (!validExtensions.has(extension)) throw { status: 400, message: "Story media extension does not match its MIME type" };
    const maxSize = mediaType.type === "IMAGE" ? 10 * 1024 * 1024 : 50 * 1024 * 1024;
    if (file.size > maxSize) throw { status: 413, message: "Story media exceeds the allowed file size" };
    return mediaType;
};

const storeStoryUpload = async (file: StoryUpload) => {
    const mediaType = validateStoryUpload(file);
    const fileName = `${randomUUID()}${mediaType.extension}`;
    const directory = path.join(storyMediaRoot, mediaType.directory);
    const filePath = path.join(directory, fileName);
    await fs.mkdir(directory, { recursive: true });
    await fs.writeFile(filePath, file.buffer);
    return {
        filePath,
        media: {
            type: mediaType.type,
            url: `/public/uploads/stories/${mediaType.directory}/${fileName}`,
            thumbnailUrl: null,
            fileName,
            mimeType: file.mimetype,
            fileSize: file.size,
            sortOrder: 0,
        },
    };
};

const getStaffRecordByUserId = async (userId: string) => {
    const staffRecord = await prisma.salonStaff.findFirst({
        where: { userId },
        include: {
            user: { select: { id: true, firstName: true, lastName: true, email: true } },
            salon: { select: { id: true, name: true, parentId: true, ownerId: true, parent: { select: { id: true, ownerId: true } } } }
        }
    });

    if (!staffRecord) {
        throw { status: 404, message: "Staff record not found" };
    }

    return staffRecord;
};

const staffFeedLocation = (staffRecord: Awaited<ReturnType<typeof getStaffRecordByUserId>>) => ({
    salonId: staffRecord.salon.parentId ?? staffRecord.salon.id,
    branchId: staffRecord.salon.parentId ? staffRecord.salon.id : null,
    vendorId: staffRecord.salon.parent?.ownerId ?? staffRecord.salon.ownerId,
});

const normalizeMediaPayload = async (media?: any[], mediaIds?: string[] | string) => {
    const normalizedMediaIds = Array.isArray(mediaIds)
        ? mediaIds
        : mediaIds
            ? [mediaIds]
            : [];

    const providedMedia = Array.isArray(media) ? media : [];

    if (normalizedMediaIds.length === 0 && providedMedia.length === 0) {
        throw { status: 400, message: "At least one media item is required" };
    }

    if (normalizedMediaIds.length > 0) {
        const uniqueMediaIds = [...new Set(normalizedMediaIds.filter(Boolean))];
        const existingMedia = await prisma.feedMedia.findMany({
            where: { id: { in: uniqueMediaIds } },
            orderBy: { sortOrder: "asc" }
        });

        if (existingMedia.length !== uniqueMediaIds.length) {
            throw { status: 400, message: "One or more media items were not found" };
        }

        const duplicates = existingMedia.filter((item) => item.postId || item.storyId);
        if (duplicates.length > 0) {
            throw { status: 400, message: "One or more media items are already attached to another post or story" };
        }

        return existingMedia.map((item) => ({
            id: item.id,
            type: item.type,
            url: item.url,
            thumbnailUrl: item.thumbnailUrl ?? undefined,
            fileName: item.fileName ?? undefined,
            mimeType: item.mimeType ?? undefined,
            fileSize: item.fileSize ?? undefined,
            width: item.width ?? undefined,
            height: item.height ?? undefined,
            durationSeconds: item.durationSeconds ?? undefined,
            sortOrder: item.sortOrder,
        }));
    }

    return providedMedia.map((item, index) => ({
        id: item.id ?? null,
        type: item.type,
        url: item.url,
        thumbnailUrl: item.thumbnailUrl ?? undefined,
        fileName: item.fileName ?? undefined,
        mimeType: item.mimeType ?? undefined,
        fileSize: item.fileSize ?? undefined,
        width: item.width ?? undefined,
        height: item.height ?? undefined,
        durationSeconds: item.durationSeconds ?? undefined,
        sortOrder: item.sortOrder ?? index,
    }));
};

const serializePost = (post: any, staffRecord: any) => ({
    id: post.id,
    staffId: staffRecord.id,
    staffName: `${staffRecord.user.firstName} ${staffRecord.user.lastName || ""}`.trim(),
    salonId: post.salonId,
    caption: post.caption,
    media: post.media.map((item: any) => ({
        id: item.id,
        type: item.type,
        url: item.url,
        thumbnailUrl: item.thumbnailUrl,
        fileName: item.fileName,
        mimeType: item.mimeType,
        width: item.width,
        height: item.height,
        durationSeconds: item.durationSeconds,
    })),
    mediaType: post.media.some((item: any) => item.type === "VIDEO") ? "video" : "image",
    thumbnail: post.media[0]?.thumbnailUrl || post.media[0]?.url || null,
    mediaUrl: post.media[0]?.url || null,
    createdAt: post.createdAt,
    updatedAt: post.updatedAt,
    status: post.status,
    isArchived: post.status === "ARCHIVED",
    visibility: post.visibility,
    likesCount: post._count?.likes ?? 0,
    commentsCount: post._count?.comments ?? 0,
    viewsCount: post._count?.views ?? 0,
    sharesCount: post._count?.shares ?? 0,
});

const serializeStory = (story: any, staffRecord: any) => ({
    id: story.id,
    staffId: staffRecord.id,
    staffName: `${staffRecord.user.firstName} ${staffRecord.user.lastName || ""}`.trim(),
    salonId: story.salonId,
    mediaType: story.media[0]?.type === "VIDEO" ? "video" : "image",
    mediaUrl: story.media[0]?.url || null,
    thumbnailUrl: story.media[0]?.thumbnailUrl || (story.media[0]?.type === "IMAGE" ? story.media[0]?.url : null),
    caption: story.caption,
    createdAt: story.createdAt,
    updatedAt: story.updatedAt,
    expiresAt: story.expiresAt,
    status: story.status,
    isExpired: new Date(story.expiresAt) <= new Date(),
});

export const getMyPostsService = async (userId: string, query: any = {}) => {
    const staffRecord = await getStaffRecordByUserId(userId);
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
    const type = String(query.type || "").toLowerCase();

    const where: any = {
        staffId: staffRecord.id,
        ...(type === "image" ? { media: { some: { type: "IMAGE" } } } : {}),
        ...(type === "video" ? { media: { some: { type: "VIDEO" } } } : {}),
    };

    const [items, total] = await Promise.all([
        prisma.feedPost.findMany({
            where,
            include: {
                media: true,
                _count: { select: { likes: true, comments: true, views: true, shares: true } },
            },
            orderBy: { createdAt: "desc" },
            skip: (page - 1) * limit,
            take: limit,
        }),
        prisma.feedPost.count({ where }),
    ]);

    return {
        posts: items.map((post) => serializePost(post, staffRecord)),
        pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
        },
    };
};

export const createMyPostService = async (userId: string, payload: any) => {
    const staffRecord = await getStaffRecordByUserId(userId);
    const location = staffFeedLocation(staffRecord);
    const mediaItems = await normalizeMediaPayload(payload.media, payload.mediaIds || payload.mediaId);

    const post = await prisma.feedPost.create({
        data: {
            vendorId: location.vendorId,
            staffId: staffRecord.id,
            salonId: location.salonId,
            branchId: location.branchId,
            caption: cleanCaption(payload.caption),
            visibility: payload.visibility || "PUBLIC",
            status: payload.status || "PUBLISHED",
            publishedAt: payload.status === "DRAFT" || payload.status === "ARCHIVED" ? null : new Date(),
            createdBy: userId,
        },
        include: { media: true }
    });

    if (mediaItems.length > 0) {
        await prisma.feedMedia.updateMany({
            where: { id: { in: mediaItems.map((item) => item.id).filter(Boolean) } },
            data: { postId: post.id, storyId: null },
        });
    }

    const created = await prisma.feedPost.findUnique({
        where: { id: post.id },
        include: {
            media: true,
            _count: { select: { likes: true, comments: true, views: true, shares: true } },
        }
    });

    return serializePost(created!, staffRecord);
};

export const updateMyPostService = async (userId: string, postId: string, payload: any) => {
    const staffRecord = await getStaffRecordByUserId(userId);
    const existingPost = await prisma.feedPost.findUnique({
        where: { id: postId },
        select: { id: true, staffId: true, media: true }
    });

    if (!existingPost) {
        throw { status: 404, message: "Feed post not found" };
    }

    if (existingPost.staffId !== staffRecord.id) {
        throw { status: 403, message: "You can only update your own posts" };
    }

    const mediaItems = payload.mediaIds || payload.mediaId || payload.media
        ? await normalizeMediaPayload(payload.media, payload.mediaIds || payload.mediaId)
        : null;

    if (mediaItems && mediaItems.length > 0) {
        const currentMediaIds = existingPost.media.map((item) => item.id);
        if (currentMediaIds.length > 0) {
            await prisma.feedMedia.updateMany({
                where: { id: { in: currentMediaIds } },
                data: { postId: null }
            });
        }

        await prisma.feedMedia.updateMany({
            where: { id: { in: mediaItems.map((item) => item.id).filter(Boolean) } },
            data: { postId: existingPost.id, storyId: null }
        });
    }

    const updatedPost = await prisma.feedPost.update({
        where: { id: postId },
        data: {
            ...(payload.caption !== undefined ? { caption: cleanCaption(payload.caption) } : {}),
            ...(payload.visibility ? { visibility: payload.visibility } : {}),
            ...(payload.status ? { status: payload.status } : {}),
            ...(payload.status === "PUBLISHED" ? { publishedAt: new Date() } : {}),
        },
        include: {
            media: true,
            _count: { select: { likes: true, comments: true, views: true, shares: true } },
        }
    });

    return serializePost(updatedPost, staffRecord);
};

export const deleteMyPostService = async (userId: string, postId: string) => {
    const staffRecord = await getStaffRecordByUserId(userId);
    const existingPost = await prisma.feedPost.findUnique({
        where: { id: postId },
        select: { id: true, staffId: true }
    });

    if (!existingPost) {
        throw { status: 404, message: "Feed post not found" };
    }

    if (existingPost.staffId !== staffRecord.id) {
        throw { status: 403, message: "You can only delete your own posts" };
    }

    return prisma.feedPost.update({
        where: { id: postId },
        data: {
            status: "DELETED",
            deletedAt: new Date(),
            deletedBy: userId,
        },
    });
};

export const archiveMyPostService = async (userId: string, postId: string) => {
    const staffRecord = await getStaffRecordByUserId(userId);
    const existingPost = await prisma.feedPost.findUnique({
        where: { id: postId },
        select: { id: true, staffId: true }
    });

    if (!existingPost) {
        throw { status: 404, message: "Feed post not found" };
    }

    if (existingPost.staffId !== staffRecord.id) {
        throw { status: 403, message: "You can only archive your own posts" };
    }

    return prisma.feedPost.update({
        where: { id: postId },
        data: { status: "ARCHIVED" },
    });
};

export const getMyStoriesService = async (userId: string, query: any = {}) => {
    const staffRecord = await getStaffRecordByUserId(userId);
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));

    const where: any = {
        staffId: staffRecord.id,
        status: "PUBLISHED",
        expiresAt: { gt: new Date() },
    };

    const [items, total] = await Promise.all([
        prisma.feedStory.findMany({
            where,
            include: { media: true },
            orderBy: { createdAt: "desc" },
            skip: (page - 1) * limit,
            take: limit,
        }),
        prisma.feedStory.count({ where }),
    ]);

    return {
        stories: items.map((story) => serializeStory(story, staffRecord)),
        pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
        },
    };
};

export const createMyStoryService = async (userId: string, payload: any, upload?: StoryUpload) => {
    const staffRecord = await getStaffRecordByUserId(userId);
    const location = staffFeedLocation(staffRecord);
    const storedUpload = upload ? await storeStoryUpload(upload) : null;
    try {
        const mediaItems: any[] = storedUpload
            ? [storedUpload.media]
            : await normalizeMediaPayload(payload.media, payload.mediaIds || payload.mediaId);
        const now = new Date();
        const created = await prisma.$transaction(async (tx) => {
            const story = await tx.feedStory.create({
                data: {
                    vendorId: location.vendorId,
                    staffId: staffRecord.id,
                    salonId: location.salonId,
                    branchId: location.branchId,
                    caption: cleanCaption(payload.caption),
                    status: "PUBLISHED",
                    publishedAt: now,
                    expiresAt: new Date(now.getTime() + 24 * 60 * 60 * 1000),
                    createdBy: userId,
                    ...(storedUpload ? { media: { create: mediaItems } } : {}),
                },
                include: { media: true },
            });
            if (!storedUpload) {
                const result = await tx.feedMedia.updateMany({
                    where: { id: { in: mediaItems.map((item) => item.id).filter(Boolean) }, storyId: null, postId: null },
                    data: { storyId: story.id, postId: null },
                });
                if (result.count !== mediaItems.length) throw { status: 400, message: "One or more media items are already attached to another post or story" };
            }
            return tx.feedStory.findUniqueOrThrow({ where: { id: story.id }, include: { media: true } });
        });
        return serializeStory(created, staffRecord);
    } catch (error) {
        if (storedUpload) await fs.rm(storedUpload.filePath, { force: true }).catch(() => undefined);
        throw error;
    }
};

export const updateMyStoryService = async (userId: string, storyId: string, payload: any, upload?: StoryUpload) => {
    const staffRecord = await getStaffRecordByUserId(userId);
    const existingStory = await prisma.feedStory.findUnique({
        where: { id: storyId },
        select: { id: true, staffId: true, media: true }
    });

    if (!existingStory) {
        throw { status: 404, message: "Feed story not found" };
    }

    if (existingStory.staffId !== staffRecord.id) {
        throw { status: 403, message: "You can only update your own stories" };
    }

    const storedUpload = upload ? await storeStoryUpload(upload) : null;
    try {
        const mediaItems: any[] | null = storedUpload
            ? [storedUpload.media]
            : (payload.mediaIds || payload.mediaId || payload.media
                ? await normalizeMediaPayload(payload.media, payload.mediaIds || payload.mediaId)
                : null);
        const updatedStory = await prisma.$transaction(async (tx) => {
            if (mediaItems && mediaItems.length > 0) {
                await tx.feedMedia.deleteMany({ where: { storyId: existingStory.id } });
                if (storedUpload) {
                    await tx.feedMedia.create({ data: { ...mediaItems[0], storyId: existingStory.id } });
                } else {
                    const result = await tx.feedMedia.updateMany({
                        where: { id: { in: mediaItems.map((item) => item.id).filter(Boolean) }, storyId: null, postId: null },
                        data: { storyId: existingStory.id, postId: null },
                    });
                    if (result.count !== mediaItems.length) throw { status: 400, message: "One or more media items are already attached to another post or story" };
                }
            }
            return tx.feedStory.update({
                where: { id: storyId },
                data: {
                    ...(payload.caption !== undefined ? { caption: cleanCaption(payload.caption) } : {}),
                    ...(payload.status ? { status: payload.status } : {}),
                },
                include: { media: true },
            });
        });
        return serializeStory(updatedStory, staffRecord);
    } catch (error) {
        if (storedUpload) await fs.rm(storedUpload.filePath, { force: true }).catch(() => undefined);
        throw error;
    }
};

export const deleteMyStoryService = async (userId: string, storyId: string) => {
    const staffRecord = await getStaffRecordByUserId(userId);
    const existingStory = await prisma.feedStory.findUnique({
        where: { id: storyId },
        select: { id: true, staffId: true }
    });

    if (!existingStory) {
        throw { status: 404, message: "Feed story not found" };
    }

    if (existingStory.staffId !== staffRecord.id) {
        throw { status: 403, message: "You can only delete your own stories" };
    }

    return prisma.feedStory.update({
        where: { id: storyId },
        data: {
            status: "DELETED",
            deletedAt: new Date(),
            deletedBy: userId,
        },
    });
};

export const getMyPortfolioPostsService = async (userId: string) => {
    return getMyPostsService(userId, { page: 1, limit: 20 });
};

const supportTicketStore = new Map<string, any[]>();
const notificationStore = new Map<string, any[]>();

const buildDefaultNotifications = (userName: string) => {
    const now = new Date();
    return [
        {
            id: "NOTIF-001",
            title: "New appointment assigned",
            message: `You have a new Hair Spa appointment assigned for 05:30 PM today, ${userName}.`,
            time: "Today at 09:15 AM",
            timestamp: new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString(),
            type: "APPOINTMENT",
            isRead: false
        },
        {
            id: "NOTIF-002",
            title: "Appointment completed successfully",
            message: "Premium Haircut for Aarav Patel marked as completed. ₹800 added to today's earnings.",
            time: "Today at 11:20 AM",
            timestamp: new Date(now.getTime() - 1 * 60 * 60 * 1000).toISOString(),
            type: "EARNING",
            isRead: false
        },
        {
            id: "NOTIF-003",
            title: "Commission payment processed",
            message: "Payout of ₹15,000 for period 6-15 Mar 2026 has been credited to your account.",
            time: "Yesterday",
            timestamp: subDays(now, 1).toISOString(),
            type: "COMMISSION",
            isRead: true
        },
        {
            id: "NOTIF-004",
            title: "New customer review received",
            message: `${userName} received a 5-star rating from Aarav Patel for a premium haircut.`,
            time: "2 days ago",
            timestamp: subDays(now, 2).toISOString(),
            type: "REVIEW",
            isRead: true
        },
        {
            id: "NOTIF-005",
            title: "Upcoming appointment reminder",
            message: "You have 4 appointments scheduled for tomorrow starting at 10:00 AM.",
            time: "Tomorrow",
            timestamp: new Date(now.getTime() + 12 * 60 * 60 * 1000).toISOString(),
            type: "REMINDER",
            isRead: false
        },
        {
            id: "NOTIF-006",
            title: "Your monthly commission has been updated",
            message: "Your current month commission reached ₹37,500 across 156 completed services.",
            time: "Today at 08:30 AM",
            timestamp: new Date(now.getTime() - 3 * 60 * 60 * 1000).toISOString(),
            type: "COMMISSION",
            isRead: false
        }
    ];
};

const buildDefaultSupportTickets = (userName: string) => [
    {
        id: "TKT-1001",
        subject: "Payout timing clarification",
        category: "PAYMENTS",
        priority: "MEDIUM",
        status: "RESOLVED",
        message: `Hello ${userName}, I would like to understand the current payout schedule and pending commission amount.`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    },
    {
        id: "TKT-1002",
        subject: "Schedule adjustment request",
        category: "SCHEDULE",
        priority: "LOW",
        status: "OPEN",
        message: `Hello ${userName}, I would like to request a schedule adjustment for next Saturday evening.`,
        createdAt: subDays(new Date(), 2).toISOString(),
        updatedAt: subDays(new Date(), 1).toISOString()
    }
];

const getRequiredStaffRecord = async (userId: string) => {
    let staffRecords = await prisma.salonStaff.findMany({
        where: { userId, isActive: true },
        orderBy: { id: "asc" },
        include: { user: { select: { firstName: true, lastName: true } }, bankDetails: true },
    });
    if (staffRecords.length === 0) {
        staffRecords = await prisma.salonStaff.findMany({
            where: { userId },
            orderBy: { id: "asc" },
            include: { user: { select: { firstName: true, lastName: true } }, bankDetails: true },
        });
    }
    const staffRecord = staffRecords.find((record) => record.bankDetails) || staffRecords[0];
    if (!staffRecord) throw { status: 404, message: "Staff record not found" };
    return staffRecord;
};

const maskAccountNumber = (accountNumber: string) => {
    if (!accountNumber) return "********0000";
    const digits = accountNumber.replace(/\D/g, "");
    const last4 = digits.length >= 4 ? digits.slice(-4) : (accountNumber.slice(-4) || "0000");
    return `********${last4}`;
};

const safeDecrypt = (ciphertext?: string | null): string | undefined => {
    if (!ciphertext) return undefined;
    try {
        return decrypt(ciphertext);
    } catch {
        return undefined;
    }
};

const serializeBankDetails = (details: any) => {
    const rawNumber = safeDecrypt(details.encryptedAccountNumber);
    return {
        id: details.id,
        accountHolderName: details.accountHolderName,
        bankName: details.bankName,
        accountNumber: maskAccountNumber(rawNumber || "0000"),
        ifscCode: details.ifscCode,
        bankCode: details.bankCode,
        accountType: details.accountType,
        branchName: details.branchName,
        upiId: details.upiId,
        upiName: details.upiName,
        upiUri: details.upiUri,
        qrCode: details.qrCode,
        isVerified: details.isVerified,
        hasBankDetails: true,
        hasQrCode: Boolean(details.qrCode),
        createdAt: details.createdAt,
        updatedAt: details.updatedAt,
    };
};

export const getMyBankDetailsService = async (userId: string) => {
    const staffRecord = await getRequiredStaffRecord(userId);
    const details = await prisma.staffBankDetails.findUnique({ where: { staffId: staffRecord.id } });
    return details ? serializeBankDetails(details) : null;
};

export const updateMyBankDetailsService = async (userId: string, payload: StaffBankDetailsInput) => {
    const staffRecord = await getRequiredStaffRecord(userId);
    const current = await prisma.staffBankDetails.findUnique({ where: { staffId: staffRecord.id } });
    if (!current && (!payload.accountHolderName || !payload.bankName || !payload.accountNumber || !payload.ifscCode || !payload.accountType)) {
        throw { status: 400, message: "Account holder, bank, account number, IFSC, and account type are required" };
    }
    const accountNumber = payload.accountNumber;
    const existingAccountNumber = safeDecrypt(current?.encryptedAccountNumber);
    const isMasked = Boolean(accountNumber && /^\*{4,}\d{4}$/.test(accountNumber));
    if (!accountNumber && !existingAccountNumber) throw { status: 400, message: "Account number is required" };
    if (isMasked && !existingAccountNumber) throw { status: 400, message: "A real account number is required" };

    const ifscCode = (payload.ifscCode || current!.ifscCode).trim().toUpperCase();
    const finalAccountNumber = isMasked ? existingAccountNumber! : accountNumber || existingAccountNumber!;
    const accountHolderName = payload.accountHolderName || current?.accountHolderName || `${staffRecord.user.firstName} ${staffRecord.user.lastName || ""}`.trim();
    const bankName = payload.bankName || current?.bankName || "Unknown Bank";
    const accountType = (payload.accountType || current?.accountType || "OTHER") as any;
    const saved = await prisma.staffBankDetails.upsert({
        where: { staffId: staffRecord.id },
        create: {
            staffId: staffRecord.id,
            accountHolderName,
            bankName,
            encryptedAccountNumber: encrypt(finalAccountNumber),
            ifscCode,
            bankCode: ifscCode.substring(0, 4),
            accountType,
            branchName: payload.branchName ?? null,
            upiId: payload.upiId ?? null,
            upiName: payload.upiName ?? null,
        },
        update: {
            accountHolderName,
            bankName,
            encryptedAccountNumber: isMasked || !accountNumber ? current!.encryptedAccountNumber : encrypt(finalAccountNumber),
            ifscCode,
            bankCode: ifscCode.substring(0, 4),
            accountType,
            branchName: payload.branchName === undefined ? current?.branchName : payload.branchName,
            upiId: payload.upiId === undefined ? current?.upiId : payload.upiId,
            upiName: payload.upiName === undefined ? current?.upiName : payload.upiName,
            upiUri: null,
            qrCode: null,
        },
    });
    return serializeBankDetails(saved);
};

export const deleteMyBankDetailsService = async (userId: string) => {
    const staffRecord = await getRequiredStaffRecord(userId);
    await prisma.staffBankDetails.deleteMany({ where: { staffId: staffRecord.id } });
};

export const generateMyBankDetailsQrService = async (userId: string) => {
    const staffRecord = await getRequiredStaffRecord(userId);
    const details = await prisma.staffBankDetails.findUnique({ where: { staffId: staffRecord.id } });
    if (!details?.upiId) throw { status: 400, message: "UPI ID is required to generate QR code" };
    const upiUri = `upi://pay?pa=${encodeURIComponent(details.upiId)}&pn=${encodeURIComponent(details.upiName || details.accountHolderName)}`;
    const qrCode = await QRCode.toDataURL(upiUri);
    await prisma.staffBankDetails.update({ where: { id: details.id }, data: { upiUri, qrCode } });
    return { upiId: details.upiId, upiUri, qrCode };
};

export const getMySupportFaqsService = async () => {
    return [
        {
            id: "FAQ-001",
            question: "How do I receive my commissions?",
            answer: "Your monthly commission is processed automatically on the 1st of every month for completed services in the previous calendar month.",
            category: "PAYMENTS"
        },
        {
            id: "FAQ-002",
            question: "How do I update my schedule?",
            answer: "Use the schedule section in the app or contact your salon manager for changes to your weekly working hours.",
            category: "SCHEDULE"
        },
        {
            id: "FAQ-003",
            question: "Where can I view appointment details?",
            answer: "Open the Appointments tab from the Staff dashboard to view today's, upcoming, and completed appointments.",
            category: "APPOINTMENTS"
        },
        {
            id: "FAQ-004",
            question: "How can I check my earnings?",
            answer: "The Earnings API provides daily, weekly, and monthly summaries along with recent completed services and commission details.",
            category: "EARNINGS"
        }
    ];
};

export const getMySupportTicketsService = async (userId: string) => {
    const staffRecord = await prisma.salonStaff.findFirst({ where: { userId }, select: { user: { select: { firstName: true, lastName: true } } } });
    const userName = staffRecord ? `${staffRecord.user.firstName} ${staffRecord.user.lastName || ""}`.trim() : "Staff";

    const tickets = supportTicketStore.get(userId) || buildDefaultSupportTickets(userName);
    supportTicketStore.set(userId, tickets);

    return tickets;
};

export const createMySupportTicketService = async (userId: string, payload: any) => {
    const staffRecord = await prisma.salonStaff.findFirst({ where: { userId }, include: { user: { select: { firstName: true, lastName: true } } } });
    if (!staffRecord) {
        throw { status: 404, message: "Staff record not found" };
    }

    const following = supportTicketStore.get(userId) || buildDefaultSupportTickets(`${staffRecord.user.firstName} ${staffRecord.user.lastName || ""}`.trim());

    const ticket = {
        id: `TKT-${Date.now()}`,
        subject: payload?.subject || "General support request",
        category: payload?.category || "GENERAL",
        priority: payload?.priority || "MEDIUM",
        status: "OPEN",
        message: payload?.message || "",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };

    following.unshift(ticket);
    supportTicketStore.set(userId, following);
    return ticket;
};

export const markMyNotificationReadService = async (userId: string, notificationId: string) => {
    const staffRecord = await prisma.salonStaff.findFirst({ where: { userId }, select: { user: { select: { firstName: true, lastName: true } } } });
    const userName = staffRecord ? `${staffRecord.user.firstName} ${staffRecord.user.lastName || ""}`.trim() : "Staff";

    const notifications = notificationStore.get(userId) || buildDefaultNotifications(userName);
    const updated = notifications.map((notification) =>
        notification.id === notificationId ? { ...notification, isRead: true } : notification
    );

    notificationStore.set(userId, updated);

    const updatedNotification = updated.find((notification) => notification.id === notificationId);
    if (!updatedNotification) {
        throw { status: 404, message: "Notification not found" };
    }

    return updatedNotification;
};

export const markAllMyNotificationsReadService = async (userId: string) => {
    const staffRecord = await prisma.salonStaff.findFirst({ where: { userId }, select: { user: { select: { firstName: true, lastName: true } } } });
    const userName = staffRecord ? `${staffRecord.user.firstName} ${staffRecord.user.lastName || ""}`.trim() : "Staff";

    const notifications = notificationStore.get(userId) || buildDefaultNotifications(userName);
    const updated = notifications.map((notification) => ({ ...notification, isRead: true }));

    notificationStore.set(userId, updated);
    return updated;
};

export const getMyNotificationsService = async (userId: string) => {
    const staffRecord = await prisma.salonStaff.findFirst({ where: { userId }, select: { user: { select: { firstName: true, lastName: true } } } });
    const userName = staffRecord ? `${staffRecord.user.firstName} ${staffRecord.user.lastName || ""}`.trim() : "Staff";

    const notifications = notificationStore.get(userId) || buildDefaultNotifications(userName);
    notificationStore.set(userId, notifications);

    return notifications;
};
