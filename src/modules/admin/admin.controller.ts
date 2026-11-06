import { Request, Response, NextFunction } from "express";
import { adminCreateSalonSchema } from "./admin.validation";
import { adminCreateSalonService, getAllUsersService, getAllSalonsService, getSalonByIdService, updateSalonService, deleteSalonService, getAdminServicesService } from "./admin.service";
import { importDashboardDemoData } from "./demo-data-import.service";
import { sendCsv } from "../../common/utils/csv.util";
import { customerService } from "../customer/customer.service";
import { bookingService } from "../booking/booking.service";

export const adminCreateSalon = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const data = adminCreateSalonSchema.parse(req.body);
        const salon = await adminCreateSalonService(data);
        res.status(201).json({ 
            success: true,
            message: "Salon created successfully", 
            data: salon 
        });
    } catch (err) {
        next(err);
    }
};

import { AuthRequest } from "../../common/middleware/auth.middleware";

export const getAllUsers = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const users = await getAllUsersService(req.user);
        res.status(200).json({
            success: true,
            message: "Users fetched successfully",
            data: users
        });
    } catch (err) {
        next(err);
    }
};

export const getAllSalons = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 10;
        const search = req.query.search as string | undefined;
        const sortBy = (req.query.sortBy as string) || 'createdAt';
        const sortOrder = (req.query.sortOrder as string) || 'desc';
        const parentId = req.query.parentId as string | undefined;
        const filter = req.query.filter as any | undefined;
        const location = { country: req.query.country as string | undefined, state: req.query.state as string | undefined, city: req.query.city as string | undefined, status: req.query.status as 'ACTIVE' | 'INACTIVE' | undefined, createdFrom: req.query.createdFrom as Date | undefined, createdTo: req.query.createdTo as Date | undefined, updatedFrom: req.query.updatedFrom as Date | undefined, updatedTo: req.query.updatedTo as Date | undefined, vendorId: req.query.vendorId as string | undefined };

        const result = await getAllSalonsService(page, limit, search, sortBy, sortOrder, parentId, filter, req.user, location);
        res.status(200).json({
            success: true,
            message: "Salons fetched successfully",
            data: result
        });
    } catch (err) {
        next(err);
    }
};

export const exportSalons = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const query = req.query;
        const result = await getAllSalonsService(1, 100, query.search as string | undefined, query.sortBy as string || 'createdAt', query.sortOrder as string || 'desc', query.parentId as string | undefined, query.filter as any, req.user, { country: query.country as string, state: query.state as string, city: query.city as string, status: query.status as any, createdFrom: query.createdFrom as Date | undefined, createdTo: query.createdTo as Date | undefined, updatedFrom: query.updatedFrom as Date | undefined, updatedTo: query.updatedTo as Date | undefined, vendorId: query.vendorId as string | undefined }, true);
        return sendCsv(res, `salons_filtered_${new Date().toISOString().slice(0, 10)}.csv`, ['ID', 'Name', 'Owner', 'Email', 'City', 'State', 'Country', 'Status', 'Parent ID'], result.salons.map((salon: any) => [salon.id, salon.name, `${salon.owner?.firstName || ''} ${salon.owner?.lastName || ''}`.trim(), salon.owner?.email, salon.address?.city, salon.address?.state, salon.address?.country, salon.isActive ? 'ACTIVE' : 'INACTIVE', salon.parentId]));
    } catch (err) { next(err); }
};

export const adminCustomers = async (req: AuthRequest, res: Response, next: NextFunction) => { try { res.json({ success: true, data: await customerService.getAllCustomers(undefined, req.query) }); } catch (err) { next(err); } };
export const exportCustomers = async (req: AuthRequest, res: Response, next: NextFunction) => { try { const result = await customerService.getAllCustomers(undefined, req.query, undefined, true); return sendCsv(res, `customers_filtered_${new Date().toISOString().slice(0, 10)}.csv`, ['User ID', 'First Name', 'Last Name', 'Email', 'Phone', 'Salon', 'Created At'], result.customers.map((item: any) => [item.user.id, item.user.firstName, item.user.lastName, item.user.email, item.user.phone, item.salon.name, item.createdAt])); } catch (err) { next(err); } };
export const adminBookings = async (req: AuthRequest, res: Response, next: NextFunction) => { try { res.json({ success: true, data: await bookingService.getAllBookings(undefined, req.query) }); } catch (err) { next(err); } };
export const exportBookings = async (req: AuthRequest, res: Response, next: NextFunction) => { try { const result = await bookingService.getAllBookings(undefined, req.query, undefined, true); return sendCsv(res, `bookings_filtered_${new Date().toISOString().slice(0, 10)}.csv`, ['ID', 'Booking Date', 'Status', 'Source', 'Customer', 'Staff', 'Amount', 'Paid'], result.bookings.map((item: any) => [item.id, item.bookingDate, item.status, item.medium === 'APP' ? 'Mobile App' : item.medium === 'ONLINE' ? 'Web' : 'In Salon', `${item.customer?.firstName || ''} ${item.customer?.lastName || ''}`.trim(), `${item.staff?.user?.firstName || ''} ${item.staff?.user?.lastName || ''}`.trim(), item.finalAmount, item.totalPaid])); } catch (err) { next(err); } };
export const adminServices = async (req: AuthRequest, res: Response, next: NextFunction) => { try { res.json({ success: true, data: await getAdminServicesService(req.query, false, req.user) }); } catch (err) { next(err); } };
export const exportServices = async (req: AuthRequest, res: Response, next: NextFunction) => { try { const result = await getAdminServicesService(req.query, true, req.user); return sendCsv(res, `services_filtered_${new Date().toISOString().slice(0, 10)}.csv`, ['ID', 'Name', 'Category', 'Salon', 'City', 'State', 'Country', 'Price', 'Duration', 'Status'], result.items.map((item: any) => [item.id, item.name, item.category?.name, item.salon.name, item.salon.address?.city, item.salon.address?.state, item.salon.address?.country, item.basePrice, item.baseDuration, item.isActive ? 'ACTIVE' : 'INACTIVE'])); } catch (err) { next(err); } };

export const getSalonById = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const salon = await getSalonByIdService(req.params.id as string, req.user);
        res.status(200).json({
            success: true,
            message: "Salon fetched successfully",
            data: salon
        });
    } catch (err) {
        next(err);
    }
};

export const updateSalon = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const salon = await updateSalonService(req.params.id as string, req.body, req.user);
        res.status(200).json({
            success: true,
            message: "Salon updated successfully",
            data: salon
        });
    } catch (err) {
        next(err);
    }
};

export const deleteSalon = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        await deleteSalonService(req.params.id as string, req.user);
        res.status(200).json({
            success: true,
            message: "Salon deleted successfully"
        });
    } catch (err) {
        next(err);
    }
};

export const importDemoData = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const result = await importDashboardDemoData();
        return res.status(201).json({
            success: true,
            message: "Demo data import completed successfully",
            data: result,
        });
    } catch (err: any) {
        if (err?.status === 403) {
            return res.status(403).json({
                success: false,
                message: err.message || "Demo data import is not allowed in this environment.",
            });
        }
        return next(err);
    }
};
