import { prisma } from "../../infrastructure/database/prisma";

export const createSalon = (data: any) => {
    return prisma.salon.create({ data });
};

export const getSalonsByOwner = (ownerId: string) => {
    return prisma.salon.findMany({
        where: { ownerId },
        include: { 
            contacts: true, 
            address: true,
            branches: {
                include: { contacts: true, address: true, staff: true }
            },
            staff: true
        }
    });
};

export const getSalonById = (id: string) => {
    return prisma.salon.findUnique({
        where: { id },
        include: { contacts: true, address: true }
    });
};

export const findRoleByName = (name: string) => {
    return prisma.role.findUnique({
        where: { name },
    });
};

export const assignRole = (userId: string, roleId: string) => {
    return prisma.userRole.upsert({
        where: {
            userId_roleId: { userId, roleId },
        },
        update: {},
        create: { userId, roleId },
    });
};