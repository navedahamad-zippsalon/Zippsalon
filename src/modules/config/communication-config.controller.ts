import { NextFunction, Request, Response } from "express";
import { prisma } from "../../infrastructure/database/prisma";
import { normalizePhone } from "../whatsapp/utils/phone";
import * as smtp from "../delivery/smtp.service";
import * as whatsapp from "../delivery/whatsapp-config.service";
import { smtpCreateSchema, smtpUpdateSchema, smtpTestEmailSchema, whatsappConfigSchema, whatsappTestMessageSchema } from "../delivery/delivery-config.validation";
import { z } from "zod";

async function scope(req: Request) {
  const user = (req as any).user; const isAdmin = user.roles?.some((role: string) => role === "ADMIN" || role === "SUPER_ADMIN");
  const requestedVendor = typeof req.query.vendorId === "string" ? req.query.vendorId : undefined;
  const requestedSalon = typeof req.query.salonId === "string" ? req.query.salonId : undefined;
  if (isAdmin) {
    if (requestedSalon) {
      const salon = await prisma.salon.findFirst({ where: { id: requestedSalon, ...(requestedVendor ? { ownerId: requestedVendor } : {}) }, select: { id: true } });
      if (!salon) throw { status: 403, code: "INSUFFICIENT_PERMISSION", message: "Forbidden: salon configuration scope is invalid." };
    }
    return { vendorId: requestedVendor, salonId: requestedSalon };
  }

  if (requestedVendor && requestedVendor !== user.userId) throw { status: 403, code: "INSUFFICIENT_PERMISSION", message: "Forbidden: configuration scope is not owned by this vendor." };
  const ownedSalon = await prisma.salon.findFirst({ where: { ownerId: user.userId, parentId: null, isActive: true }, select: { id: true } });
  if (ownedSalon) {
    if (requestedSalon) {
      const salon = await prisma.salon.findFirst({ where: { id: requestedSalon, ownerId: user.userId }, select: { id: true } });
      if (!salon) throw { status: 403, code: "INSUFFICIENT_PERMISSION", message: "Forbidden: salon configuration scope is not owned by this vendor." };
    }
    return { vendorId: user.userId, salonId: requestedSalon };
  }

  const staff = await prisma.salonStaff.findFirst({ where: { userId: user.userId, isActive: true }, select: { salonId: true, salon: { select: { ownerId: true } } } });
  if (!staff || (requestedSalon && requestedSalon !== staff.salonId)) throw { status: 403, code: "INSUFFICIENT_PERMISSION", message: "Forbidden: configuration scope is not assigned to this user." };
  return { vendorId: staff.salon.ownerId, salonId: staff.salonId };
}
const actor = (req: Request) => (req as any).user.userId;
const statusSchema = z.object({ isActive: z.boolean() });
export async function getSmtp(req: Request, res: Response, next: NextFunction) { try { res.json({ success: true, data: await smtp.getPublicConfiguration(await scope(req)) }); } catch (e) { next(e); } }
export async function saveSmtp(req: Request, res: Response, next: NextFunction) { try { const target = await scope(req); const current = await smtp.getPublicConfiguration(target); const value = (req.method === "POST" && !current.id ? smtpCreateSchema : smtpUpdateSchema).parse(req.body); await smtp.saveConfiguration(actor(req), value, target); res.json({ success: true, message: req.method === "POST" ? "SMTP configuration created successfully" : "SMTP configuration updated successfully", data: await smtp.getPublicConfiguration(target) }); } catch (e) { next(e); } }
export async function deleteSmtp(req: Request, res: Response, next: NextFunction) { try { await smtp.deleteConfiguration(await scope(req)); res.json({ success: true }); } catch (e) { next(e); } }
export async function testSmtp(req: Request, res: Response, next: NextFunction) { try { const result = await smtp.verifyConnection(await scope(req)); res.status(result.success ? 200 : 503).json({ success: result.success, data: result }); } catch (e) { next(e); } }
export async function testEmail(req: Request, res: Response, next: NextFunction) { try { const { email } = smtpTestEmailSchema.parse(req.body); await smtp.sendMail({ to: email, subject: "Zippsalon SMTP test", text: "Your Zippsalon SMTP configuration is working." }, await scope(req)); res.json({ success: true }); } catch (e: any) { if (e?.code === "SMTP_SEND_FAILED" || e?.code === "SMTP_AUTH_FAILED") return next({ status: 503, code: "SMTP_TEST_EMAIL_FAILED", message: "Unable to send the SMTP test email." }); next(e); } }
export async function smtpStatus(req: Request, res: Response, next: NextFunction) { try { await smtp.setSmtpStatus(statusSchema.parse(req.body).isActive, await scope(req)); res.json({ success: true }); } catch (e) { next(e); } }
export async function getWhatsapp(req: Request, res: Response, next: NextFunction) { try { res.json({ success: true, data: await whatsapp.getPublicConfiguration(await scope(req)) }); } catch (e) { next(e); } }
export async function saveWhatsapp(req: Request, res: Response, next: NextFunction) { try { const target = await scope(req); await whatsapp.saveConfiguration(actor(req), whatsappConfigSchema.parse(req.body), target); res.json({ success: true, data: await whatsapp.getPublicConfiguration(target) }); } catch (e) { next(e); } }
export async function deleteWhatsapp(req: Request, res: Response, next: NextFunction) { try { await whatsapp.deleteConfiguration(await scope(req)); res.json({ success: true }); } catch (e) { next(e); } }
export async function testWhatsapp(req: Request, res: Response, next: NextFunction) { try { const result = await whatsapp.verifyConnection(await scope(req)); res.status(result.success ? 200 : 503).json({ success: result.success, data: result }); } catch (e) { next(e); } }
export async function sendTestWhatsapp(req: Request, res: Response, next: NextFunction) { try { const body = whatsappTestMessageSchema.parse(req.body); await whatsapp.sendTestMessage(normalizePhone(body.phoneNumber), body.message, await scope(req)); res.json({ success: true }); } catch (e) { next(e); } }
export async function whatsappStatus(req: Request, res: Response, next: NextFunction) { try { await whatsapp.setWhatsappStatus(statusSchema.parse(req.body).isActive, await scope(req)); res.json({ success: true }); } catch (e) { next(e); } }
