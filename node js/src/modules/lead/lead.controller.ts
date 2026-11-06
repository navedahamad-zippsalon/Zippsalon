import { Request, Response } from "express";
import * as leadService from "./lead.service";

export const createLead = async (req: Request, res: Response) => {
    try {
        const metadata = {
            ip: req.ip,
            userAgent: req.headers["user-agent"],
            referrer: req.headers["referer"],
            ...req.body.metadata
        };
        const lead = await leadService.createLead({
            ...req.body,
            metadata
        });
        res.status(201).json(lead);
    } catch (error: any) {
        res.status(400).json({ message: error.message });
    }
};

export const getAllLeads = async (req: Request, res: Response) => {
    try {
        const { page = 1, limit = 10, search = "", sortBy = "createdAt", sortOrder = "desc" } = req.query;
        const result = await leadService.getAllLeads({
            page: Number(page),
            limit: Number(limit),
            search: search as string,
            sortBy: sortBy as string,
            sortOrder: sortOrder as string
        });
        res.json(result);
    } catch (error: any) {
        res.status(400).json({ message: error.message });
    }
};

export const updateLeadStatus = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { status } = req.body;
        const lead = await leadService.updateLeadStatus(id as string, status);
        res.json(lead);
    } catch (error: any) {
        res.status(400).json({ message: error.message });
    }
};
