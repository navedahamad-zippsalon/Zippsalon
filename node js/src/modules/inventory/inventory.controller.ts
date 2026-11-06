import { Response } from 'express';
import { AuthRequest } from '../../common/middleware/auth.middleware';
import { inventoryService } from './inventory.service';
import { isAdmin } from './inventory.types';
import sharp from 'sharp';
import fs from 'fs/promises';
import path from 'path';
import { randomUUID } from 'crypto';

const send = (res: Response, data: unknown, status = 200) => res.status(status).json({ success: true, data });
const fail = (res: Response, error: any) => res.status(error.status || (error.name === 'ZodError' ? 400 : error.code === 'P2025' ? 404 : error.code === 'P2002' ? 409 : 500)).json({ success: false, message: error.name === 'ZodError' ? error.issues.map((issue: any) => issue.message).join(', ') : error.message || 'Internal server error' });
const query = (req: AuthRequest) => req.query as any;
const param = (req: AuthRequest, name: string) => String(req.params[name]);

export const inventoryController = {
  async create(req: AuthRequest, res: Response) { try { send(res, await inventoryService.createVendorProduct(req.user!.userId, req.body), 201); } catch (error) { fail(res, error); } },
  async vendorList(req: AuthRequest, res: Response) { try { send(res, await inventoryService.listVendorProducts(req.user!.userId, query(req))); } catch (error) { fail(res, error); } },
  async vendorGet(req: AuthRequest, res: Response) { try { send(res, await inventoryService.getVendorProduct(req.user!.userId, param(req, 'id'))); } catch (error) { fail(res, error); } },
  async vendorUpdate(req: AuthRequest, res: Response) { try { send(res, await inventoryService.updateVendorProduct(req.user!.userId, param(req, 'id'), req.body)); } catch (error) { fail(res, error); } },
  async vendorDelete(req: AuthRequest, res: Response) { try { send(res, await inventoryService.archiveVendorProduct(req.user!.userId, param(req, 'id'))); } catch (error) { fail(res, error); } },
  async vendorStatus(req: AuthRequest, res: Response) { try { send(res, await inventoryService.updateVendorProductStatus(req.user!.userId, param(req, 'id'), req.body.status)); } catch (error) { fail(res, error); } },
  async adminList(req: AuthRequest, res: Response) { try { send(res, await inventoryService.listAdminProducts(query(req))); } catch (error) { fail(res, error); } },
  async adminGet(req: AuthRequest, res: Response) { try { send(res, await inventoryService.getAdminProduct(param(req, 'id'))); } catch (error) { fail(res, error); } },
  async adminVendor(req: AuthRequest, res: Response) { try { send(res, await inventoryService.listAdminProducts({ ...query(req), vendorId: param(req, 'vendorId') })); } catch (error) { fail(res, error); } },
  async adminSalon(req: AuthRequest, res: Response) { try { send(res, await inventoryService.listAdminProducts({ ...query(req), salonId: param(req, 'salonId') })); } catch (error) { fail(res, error); } },
  async adminBranch(req: AuthRequest, res: Response) { try { send(res, await inventoryService.listAdminProducts({ ...query(req), branchId: param(req, 'branchId') })); } catch (error) { fail(res, error); } },
  async approve(req: AuthRequest, res: Response) { try { send(res, await inventoryService.approveListing(param(req, 'id'), req.body.status)); } catch (error) { fail(res, error); } },
  async categories(req: AuthRequest, res: Response) { try { send(res, await inventoryService.listCategories(req.user!.userId, query(req), isAdmin(req.user))); } catch (error) { fail(res, error); } },
  async categoryGet(req: AuthRequest, res: Response) { try { send(res, await inventoryService.getCategory(req.user!.userId, param(req, 'id'), isAdmin(req.user))); } catch (error) { fail(res, error); } },
  async createCategory(req: AuthRequest, res: Response) { try { send(res, await inventoryService.createCategory(req.user!.userId, req.body, isAdmin(req.user)), 201); } catch (error) { fail(res, error); } },
  async updateCategory(req: AuthRequest, res: Response) { try { send(res, await inventoryService.updateCategory(req.user!.userId, param(req, 'id'), req.body, isAdmin(req.user))); } catch (error) { fail(res, error); } },
  async deleteCategory(req: AuthRequest, res: Response) { try { send(res, await inventoryService.deleteCategory(req.user!.userId, param(req, 'id'), isAdmin(req.user))); } catch (error) { fail(res, error); } },
  async brands(req: AuthRequest, res: Response) { try { send(res, await inventoryService.listBrands(req.user!.userId, query(req), isAdmin(req.user))); } catch (error) { fail(res, error); } },
  async createBrand(req: AuthRequest, res: Response) { try { send(res, await inventoryService.createBrand(req.user!.userId, req.body, isAdmin(req.user)), 201); } catch (error) { fail(res, error); } },
  async updateBrand(req: AuthRequest, res: Response) { try { send(res, await inventoryService.updateBrand(req.user!.userId, param(req, 'id'), req.body, isAdmin(req.user))); } catch (error) { fail(res, error); } },
  async deleteBrand(req: AuthRequest, res: Response) { try { send(res, await inventoryService.deleteBrand(req.user!.userId, param(req, 'id'), isAdmin(req.user))); } catch (error) { fail(res, error); } },
  async stock(req: AuthRequest, res: Response) { try { send(res, await inventoryService.listVendorStock(req.user!.userId, query(req))); } catch (error) { fail(res, error); } },
  async salonStock(req: AuthRequest, res: Response) { try { send(res, await inventoryService.listSalonStock(req.user!.userId, query(req), isAdmin(req.user))); } catch (error) { fail(res, error); } },
  async createSalonStock(req: AuthRequest, res: Response) { try { send(res, await inventoryService.createSalonStock(req.user!.userId, req.body, isAdmin(req.user)), 201); } catch (error) { fail(res, error); } },
  async updateSalonStock(req: AuthRequest, res: Response) { try { send(res, await inventoryService.updateSalonStock(req.user!.userId, param(req, 'id'), req.body, isAdmin(req.user))); } catch (error) { fail(res, error); } },
  async removeSalonStock(req: AuthRequest, res: Response) { try { send(res, await inventoryService.removeSalonStock(req.user!.userId, param(req, 'id'), isAdmin(req.user))); } catch (error) { fail(res, error); } },
  async salonProducts(req: AuthRequest, res: Response) { try { send(res, await inventoryService.listSalonProducts(req.user!.userId, query(req))); } catch (error) { fail(res, error); } },
  async lowStock(req: AuthRequest, res: Response) { try { send(res, await inventoryService.lowStock(query(req))); } catch (error) { fail(res, error); } },
  async stats(req: AuthRequest, res: Response) { try { send(res, await inventoryService.stats(String(req.params.type) as 'salons' | 'vendors' | 'salon-vendor', query(req))); } catch (error) { fail(res, error); } },
  async dashboardStats(req: AuthRequest, res: Response) { try { send(res, await inventoryService.dashboardStats(req.user!.userId, query(req), isAdmin(req.user), req.user!.roles.includes('VENDOR'))); } catch (error) { fail(res, error); } },
  async report(req: AuthRequest, res: Response) { try { send(res, await inventoryService.inventoryReport(req.user!.userId, query(req), isAdmin(req.user), req.user!.roles.includes('VENDOR'))); } catch (error) { fail(res, error); } },
  async uploadImages(req: AuthRequest, res: Response) {
    try {
      const files = (req.files as Express.Multer.File[] | undefined) || [];
      if (!files.length) return res.status(400).json({ success: false, message: 'At least one image is required.' });
      const directory = path.join(process.cwd(), 'public', 'uploads', 'inventory');
      await fs.mkdir(directory, { recursive: true });
      const protocol = req.protocol;
      const host = req.get('host');
      const images = await Promise.all(files.map(async (file) => {
        if (!file.mimetype.startsWith('image/')) throw { status: 400, message: 'Only image files are supported.' };
        const filename = `${randomUUID()}.webp`;
        await sharp(file.buffer, { limitInputPixels: 40_000_000 })
          .rotate()
          .resize({ width: 2000, height: 2000, fit: 'inside', withoutEnlargement: true })
          .webp({ quality: 82, smartSubsample: true })
          .toFile(path.join(directory, filename));
        return { url: `${protocol}://${host}/public/uploads/inventory/${filename}`, mimeType: 'image/webp' };
      }));
      return res.status(201).json({ success: true, message: 'Images uploaded and optimized successfully.', data: { images } });
    } catch (error) { fail(res, error); }
  },
};

export { isAdmin };
