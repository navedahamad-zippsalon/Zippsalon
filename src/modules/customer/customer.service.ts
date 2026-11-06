import { prisma } from '../../infrastructure/database/prisma';
import { normalizeEnumToken, normalizeFilterValue, normalizePagination } from '../../common/utils/filter-utils';

const customerStatusAliases: Record<string, string> = {
  active: 'ACTIVE',
  inactive: 'INACTIVE',
};

export const customerService = {
  async getAllCustomers(salonId?: string, params: any = {}, ownerId?: string, exportAll = false) {
    const normalizedSearch = normalizeFilterValue(params.search ?? params.q ?? '');
    const rawStatus = normalizeFilterValue(params.status);
    const normalizedStatus = rawStatus ? normalizeEnumToken(rawStatus, customerStatusAliases) : undefined;
    const normalizedSalonId = normalizeFilterValue(salonId && salonId !== 'all' ? salonId : params.salonId);
    const normalizedBranchId = normalizeFilterValue(params.branchId);
    const normalizedVendorId = normalizeFilterValue(params.vendorId);
    const normalizedCountry = normalizeFilterValue(params.country);
    const normalizedCity = normalizeFilterValue(params.city);
    const normalizedState = normalizeFilterValue(params.state);
    const { page, limit, skip } = normalizePagination(params.page, params.limit, { page: 1, limit: 10 });

    const where: any = {
      user: {
        ...(normalizedStatus ? { isActive: normalizedStatus === 'ACTIVE' } : {}),
        ...(normalizedSearch ? { OR: [
          { firstName: { contains: normalizedSearch, mode: 'insensitive' } },
          { lastName: { contains: normalizedSearch, mode: 'insensitive' } },
          { email: { contains: normalizedSearch, mode: 'insensitive' } },
          { phone: { contains: normalizedSearch, mode: 'insensitive' } },
        ] } : {}),
      },
    };

    if (normalizedBranchId) {
      where.OR = [
        { salonId: normalizedBranchId },
        { user: { customerBookings: { some: { branchId: normalizedBranchId } } } },
      ];
    } else if (normalizedSalonId) {
      where.salon = {
        OR: [
          { id: normalizedSalonId },
          { parentId: normalizedSalonId },
        ],
      };
    }

    if (ownerId) {
      const allowedSalons = await prisma.salon.findMany({
        where: { OR: [{ ownerId }, { parent: { ownerId } }] },
        select: { id: true, parentId: true },
      });
      const allowedSalonIds = new Set(allowedSalons.map((salon) => salon.id));

      if (normalizedSalonId && !allowedSalonIds.has(normalizedSalonId)) {
        throw Object.assign(new Error('You do not have access to this salon'), { status: 403, code: 'SALON_ACCESS_DENIED' });
      }

      if (normalizedBranchId) {
        const branch = await prisma.salon.findUnique({
          where: { id: normalizedBranchId },
          select: { id: true, parentId: true, ownerId: true },
        });
        const branchAllowed = branch && (branch.ownerId === ownerId || (branch.parentId && allowedSalonIds.has(branch.parentId)));
        if (!branch) {
          throw { status: 404, message: 'Branch not found' };
        }
        if (!branchAllowed) {
          throw Object.assign(new Error('You do not have access to this branch'), { status: 403, code: 'BRANCH_ACCESS_DENIED' });
        }
      }

      where.AND = [
        ...(where.AND || []),
        {
          salon: {
            OR: [
              { ownerId },
              { parent: { ownerId } },
            ],
          },
        },
      ];
    }

    if (normalizedCountry || normalizedCity || normalizedState || normalizedVendorId) {
      where.AND = [...(where.AND || []), {
        salon: {
          ...(normalizedVendorId ? { ownerId: normalizedVendorId } : {}),
          ...((normalizedCountry || normalizedCity || normalizedState) ? { address: { ...(normalizedCountry && { country: { equals: normalizedCountry, mode: 'insensitive' } }), ...(normalizedCity && { city: { equals: normalizedCity, mode: 'insensitive' } }), ...(normalizedState && { state: { equals: normalizedState, mode: 'insensitive' } }) } } : {}),
        },
      }];
    }

    const createdStart = params.createdFrom ?? params.dateFrom;
    const createdEnd = params.createdTo ?? params.dateTo;
    if (createdStart || createdEnd) {
      const gte = createdStart ? new Date(createdStart) : undefined;
      let lte = createdEnd ? new Date(createdEnd) : undefined;
      if (lte && /^\d{4}-\d{2}-\d{2}$/.test(String(createdEnd).trim())) {
        lte.setHours(23, 59, 59, 999);
      }
      where.createdAt = {
        ...(gte && { gte }),
        ...(lte && { lte }),
      };
    }

    const [customers, total] = await Promise.all([
      prisma.salonCustomer.findMany({
        where,
        include: {
          salon: { select: { id: true, name: true, parentId: true, parent: { select: { id: true, name: true } } } },
          user: { select: { id: true, firstName: true, lastName: true, email: true, phone: true, countryCode: true, gender: true, dob: true, createdAt: true } },
        },
        ...(exportAll ? {} : { skip, take: limit }),
        orderBy: { createdAt: 'desc' },
      }),
      prisma.salonCustomer.count({ where }),
    ]);

    return {
      customers,
      meta: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    };
  },

  async searchCustomers(query: string) {
    return prisma.user.findMany({
      where: {
        OR: [
          { email: { contains: query, mode: 'insensitive' } },
          { phone: { contains: query, mode: 'insensitive' } },
          { firstName: { contains: query, mode: 'insensitive' } },
          { lastName: { contains: query, mode: 'insensitive' } },
        ],
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        countryCode: true,
      },
      take: 10,
    });
  },

  async findOrCreateCustomer(salonId: string, payload: any) {
    const searchConditions: any[] = [];
    if (payload.phone) searchConditions.push({ phone: payload.phone });
    if (payload.email) searchConditions.push({ email: payload.email });

    let user = null;
    if (searchConditions.length > 0) {
      user = await prisma.user.findFirst({
        where: {
          OR: searchConditions,
        },
      });
    }

    if (!user) {
      // Create new user as customer
      user = await prisma.user.create({
        data: {
          firstName: payload.firstName,
          lastName: payload.lastName,
          email: payload.email,
          phone: payload.phone,
          countryCode: payload.countryCode || '+91',
          password: 'Customer@123', // Default password for customers
          source: 'ADMIN',
        },
      });
    }

    // Map user to salon if not already mapped
    const mapping = await prisma.salonCustomer.findUnique({
      where: {
        salonId_userId: {
          salonId,
          userId: user.id,
        },
      },
    });

    if (!mapping) {
      await prisma.salonCustomer.create({
        data: {
          salonId,
          userId: user.id,
        },
      });
    }

    return user;
  },

  async getCustomerById(salonId: string, customerId: string) {
    return prisma.salonCustomer.findUnique({
      where: {
        salonId_userId: {
          salonId,
          userId: customerId,
        },
      },
      include: {
        user: true,
      },
    });
  },

  async getCustomerFullDetails(userId: string, salonId?: string) {
    const where: any = { customerId: userId };
    if (salonId) {
      where.OR = [
        { salonId },
        { branchId: salonId },
      ];
    }

    const [bookings, salonMappings] = await Promise.all([
      prisma.booking.findMany({
        where,
        include: { 
          services: true, 
          payments: true,
          staff: { include: { user: { select: { firstName: true, lastName: true } } } },
          salon: { select: { id: true, name: true } }
        },
        orderBy: { bookingDate: 'desc' }
      }),
      prisma.salonCustomer.findMany({
        where: { userId },
        include: { salon: { select: { id: true, name: true } }, user: true }
      })
    ]);

    if (salonMappings.length === 0) throw { status: 404, message: "Customer not found" };
    const user = salonMappings[0].user;

    const totalBookings = bookings.length;
    const totalAmount = bookings.reduce((sum, b) => sum + b.finalAmount, 0);
    const totalPaid = bookings.reduce((sum, b) => sum + b.totalPaid, 0);
    const balance = totalAmount - totalPaid;

    return {
      customer: user,
      salonsVisited: salonMappings.map(m => m.salon),
      stats: {
        totalBookings,
        totalAmount,
        totalPaid,
        balance
      },
      bookings
    };
  }
};
