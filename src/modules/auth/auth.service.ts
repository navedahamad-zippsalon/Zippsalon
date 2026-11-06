import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import {
    findUserByEmail,
    createUser,
    assignRoleToUser,
    findRoleByName,
} from "./auth.repository";
import { prisma } from "../../infrastructure/database/prisma";
import { getEffectivePermissions } from "../rbac/rbac.service";
import { currentSubscription, ensureDefaultVendorSubscription } from "../subscription/subscription.service";

const JWT_SECRET = process.env.JWT_SECRET as string;

export const registerUser = async (data: any) => {
    const existing = await findUserByEmail(data.email);
    if (existing) {
        throw { status: 400, message: "User already exists", messageKey: "auth.user_exists" };
    }
    const existingPhone = await prisma.user.findFirst({
        where: { phone: data.phone, countryCode: data.countryCode },
        select: { id: true },
    });
    if (existingPhone) throw { status: 400, message: "A user with this phone number already exists", messageKey: "auth.phone_exists" };

    const hashedPassword = await bcrypt.hash(data.password, 10);
    const {
        salonName,
        salonType,
        category,
        description,
        salonImage,
        address,
        addressLine1,
        addressLine2,
        city,
        state,
        country,
        postalCode,
        confirmPassword: _confirmPassword,
        source: requestedSource,
        ...userData
    } = data;
    const source = requestedSource ?? (salonName ? "WEBSITE" : "ADMIN");

    return prisma.$transaction(async (tx) => {
        const user = await tx.user.create({
            data: { ...userData, password: hashedPassword, source },
        });
        const roleName = source === "WEBSITE" ? "VENDOR" : "CUSTOMER";
        const role = await tx.role.upsert({ where: { name: roleName }, update: {}, create: { name: roleName } });
        await tx.userRole.create({ data: { userId: user.id, roleId: role.id } });

        let salonId: string | undefined;
        if (source === "WEBSITE" && salonName) {
            const salon = await tx.salon.create({
                data: {
                    name: salonName,
                    salonType: salonType ?? category,
                    description,
                    ownerId: user.id,
                    timings: {
                        monday: { open: "09:00", close: "21:00", isOpen: true }, tuesday: { open: "09:00", close: "21:00", isOpen: true },
                        wednesday: { open: "09:00", close: "21:00", isOpen: true }, thursday: { open: "09:00", close: "21:00", isOpen: true },
                        friday: { open: "09:00", close: "21:00", isOpen: true }, saturday: { open: "09:00", close: "21:00", isOpen: true },
                        sunday: { open: "09:00", close: "21:00", isOpen: false },
                    },
                    isActive: true, isProfileCompleted: false,
                },
            });
            salonId = salon.id;
            if (salonImage) await tx.salonImage.create({ data: { salonId, url: salonImage } });
            const line1 = addressLine1 ?? address;
            if (line1 && city && state && country && postalCode) {
                await tx.address.create({
                    data: {
                        salonId,
                        line1,
                        line2: addressLine2,
                        city,
                        state,
                        country,
                        pincode: postalCode,
                    },
                });
            }
        }

        if (roleName === "VENDOR") await ensureDefaultVendorSubscription(user.id, salonId, tx);
        return {
            id: user.id,
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email,
            phone: user.phone,
            countryCode: user.countryCode,
            roles: [roleName],
            salonId: salonId ?? null,
        };
    });
};

