export type InventoryUser = {
  userId: string;
  roles: string[];
};

export type InventoryQuery = {
  page?: string | number;
  limit?: string | number;
  search?: string;
  sku?: string;
  barcode?: string;
  vendorId?: string;
  salonId?: string;
  branchId?: string;
  categoryId?: string;
  brandId?: string;
  status?: string;
  listingStatus?: string;
  productType?: string;
  productId?: string;
  stockStatus?: string;
  sortBy?: string;
  sortOrder?: string;
  startDate?: string;
  endDate?: string;
};

export const isAdmin = (user?: InventoryUser) =>
  Boolean(user?.roles.includes('ADMIN') || user?.roles.includes('SUPER_ADMIN'));
