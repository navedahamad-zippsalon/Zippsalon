import { Router } from "express";
import { prisma } from "../../infrastructure/database/prisma";
import { authenticate, AuthRequest, authorizeRoles } from "../../common/middleware/auth.middleware";
import { APP_CONSTANTS } from "../../common/constants/app.constants";
import { requireAnyPermissionOrRoles, requirePermission, requirePermissionOrRoles } from "../../common/middleware/permission.middleware";
import * as commerce from "../customer/customer-commerce.service";
import { validate } from "../../common/middleware/validate.middleware";
import { z } from "zod";
import { registerUserManagementRoutes } from "../user-management/user-management.routes";

const router = Router();
export const vendorDirectoryRouter = Router();
const vendorSearchQuerySchema = z.object({
  search: z.string().trim().max(120).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
}).strict();

const page = (value: any) => Math.max(1, Number(value) || 1);
const limit = (value: any) => Math.min(100, Math.max(1, Number(value) || 20));

const postInclude = {
  media: true,
  _count: { select: { likes: true, comments: true, views: true, shares: true } },
};

const postResponse = (items: any[]) => items.map((item) => ({
  ...item,
  likeCount: item._count?.likes ?? 0,
  commentCount: item._count?.comments ?? 0,
  viewCount: item._count?.views ?? 0,
  shareCount: item._count?.shares ?? 0,
}));

router.use(authenticate);
registerUserManagementRoutes(router, "VENDOR", "/users");
vendorDirectoryRouter.use(authenticate, authorizeRoles(APP_CONSTANTS.ROLES.ADMIN, "SUPER_ADMIN", APP_CONSTANTS.ROLES.VENDOR));
vendorDirectoryRouter.get("/", validate({ query: vendorSearchQuerySchema }), async (req: AuthRequest, res, next) => {
  try {
    const pageValue = page(req.query.page);
    const limitValue = limit(req.query.limit);
    const isAdmin = req.user!.roles.includes(APP_CONSTANTS.ROLES.ADMIN) || req.user!.roles.includes("SUPER_ADMIN");
    const terms = String(req.query.search ?? "").split(/\s+/).filter(Boolean);
    const where: any = {
      ...(isAdmin ? {} : { id: req.user!.userId }),
      roles: { some: { role: { name: APP_CONSTANTS.ROLES.VENDOR } } },
      ...(terms.length ? {
        AND: terms.map((term) => ({
          OR: [
            { firstName: { contains: term, mode: "insensitive" } },
            { lastName: { contains: term, mode: "insensitive" } },
            { email: { contains: term, mode: "insensitive" } },
            { ownedSalons: { some: { parentId: null, name: { contains: term, mode: "insensitive" } } } },
          ],
        })),
      } : {}),
    };
    const [items, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip: (pageValue - 1) * limitValue,
        take: limitValue,
        orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          ownedSalons: { where: { parentId: null }, select: { id: true, name: true } },
        },
      }),
      prisma.user.count({ where }),
    ]);
    const data = items.map((item) => ({
      id: item.id,
      name: [item.firstName, item.lastName].filter(Boolean).join(" "),
      email: item.email,
      salons: item.ownedSalons,
    }));
    res.status(200).json({
      success: true,
      data,
      pagination: {
        page: pageValue,
        limit: limitValue,
        total,
        totalPages: total ? Math.ceil(total / limitValue) : 0,
        hasNextPage: pageValue * limitValue < total,
        hasPreviousPage: pageValue > 1,
      },
    });
  } catch (error) {
    next(error);
  }
});
/** @swagger
 * /api/v1/vendor/me/coupons:
 *   get: { summary: List vendor coupons, tags: [Vendor], security: [{ bearerAuth: [] }], responses: { 200: { description: Coupon list } } }
 *   post: { summary: Create a vendor coupon, tags: [Vendor], security: [{ bearerAuth: [] }], responses: { 201: { description: Coupon created } } }
 * /api/v1/vendor/me/coupons/{id}:
 *   put: { summary: Update a vendor coupon, tags: [Vendor], security: [{ bearerAuth: [] }], parameters: [{ in: path, name: id, required: true, schema: { type: string, format: uuid } }], responses: { 200: { description: Coupon updated } } }
 *   delete: { summary: Archive a vendor coupon, tags: [Vendor], security: [{ bearerAuth: [] }], parameters: [{ in: path, name: id, required: true, schema: { type: string, format: uuid } }], responses: { 200: { description: Coupon archived } } }
 * /api/v1/vendor/me/coupons/{id}/status:
 *   patch: { summary: Activate or deactivate a vendor coupon, tags: [Vendor], security: [{ bearerAuth: [] }], parameters: [{ in: path, name: id, required: true, schema: { type: string, format: uuid } }], responses: { 200: { description: Coupon status updated } } }
 */
