import { NextFunction, Request, Response } from "express";
import * as service from "./razorpay.service";
import { razorpayConfigSchema, razorpayTestSchema } from "./razorpay.validation";

export async function getConfig(_req: Request, res: Response, next: NextFunction) { try { res.json({ success: true, data: await service.publicConfiguration("PLATFORM") }); } catch (error) { next(error); } }
export async function updateConfig(req: Request, res: Response, next: NextFunction) { try { const userId = (req as any).user.userId; await service.updateConfiguration(userId, razorpayConfigSchema.parse(req.body), "PLATFORM"); res.json({ success: true, data: await service.publicConfiguration("PLATFORM") }); } catch (error) { next(error); } }
export async function testConfig(req: Request, res: Response, next: NextFunction) { try { const result = await service.testConnection("PLATFORM", undefined, razorpayTestSchema.parse(req.body)); res.status(result.success ? 200 : 503).json({ success: result.success, data: result }); } catch (error) { next(error); } }

export async function getVendorConfig(req: Request, res: Response, next: NextFunction) { try { res.json({ success: true, data: await service.publicConfiguration("VENDOR", (req as any).user.userId) }); } catch (error) { next(error); } }
export async function updateVendorConfig(req: Request, res: Response, next: NextFunction) { try { const userId = (req as any).user.userId; await service.updateConfiguration(userId, razorpayConfigSchema.parse(req.body), "VENDOR", userId); res.json({ success: true, data: await service.publicConfiguration("VENDOR", userId) }); } catch (error) { next(error); } }
export async function testVendorConfig(req: Request, res: Response, next: NextFunction) { try { const result = await service.testConnection("VENDOR", (req as any).user.userId, razorpayTestSchema.parse(req.body)); res.status(result.success ? 200 : 503).json({ success: result.success, data: result }); } catch (error) { next(error); } }
