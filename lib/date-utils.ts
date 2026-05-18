/**
 * Parse a date string in multiple common formats.
 * Returns a valid Date or null if the format is unrecognized / invalid.
 *
 * Supported formats:
 *   YYYY-MM-DD   (ISO — used by our CSV template)
 *   DD/MM/YYYY   (Ghanaian standard — what schools actually type)
 *   DD-MM-YYYY   (variant with dashes)
 */
export function parseDateFlexible(input: string): Date | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  // 1. ISO: YYYY-MM-DD
  const iso = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(trimmed);
  if (iso) {
    const [, y, m, d] = iso.map(Number);
    const date = new Date(y, m - 1, d);
    if (date.getFullYear() === y && date.getMonth() === m - 1 && date.getDate() === d) {
      return date;
    }
  }

  // 2. DD/MM/YYYY or DD-MM-YYYY
  const dmy = /^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/.exec(trimmed);
  if (dmy) {
    const [, d, m, y] = dmy.map(Number);
    const date = new Date(y, m - 1, d);
    if (date.getFullYear() === y && date.getMonth() === m - 1 && date.getDate() === d) {
      return date;
    }
  }

  // Unrecognized or invalid
  return null;
}