router.get("/me/coupons", requirePermission("coupons.view"), async (req: AuthRequest, res, next) => { try { res.json({ success: true, data: await commerce.listOwnedCoupons(req.user!.userId, "VENDOR", req.query) }); } catch (e) { next(e); } });
router.post("/me/coupons", requireAnyPermissionOrRoles(["coupons.create", "coupons.manage"]), async (req: AuthRequest, res, next) => { try { res.status(201).json({ success: true, data: await commerce.saveCoupon(req.user!.userId, "VENDOR", req.body) }); } catch (e) { next(e); } });
router.put("/me/coupons/:id", requireAnyPermissionOrRoles(["coupons.update", "coupons.manage"]), async (req: AuthRequest, res, next) => { try { res.json({ success: true, data: await commerce.saveCoupon(req.user!.userId, "VENDOR", req.body, String(req.params.id)) }); } catch (e) { next(e); } });
router.patch("/me/coupons/:id/status", requireAnyPermissionOrRoles(["coupons.status", "coupons.manage"]), async (req: AuthRequest, res, next) => { try { const isActive = req.body.isActive !== undefined ? Boolean(req.body.isActive) : req.body.status === "ACTIVE"; res.json({ success: true, data: await commerce.setCouponStatus(req.user!.userId, String(req.params.id), isActive) }); } catch (e) { next(e); } });
router.delete("/me/coupons/:id", requireAnyPermissionOrRoles(["coupons.delete", "coupons.manage"]), async (req: AuthRequest, res, next) => { try { res.json({ success: true, data: await commerce.deleteCoupon(req.user!.userId, String(req.params.id)) }); } catch (e) { next(e); } });

router.get(
  "/me/posts",
  requirePermissionOrRoles("feed.posts.view", APP_CONSTANTS.ROLES.ADMIN, "SUPER_ADMIN", APP_CONSTANTS.ROLES.VENDOR),
  async (req: AuthRequest, res, next) => {
    try {
      const pageValue = page(req.query.page);
      const limitValue = limit(req.query.limit);
      const userId = req.user!.userId;

      const [items, total] = await Promise.all([
        prisma.feedPost.findMany({
          where: { vendorId: userId, createdBy: userId },
          include: postInclude,
          orderBy: { createdAt: "desc" },
          skip: (pageValue - 1) * limitValue,
          take: limitValue,
        }),
        prisma.feedPost.count({ where: { vendorId: userId, createdBy: userId } }),
      ]);

      res.status(200).json({
        success: true,
        message: "Vendor posts fetched successfully",
        data: {
          posts: postResponse(items),
          pagination: {
            page: pageValue,
            limit: limitValue,
            total,
            totalPages: Math.ceil(total / limitValue),
          },
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

router.get(
  "/me/stories",
  requirePermissionOrRoles("feed.stories.view", APP_CONSTANTS.ROLES.ADMIN, "SUPER_ADMIN", APP_CONSTANTS.ROLES.VENDOR),
  async (req: AuthRequest, res, next) => {
    try {
      const pageValue = page(req.query.page);
      const limitValue = limit(req.query.limit);
      const userId = req.user!.userId;

      const [items, total] = await Promise.all([
        prisma.feedStory.findMany({
          where: { vendorId: userId, createdBy: userId },
          include: { media: true },
          orderBy: { createdAt: "desc" },
          skip: (pageValue - 1) * limitValue,
          take: limitValue,
        }),
        prisma.feedStory.count({ where: { vendorId: userId, createdBy: userId } }),
      ]);

      res.status(200).json({
        success: true,
        message: "Vendor stories fetched successfully",
        data: {
          stories: items,
          pagination: {
            page: pageValue,
            limit: limitValue,
            total,
            totalPages: Math.ceil(total / limitValue),
          },
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
