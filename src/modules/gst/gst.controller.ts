import { Response } from "express";
import { AuthRequest } from "../../common/middleware/auth.middleware";
import { assertBookingAccess } from "../booking/booking.service";
import logger from "../../infrastructure/logger/logger";
import { gstService } from "./gst.service";

export const gstController = {
  /**
   * Get GST configuration for a salon
   */
  async getGSTConfig(req: AuthRequest, res: Response) {
    try {
      const salonId = req.params.salonId as string;

      const isAdmin = req.user?.roles.includes("ADMIN") || req.user?.roles.includes("SUPER_ADMIN");

      const config = await gstService.getOrCreateGSTConfig(salonId);
      res.json({ success: true, data: config });
    } catch (error: any) {
      res.status(error.status || 500).json({ success: false, message: error.message });
    }
  },

  /**
   * Update GST configuration (Admin only)
   */
  async updateGSTConfig(req: AuthRequest, res: Response) {
    try {
      const salonId = req.params.salonId as string;
      const isAdmin = req.user?.roles.includes("ADMIN") || req.user?.roles.includes("SUPER_ADMIN");

      if (!isAdmin) {
        return res.status(403).json({ success: false, message: "Admin access required" });
      }

      const config = await gstService.updateGSTConfig(salonId, req.body);
      res.json({ success: true, data: config });
    } catch (error: any) {
      res.status(error.status || 500).json({ success: false, message: error.message });
    }
  },

  /**
   * Get booking with GST details
   */
  async getBookingWithGST(req: AuthRequest, res: Response) {
    try {
      const bookingId = req.params.bookingId as string;
      if (!req.user) return res.status(401).json({ success: false, message: "Unauthorized" });
      await assertBookingAccess(bookingId, req.user, "view");
      const booking = await gstService.getBookingWithGST(bookingId);
      res.json({ success: true, data: booking });
    } catch (error: any) {
      res.status(error.status || 500).json({ success: false, message: error.message });
    }
  },

  /**
   * Get printable GST invoice for booking
   */
  async getPrintInvoice(req: AuthRequest, res: Response) {
    try {
      const bookingId = req.params.bookingId as string;
      if (!req.user) return res.status(401).json({ success: false, message: "Unauthorized" });
      await assertBookingAccess(bookingId, req.user, "view");
      const invoice = await gstService.getBookingInvoice(bookingId);
      res.json({ success: true, data: invoice });
    } catch (error: any) {
      if (!error?.status || error.status >= 500) {
        logger.error("Booking invoice generation failed", { error, bookingId: req.params.bookingId });
      }
      res.status(error.status || 500).json({
        success: false,
        message: error.status && error.status < 500 ? error.message : "Invoice generation failed",
      });
    }
  },
};
