export function normalizeFilterValue(value: unknown): string | undefined {
  if (value === undefined || value === null) return undefined;
  const text = String(value).trim();
  if (!text) return undefined;

  const ignored = new Set([
    'all',
    'ALL',
    'All',
    'all branches',
    'All Branches',
    'all vendors',
    'All Vendors',
    'all salons',
    'All Salons',
    'all cities',
    'All Cities',
    'all countries',
    'All Countries',
  ]);

  return ignored.has(text) ? undefined : text;
}

export function normalizeEnumToken(value: unknown, aliases: Record<string, string> = {}) {
  const normalized = normalizeFilterValue(value);
  if (!normalized) return undefined;

  const compact = normalized.toLowerCase().replace(/[^a-z0-9]+/g, '');
  if (!compact) return undefined;

  const directMatch = Object.entries(aliases).find(([key]) => key.toLowerCase().replace(/[^a-z0-9]+/g, '') === compact);
  return directMatch ? directMatch[1] : normalized.toUpperCase();
}

export function normalizePagination(pageValue: unknown, limitValue: unknown, defaults = { page: 1, limit: 20 }) {
  const page = Number.isFinite(Number(pageValue)) ? Math.max(1, Number(pageValue)) : defaults.page;
  const limit = Number.isFinite(Number(limitValue)) ? Math.min(100, Math.max(1, Number(limitValue))) : defaults.limit;
  return {
    page,
    limit,
    skip: (page - 1) * limit,
  };
}

export function normalizeDateRange(startValue: unknown, endValue: unknown) {
  const start = normalizeFilterValue(startValue);
  const end = normalizeFilterValue(endValue);

  if (!start && !end) return {};

  return {
    ...(start ? { gte: new Date(start) } : {}),
    ...(end ? { lte: new Date(end) } : {}),
  };
}

export function buildScopeFilter(base: Record<string, any>, vendorId?: string, salonId?: string, branchId?: string, country?: string, city?: string, state?: string) {
  const items: Record<string, any>[] = [];

  const scoped: Record<string, any> = { ...base };
  if (vendorId) {
    scoped.ownerId = vendorId;
  }
  if (salonId) {
    scoped.id = salonId;
  }
  if (branchId) {
    scoped.id = branchId;
  }

  if (country || city || state) {
    scoped.address = {
      ...(country ? { country: { equals: country, mode: 'insensitive' } } : {}),
      ...(city ? { city: { equals: city, mode: 'insensitive' } } : {}),
      ...(state ? { state: { equals: state, mode: 'insensitive' } } : {}),
    };
  }

  items.push(scoped);
  return items;
}
