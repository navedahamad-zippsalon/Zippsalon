import { NextFunction, Response } from "express";
import { AuthRequest } from "../../common/middleware/auth.middleware";
import * as userManagement from "./user-management.service";
import { userListQuerySchema } from "./user-management.validation";

const vendorScoped = (req: AuthRequest) =>
    req.user?.roles.includes("VENDOR") === true
    && !req.user.roles.some((role) => role === "ADMIN" || role === "SUPER_ADMIN");

export const listManagedUsers = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const result = await userManagement.listUsers(req.user!, userListQuerySchema.parse(req.query), vendorScoped(req));
        res.status(200).json({ success: true, data: result.items, pagination: result.pagination });
    } catch (error) {
        next(error);
    }
};

export const getManagedUser = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const user = await userManagement.getUser(String(req.params.id), req.user!, vendorScoped(req));
        res.status(200).json({ success: true, data: user });
    } catch (error) {
        next(error);
    }
};

export const createManagedUser = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const user = await userManagement.createUser(req.user!, req.body, vendorScoped(req));
        res.status(201).json({ success: true, data: user });
    } catch (error) {
        next(error);
    }
};

export const updateManagedUser = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const user = await userManagement.updateUser(String(req.params.id), req.user!, req.body, vendorScoped(req));
        res.status(200).json({ success: true, data: user });
    } catch (error) {
        next(error);
    }
};

export const setManagedUserStatus = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const user = await userManagement.setUserStatus(String(req.params.id), req.user!, req.body.isActive, vendorScoped(req));
        res.status(200).json({ success: true, data: user });
    } catch (error) {
        next(error);
    }
};

export const deleteManagedUser = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const user = await userManagement.deleteUser(String(req.params.id), req.user!, vendorScoped(req));
        res.status(200).json({ success: true, message: "User deactivated successfully", data: user });
    } catch (error) {
        next(error);
    }
};

export const getManagedUserRoles = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const data = await userManagement.getUserRoles(String(req.params.id), req.user!, vendorScoped(req));
        res.status(200).json({ success: true, data });
    } catch (error) {
        next(error);
    }
};

export const replaceManagedUserRoles = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const data = await userManagement.replaceUserRoles(String(req.params.id), req.user!, req.body.roleIds, vendorScoped(req));
        res.status(200).json({ success: true, data });
    } catch (error) {
        next(error);
    }
};

export const getManagedUserPermissions = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const data = await userManagement.getUserPermissionsForManagement(String(req.params.id), req.user!, vendorScoped(req));
        res.status(200).json({ success: true, data });
    } catch (error) {
        next(error);
    }
};

export const replaceManagedUserPermissions = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const data = await userManagement.replaceUserPermissions(String(req.params.id), req.user!, req.body.permissions, vendorScoped(req));
        res.status(200).json({ success: true, data });
    } catch (error) {
        next(error);
    }
};

export const getManagedUserAccess = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const data = await userManagement.getUserAccess(String(req.params.id), req.user!, vendorScoped(req));
        res.status(200).json({ success: true, data });
    } catch (error) {
        next(error);
    }
};

export const replaceManagedUserAccess = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const data = await userManagement.replaceUserAccess(String(req.params.id), req.user!, req.body, vendorScoped(req));
        res.status(200).json({ success: true, data });
    } catch (error) {
        next(error);
    }
};

export const getVendorAiImageAccess = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const data = await userManagement.getVendorAiImageAccess(String(req.params.id));
        res.status(200).json({ success: true, data });
    } catch (error) {
        next(error);
    }
};

export const setVendorAiImageAccess = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const data = await userManagement.setVendorAiImageAccess(
            String(req.params.id),
            req.user!.userId,
            req.body.enabled,
        );
        res.status(200).json({ success: true, data });
    } catch (error) {
        next(error);
    }
};
