import { Response, NextFunction } from "express";
import { AuthRequest } from "../../common/middleware/auth.middleware";
import * as serviceService from "./service.service";
import { 
    createServiceSchema, 
    updateServiceSchema, 
    createComboSchema, 
    createCategorySchema,
} from "./service.validation";
import { serviceLookupQuerySchema, serviceLookupTypeSchema } from "../../validators/services";

// --- Categories ---

export const createCategory = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const data = createCategorySchema.parse(req.body);
        const category = await serviceService.createCategoryService(data);
        res.status(201).json({ success: true, data: category });
    } catch (err) {
        next(err);
    }
};

export const updateCategory = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params;
        const data = createCategorySchema.partial().parse(req.body);
        const category = await serviceService.updateCategoryService(id as string, data);
        res.status(200).json({ success: true, data: category });
    } catch (err) {
        next(err);
    }
};

export const getAllCategories = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const isAdmin = req.user?.roles.includes('ADMIN') || false;
        const categories = await serviceService.getAllCategoriesService(isAdmin);
        res.status(200).json({ success: true, data: categories });
    } catch (err) {
        next(err);
    }
};

// --- Services ---

export const createService = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const { salonId } = req.params;
        const data = createServiceSchema.parse(req.body);
        const service = await serviceService.createServiceService(salonId as string, req.user!.userId, req.user!.roles, data, req.file);
        res.status(201).json({ success: true, message: "Service created successfully", data: service });
    } catch (err) {
        next(err);
    }
};

export const updateService = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params;
        const data = updateServiceSchema.parse(req.body);
        const service = await serviceService.updateServiceService(id as string, req.user!.userId, req.user!.roles, data, req.file);
        res.status(200).json({ success: true, message: "Service updated successfully", data: service });
    } catch (err) {
        next(err);
    }
};

export const deleteService = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params;
        await serviceService.deleteServiceService(id as string, req.user!.userId, req.user!.roles);
        res.status(200).json({ success: true, message: "Service deleted successfully" });
    } catch (err) {
        next(err);
    }
};

export const getSalonServices = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const { salonId } = req.params;
        const results = await serviceService.getSalonServicesService(salonId as string, req.user!.userId, req.user!.roles, req.query);
        res.status(200).json({ success: true, data: results.services, meta: results.meta });
    } catch (err) {
        next(err);
    }
};

// Collection endpoint for the existing /api/v1/services route.  It deliberately
// shares the same response contract as /salon/:salonId.
export const getServices = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const results = await serviceService.getSalonServicesService("all", req.user!.userId, req.user!.roles, req.query);
        res.status(200).json({ success: true, data: results.services, meta: results.meta });
    } catch (err) {
        next(err);
    }
};

export const getServiceDetails = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const service = await serviceService.getServiceDetailsService(String(req.params.id), req.user!.userId, req.user!.roles);
        res.status(200).json({ success: true, data: service });
    } catch (err) {
        next(err);
    }
};

export const getServiceLookups = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const { type } = serviceLookupTypeSchema.parse(req.params);
        const query = serviceLookupQuerySchema.parse(req.query);
        const data = await serviceService.listServiceLookupsService(type, req.user!.userId, req.user!.roles, query);
        res.status(200).json({ success: true, ...data });
    } catch (err) {
        next(err);
    }
};

// --- Combos ---

export const createCombo = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const { salonId } = req.params;
        const data = createComboSchema.parse(req.body);
        const combo = await serviceService.createComboService(salonId as string, req.user!.userId, req.user!.roles, data, req.file);
        res.status(201).json({ success: true, message: "Combo created successfully", data: combo });
    } catch (err) {
        next(err);
    }
};

export const getCombos = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const { salonId } = req.params;
        const results = await serviceService.getCombosBySalonService(salonId as string, req.user!.userId, req.user!.roles, req.query);
        res.status(200).json({ success: true, data: results.combos, meta: results.meta });
    } catch (err) {
        next(err);
    }
};
export const updateCombo = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params;
        const data = createComboSchema.partial().parse(req.body);
        const combo = await serviceService.updateComboService(id as string, req.user!.userId, req.user!.roles, data, req.file);
        res.status(200).json({ success: true, message: "Combo updated successfully", data: combo });
    } catch (err) {
        next(err);
    }
};
