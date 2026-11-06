import { Response } from 'express';
import { AuthRequest } from '../../common/middleware/auth.middleware';
import { bookingService } from './booking.service';
import { serviceLookupQuerySchema, serviceLookupTypeSchema } from '../../validators/services';
import * as serviceService from '../service/service.service';

export const bookingController = {
  async getBookingLookups(req: AuthRequest, res: Response) {
    try {
      const { type } = serviceLookupTypeSchema.parse(req.params);
      const query = serviceLookupQuerySchema.parse(req.query);
      const data = await serviceService.listServiceLookupsService(type, req.user!.userId, req.user!.roles, query);
      res.json({ success: true, ...data });
    } catch (error: any) {
      res.status(error.status || 500).json({ success: false, code: error.code, message: error.message });
    }
  },
  async getAllBookings(req: AuthRequest, res: Response) {
    try {
      const rawSalonId = typeof req.params.salonId === 'string' ? req.params.salonId : undefined;
      const requestedSalonId = rawSalonId === 'all' ? undefined : rawSalonId ?? (typeof req.query.salonId === 'string' ? req.query.salonId : undefined);
      const isAdmin = req.user?.roles.includes('ADMIN') || req.user?.roles.includes('SUPER_ADMIN');
      const ownerId = !isAdmin ? req.user?.userId : undefined;
      const safeQuery = { ...req.query } as Record<string, any>;
      delete safeQuery.signal;

      const result = await bookingService.getAllBookings(
        requestedSalonId,
        safeQuery,
        ownerId,
        false,
        Boolean(!isAdmin && req.user?.roles.includes('VENDOR')),
      );
      res.json({ success: true, data: result });
    } catch (error: any) {
      const status = error?.status || 500;
      if (status === 403) {
        console.warn('booking_access_denied', {
          requestId: req.header('X-Request-ID'),
          userId: req.user?.userId,
          role: req.user?.roles?.[0] ?? null,
          roles: req.user?.roles ?? [],
          requestedSalonId: req.query.salonId ?? null,
          requestedBranchId: req.query.branchId ?? null,
          route: req.originalUrl,
          code: error?.code ?? 'BOOKING_PERMISSION_DENIED',
          message: error.message,
        });
      }
      res.status(status).json({
        success: false,
        code: error?.code ?? (status === 403 ? 'BOOKING_PERMISSION_DENIED' : 'BOOKING_LIST_FAILED'),
        message: error.message || 'Unable to load bookings',
      });
    }
  },

  async getBookingById(req: AuthRequest, res: Response) {
    try {
      const id = req.params.id as string;
      const result = await bookingService.getBookingById(id, req.user);
      if (!result) return res.status(404).json({ success: false, message: 'Booking not found' });
      res.json({ success: true, data: result });
    } catch (error: any) {
      res.status(error.status || 500).json({ success: false, code: error.code, message: error.message });
    }
  },

  async createBooking(req: AuthRequest, res: Response) {
    try {
      const salonId = req.params.salonId as string;
      const result = await bookingService.createBooking(salonId, req.body, req.user);
      res.status(201).json({ success: true, data: result });
    } catch (error: any) {
      res.status(error.status || 500).json({ success: false, code: error.code, message: error.message });
    }
  },

  async updateBooking(req: AuthRequest, res: Response) {
    try {
      const id = req.params.id as string;
      const result = await bookingService.updateBooking(id, req.body, req.user);
      res.json({ success: true, data: result });
    } catch (error: any) {
      res.status(error.status || 500).json({ success: false, code: error.code, message: error.message });
    }
  },

  async addPayment(req: AuthRequest, res: Response) {
    try {
      const id = req.params.id as string;
      const result = await bookingService.addPayment(id, req.body, req.user);
      res.status(201).json({ success: true, data: result });
    } catch (error: any) {
      res.status(error.status || 500).json({ success: false, message: error.message });
    }
  },

  async verifyRazorpayPayment(req: AuthRequest, res: Response) {
    try {
      const result = await bookingService.verifyRazorpayPayment(req.params.id as string, req.body, req.user);
      res.json({ success: true, data: result });
    } catch (error: any) { res.status(error.status || 500).json({ success: false, code: error.code, message: error.message }); }
  },

  async cancelBooking(req: AuthRequest, res: Response) {
    try {
      const id = req.params.id as string;
      const result = await bookingService.cancelBooking(id, req.user);
      res.json({ success: true, data: result });
    } catch (error: any) {
      res.status(error.status || 500).json({ success: false, message: error.message });
    }
  },
};
