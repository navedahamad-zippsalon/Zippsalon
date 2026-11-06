import { prisma } from "../../infrastructure/database/prisma";

export const updateProfileService = async (userId: string, data: any) => {
    // email and phone cannot be changed as per user request
    const { email, phone, countryCode, ...updateData } = data;
    
    return prisma.user.update({
        where: { id: userId },
        data: {
            firstName: updateData.firstName,
            lastName: updateData.lastName,
            gender: updateData.gender,
            dob: updateData.dob ? new Date(updateData.dob) : undefined,
        },
        select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            countryCode: true,
            gender: true,
            dob: true,
        }
    });
};

export const getProfileCompletionService = async (userId: string) => {
    const user = await prisma.user.findUnique({
        where: { id: userId },
        include: { roles: { include: { role: true } } }
    });
    if (!user) throw { status: 404, message: "User not found" };

    const roles = user.roles.map(r => r.role.name);
    
    // User fields: firstName, lastName, email, phone, gender, dob
    const userFields = ['firstName', 'lastName', 'email', 'phone', 'gender', 'dob'];
    let filled = userFields.filter(field => (user as any)[field]).length;
    let total = userFields.length;

    if (roles.includes('VENDOR')) {
        const salon = await prisma.salon.findFirst({
            where: { ownerId: userId },
            include: { address: true, contacts: true, images: true }
        });

        if (salon) {
            const salonFields = ['name', 'description', 'timings'];
            filled += salonFields.filter(field => (salon as any)[field]).length;
            total += salonFields.length;

            // Address
            total += 1;
            if (salon.address) filled += 1;

            // Contacts
            total += 1;
            if (salon.contacts && salon.contacts.length > 0) filled += 1;

            // Images
            total += 1;
            if (salon.images && salon.images.length > 0) filled += 1;

            // Pricing/Wait
            total += 1;
            if (salon.avgPrice || salon.avgWaitTime) filled += 1;
        } else {
            // If vendor but no salon yet, completion is lower
            total += 5; // placeholder for salon fields
        }
    }

    const percentage = Math.round((filled / total) * 100);
    return { percentage };
};

export const updateMySalonService = async (userId: string, data: any) => {
    const salon = await prisma.salon.findFirst({ where: { ownerId: userId } });
    if (!salon) throw { status: 404, message: "Salon not found" };

    return prisma.$transaction(async (tx) => {
        const updatedSalon = await tx.salon.update({
            where: { id: salon.id },
            data: {
                name: data.name,
                description: data.description,
                avgPrice: data.avgPrice,
                avgWaitTime: data.avgWaitTime,
                timings: data.timings,
                isProfileCompleted: true,
                address: data.address ? {
                    upsert: {
                        create: (() => {
                            const { id, salonId, ...rest } = data.address;
                            return rest;
                        })(),
                        update: (() => {
                            const { id, salonId, ...rest } = data.address;
                            return rest;
                        })()
                    }
                } : undefined,
            }
        });

        if (data.contacts) {
            await tx.salonContact.deleteMany({ where: { salonId: salon.id } });
            if (data.contacts.length > 0) {
                await tx.salonContact.createMany({
                    data: data.contacts.map((c: any) => ({ ...c, salonId: salon.id }))
                });
            }
        }

        if (data.images) {
            await tx.salonImage.deleteMany({ where: { salonId: salon.id } });
            if (data.images.length > 0) {
                await tx.salonImage.createMany({
                    data: data.images.slice(0, 10).map((url: string) => ({ url, salonId: salon.id }))
                });
            }
        }

        return tx.salon.findUnique({
            where: { id: salon.id },
            include: { address: true, contacts: true, images: true }
        });
    });
};

export const getMySalonsService = async (userId: string) => {
    // A user can be an owner (VENDOR) or staff (OPERATOR/STAFF)
    // 1. Check if user is owner of any salon
    const ownedSalons = await prisma.salon.findMany({
        where: { ownerId: userId },
        include: { address: true, contacts: true, images: true, branches: true }
    });

    if (ownedSalons.length > 0) {
        return ownedSalons;
    }

    // 2. If not owner, check where they are staff
    const staffSalons = await prisma.salonStaff.findMany({
        where: { userId },
        include: {
            salon: {
                include: { address: true, contacts: true, images: true }
            }
        }
    });

    return staffSalons.map(s => s.salon);
};

export const getMySalonService = async (userId: string) => {
    return prisma.salon.findFirst({
        where: { ownerId: userId },
        include: { address: true, contacts: true, images: true }
    });
};
