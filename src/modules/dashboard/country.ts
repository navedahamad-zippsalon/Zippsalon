export const INDIA_COUNTRY = 'India';

export function normalizeCountry(value?: string | null): string {
  const raw = (value ?? INDIA_COUNTRY).toString().trim();
  if (!raw) return INDIA_COUNTRY;

  const normalized = raw.toLowerCase().replace(/[^a-z]/g, '');
  if (['india', 'in', 'ind'].includes(normalized)) return INDIA_COUNTRY;

  return INDIA_COUNTRY;
}
