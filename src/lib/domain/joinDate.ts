import { formatLocalYearMonth } from '@/lib/utils';

/**
 * Mes de alta (YYYY-MM) en calendario local.
 * Evita usar `iso.slice(0, 7)` / `toISOString().slice(0, 7)` que desplazan el mes por UTC.
 */
export function getJoinMonthLocal(joinDate: string | Date): string {
  const d = typeof joinDate === 'string' ? new Date(joinDate) : joinDate;
  return formatLocalYearMonth(d);
}

/**
 * Si el jugador debe pagar cuota en `month` (YYYY-MM) según su fecha de alta.
 * Cobra desde el mes local de alta inclusive; meses anteriores → no.
 */
export function shouldChargeForMonth(joinDate: string | Date, month: string): boolean {
  return month >= getJoinMonthLocal(joinDate);
}
