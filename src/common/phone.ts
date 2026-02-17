export function normalizePhone(value?: string | null): string | null {
  if (!value) return null;
  const digits = String(value).replace(/\D+/g, '');
  return digits.length > 0 ? digits : null;
}
