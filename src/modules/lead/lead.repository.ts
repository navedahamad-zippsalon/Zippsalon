import { prisma } from "../../infrastructure/database/prisma";

export const createLead = (data: any) => {
    return prisma.lead.create({
        data,
    });
};

export const getAllLeads = async (options: {
    page: number;
    limit: number;
    search: string;
    sortBy: string;
    sortOrder: string;
}) => {
    const { page, limit, search, sortBy, sortOrder } = options;
    const skip = (page - 1) * limit;

    const where = search ? {
        OR: [
            { name: { contains: search, mode: 'insensitive' as any } },
            { email: { contains: search, mode: 'insensitive' as any } },
            { phone: { contains: search, mode: 'insensitive' as any } },
        ]
    } : {};

    const [leads, total] = await Promise.all([
        prisma.lead.findMany({
            where,
            orderBy: { [sortBy]: sortOrder },
            skip,
            take: limit,
        }),
        prisma.lead.count({ where })
    ]);

    return {
        leads,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
    };
};

export const updateLeadStatus = (id: string, status: any) => {
    return prisma.lead.update({
        where: { id },
        data: { status },
    });
};
