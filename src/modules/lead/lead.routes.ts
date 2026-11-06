import { Router } from "express";
import * as leadController from "./lead.controller";
import { authenticate, authorizeRoles } from "../../common/middleware/auth.middleware";
import { validate } from "../../common/middleware/validate.middleware";
import { createLeadSchema, updateLeadStatusSchema } from "../../validators/leads";
import { paginationQuerySchema, idParam } from "../../validators/common";

const router = Router();

// Public route to create a lead from the landing page
router.post("/", validate({ body: createLeadSchema }), leadController.createLead);

// Admin only routes
router.get("/", authenticate, authorizeRoles("ADMIN"), validate({ query: paginationQuerySchema }), leadController.getAllLeads);
router.patch("/:id/status", authenticate, authorizeRoles("ADMIN"), validate({ params: idParam("id"), body: updateLeadStatusSchema }), leadController.updateLeadStatus);

export default router;
