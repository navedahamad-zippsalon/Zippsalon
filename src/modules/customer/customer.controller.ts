import { Response } from 'express';
import { AuthRequest } from '../../common/middleware/auth.middleware';
import { customerService } from './customer.service';

export const customerController = {
  async getAllCustomers(req: AuthRequest, res: Response) {
    try {
      const rawSalonId = typeof req.params.salonId === 'string' ? req.params.salonId : undefined;
      const salonId = rawSalonId === 'all' ? undefined : rawSalonId ?? (typeof req.query.salonId === 'string' ? req.query.salonId : undefined);
      const isAdmin = req.user?.roles.includes('ADMIN') || req.user?.roles.includes('SUPER_ADMIN');
      const ownerId = !isAdmin ? req.user?.userId : undefined;
      const safeQuery = { ...req.query } as Record<string, any>;
      delete safeQuery.signal;

      const result = await customerService.getAllCustomers(salonId, safeQuery, ownerId);
      res.json({ success: true, data: result });
    } catch (error: any) {
      const status = error?.status || 500;
      if (status === 403) {
        console.warn('customer_access_denied', {
          requestId: req.header('X-Request-ID'),
          userId: req.user?.userId,
          role: req.user?.roles?.[0] ?? null,
          roles: req.user?.roles ?? [],
          requestedSalonId: req.query.salonId ?? null,
          requestedBranchId: req.query.branchId ?? null,
          route: req.originalUrl,
          code: error?.code ?? 'CUSTOMER_PERMISSION_DENIED',
          message: error.message,
        });
      }
      res.status(status).json({ success: false, code: error?.code ?? 'CUSTOMER_PERMISSION_DENIED', message: error.message || 'Customer access denied' });
    }
  },

  async searchCustomers(req: AuthRequest, res: Response) {
    try {
      const query = req.query.query as string;
      const result = await customerService.searchCustomers(query);
      res.json({ success: true, data: result });
    } catch (error: any) {
      res.status(error.status || 500).json({ success: false, message: error.message });
    }
  },

  async createCustomer(req: AuthRequest, res: Response) {
    try {
      const salonId = req.params.salonId as string;
      const result = await customerService.findOrCreateCustomer(salonId, req.body);
      res.status(201).json({ success: true, data: result });
    } catch (error: any) {
      res.status(error.status || 500).json({ success: false, message: error.message });
    }
  },

  async getCustomerById(req: AuthRequest, res: Response) {
    try {
      const salonId = req.params.salonId as string;
      const customerId = req.params.id as string;
      const result = await customerService.getCustomerById(salonId, customerId);
      if (!result) return res.status(404).json({ success: false, message: 'Customer not found' });
      res.json({ success: true, data: result });
    } catch (error: any) {
      res.status(error.status || 500).json({ success: false, message: error.message });
    }
  },

  async getCustomerFullDetails(req: AuthRequest, res: Response) {
    try {
      const salonId = req.params.salonId === 'all' ? undefined : req.params.salonId as string;
      const userId = req.params.id as string;
      const result = await customerService.getCustomerFullDetails(userId, salonId);
      res.json({ success: true, data: result });
    } catch (error: any) {
      res.status(error.status || 500).json({ success: false, message: error.message });
    }
  },
};
