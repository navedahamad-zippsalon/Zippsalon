import { prisma } from "../../infrastructure/database/prisma";
import { APP_CONSTANTS } from "../constants/app.constants";
import { isVendorUser } from "./role.util";

export const hasSalonPermission = async (salonId: string, userId: string, userRoles?: string[]) => {
    if (userRoles?.includes(APP_CONSTANTS.ROLES.ADMIN) || userRoles?.includes("SUPER_ADMIN")) return true;

    // Vendor ownership is checked below so a vendor with a staff membership
    // is not constrained to that membership. Other salon users, including
    // managers and custom-role users, must have an active explicit membership.
    if (!isVendorUser(userRoles ?? []) && userRoles?.length) {
        const staffMembership = await prisma.salonStaff.findFirst({
            where: { salonId, userId, isActive: true },
            select: { id: true },
        });
        return Boolean(staffMembership);
    }

    const salon = await prisma.salon.findUnique({
        where: { id: salonId },
        select: {
            id: true,
            ownerId: true,
            parent: {
                select: { ownerId: true }
            }
        }
    });
    
    if (!salon) return false;
    if (salon.ownerId === userId) return true;
    if (salon.parent && salon.parent.ownerId === userId) return true;
    
    return false;
};