export const loginUser = async (email: string, passwordString: string) => {
    const user = await prisma.user.findUnique({
        where: { email },
        include: { roles: { where: { role: { isActive: true } }, include: { role: true } } },
    });
    if (!user) {
        throw { status: 400, message: "Invalid credentials", messageKey: "errors.invalid_credentials" };
    }

    const isMatch = await bcrypt.compare(passwordString, user.password);
    if (!isMatch) {
        throw { status: 400, message: "Invalid credentials", messageKey: "errors.invalid_credentials" };
    }

    // Do not issue a usable token for a disabled account.  Besides being safer,
    // this prevents a successful login followed immediately by a confusing 403
    // from the authentication middleware.
    if (!user.isActive) {
        throw { status: 403, message: "Your account is inactive. Please contact an administrator.", messageKey: "errors.account_inactive" };
    }

    const roles = user.roles.map((r) => r.role.name);
    let salonId: string | undefined;

    // Also repairs vendors created before automatic onboarding existed.  This
    // never replaces a valid paid/current subscription.
    if (roles.includes("VENDOR")) await ensureDefaultVendorSubscription(user.id);

    if (roles.includes('VENDOR') && !roles.includes('ADMIN')) {
        const headOffice = await prisma.salon.findFirst({
            where: { ownerId: user.id, parentId: null, isActive: true }
        });

        if (!headOffice) {
            // A branch owner may legitimately be a vendor without owning a head office.
            const anyActiveSalon = await prisma.salon.findFirst({
                where: { ownerId: user.id, isActive: true }
            });
            if (!anyActiveSalon) {
                // WEBSITE registration allows a vendor to complete their salon profile
                // after signing in.  Do not lock that new vendor out before they have
                // had a chance to create their first salon.  A vendor with one or more
                // salons, none of which are active, remains blocked as before.
                const ownedSalonCount = await prisma.salon.count({
                    where: { ownerId: user.id },
                });
                if (ownedSalonCount > 0) {
                    throw { status: 403, message: "Your salon account has been deactivated. Please contact support.", messageKey: "auth.salon_inactive" };
                }
            } else {
                salonId = anyActiveSalon.id;
            }
        } else {
            salonId = headOffice.id;
        }
    }
    if (!roles.includes("VENDOR") && !roles.includes("ADMIN") && !roles.includes("SUPER_ADMIN")) {
        const membership = await prisma.salonStaff.findFirst({
            where: { userId: user.id, isActive: true },
            orderBy: { createdAt: "asc" },
            select: { salonId: true },
        });
        salonId = membership?.salonId;
    }

    const trackingSessionId = crypto.randomUUID();
    const token = jwt.sign(
        {
            userId: user.id,
            roles,
            salonId, // optionally include in token
            trackingSessionId,
        },
        JWT_SECRET,
        { expiresIn: "7d" }
    );

    // Fetch profile completion status if salonId exists
    // A vendor with no salon is in the onboarding flow, not unauthorized.
    let isProfileCompleted = !roles.includes('VENDOR');
    if (salonId) {
        const salon = await prisma.salon.findUnique({ where: { id: salonId } });
        isProfileCompleted = salon?.isProfileCompleted ?? true;
    }

    const [permissions, subscription] = await Promise.all([
        getEffectivePermissions(user.id, salonId),
        roles.includes("VENDOR") ? currentSubscription(user.id) : Promise.resolve(null),
    ]);

    return {
        trackingSessionId,
        token,
        accessToken: token,
        user: {
            id: user.id,
            // Keep the login response consistent with /auth/me.  Clients use
            // this data immediately after login to decide whether a route is
            // accessible, before they have necessarily called /auth/me.
            userId: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            phone: user.phone,
            countryCode: user.countryCode,
            isActive: user.isActive,
            roles,
            role: roles[0] ?? null,
            permissions,
            vendorId: roles.includes("VENDOR") ? user.id : null,
            salonId,
            isProfileCompleted,
            onboardingRequired: roles.includes("VENDOR") && !salonId,
            subscription,
        },
        role: roles[0] ?? null,
        permissions,
        isActive: user.isActive,
        vendorId: roles.includes("VENDOR") ? user.id : null,
        salonId,
        onboardingRequired: roles.includes("VENDOR") && !salonId,
        subscription,
    };
};

export const forgotPassword = async (email: string) => {
    const user = await prisma.user.findUnique({ where: { email } });

    if (user) {
        const token = crypto.randomBytes(32).toString("hex");
        const expiresAt = new Date(Date.now() + 3600000);

        await prisma.passwordResetToken.create({
            data: {
                token,
                userId: user.id,
                expiresAt,
            },
        });

        console.log(`[FORGOT_PASSWORD] Token for ${email}: ${token}`);
        console.log(`[FORGOT_PASSWORD] Reset link: http://localhost:5173/reset-password?token=${token}`);
    }

    return { success: true, message: "If an account exists with that email, a reset link has been sent.", messageKey: "auth.password_reset_instructions_sent" };
};

export const resetPassword = async (token: string, passwordString: string) => {
    const resetToken = await prisma.passwordResetToken.findUnique({
        where: { token },
        include: { user: true },
    });

    if (!resetToken || resetToken.expiresAt < new Date()) {
        throw { status: 400, message: "Invalid or expired token", messageKey: "auth.invalid_reset_token" };
    }

    const hashedPassword = await bcrypt.hash(passwordString, 10);

    await prisma.$transaction([
        prisma.user.update({
            where: { id: resetToken.userId },
            data: { password: hashedPassword },
        }),
        prisma.passwordResetToken.deleteMany({
            where: { userId: resetToken.userId },
        }),
    ]);

    return { success: true, message: "Password has been reset successfully.", messageKey: "auth.password_reset" };
};

export const changePasswordService = async (userId: string, currentPasswordString: string, newPasswordString: string) => {
    const user = await prisma.user.findUnique({ 
        where: { id: userId },
        include: { roles: { include: { role: true } } }
    });
    if (!user) throw { status: 404, message: "User not found", messageKey: "errors.user_not_found" };

    const roles = user.roles.map(r => r.role.name);
    if (roles.includes('ADMIN')) {
        throw { status: 403, message: "Admin password cannot be changed from the frontend. Please use database tools.", messageKey: "auth.admin_password_restricted" };
    }

    const isMatch = await bcrypt.compare(currentPasswordString, user.password);
    if (!isMatch) {
        throw { status: 400, message: "Incorrect current password", messageKey: "auth.incorrect_current_password" };
    }

    const hashedPassword = await bcrypt.hash(newPasswordString, 10);
    await prisma.user.update({
        where: { id: userId },
        data: { password: hashedPassword }
    });

    return { success: true, message: "Password updated successfully", messageKey: "auth.password_updated" };
};
