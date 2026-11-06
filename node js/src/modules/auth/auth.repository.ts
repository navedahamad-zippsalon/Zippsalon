import { prisma } from "../../infrastructure/database/prisma";

export const findUserByEmail = (email: string) => {
    return prisma.user.findUnique({
        where: { email },
        include: {
            roles: {
                include: {
                    role: true,
                },
            },
        },
    });
};

export const createUser = (data: any) => {
    return prisma.user.create({
        data,
    });
};

export const assignRoleToUser = (userId: string, roleId: string) => {
    return prisma.userRole.create({
        data: {
            userId,
            roleId,
        },
    });
};

export const findRoleByName = (name: string) => {
    return prisma.role.findUnique({
        where: { name },
    });
};