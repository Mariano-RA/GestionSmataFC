export function getCurrentMonth(): string {
  return formatLocalYearMonth(new Date());
}

export function addMonths(monthStr: string, delta: number): string {
  const [y, m] = monthStr.split('-').map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return formatLocalYearMonth(d);
}

export function getMonthName(m: string): string {
  const [y, mon] = m.split('-').map(Number);
  const d = new Date(y, mon - 1, 1);
  return d.toLocaleDateString('es-AR', { month: 'long' }).toUpperCase();
}

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

/**
 * Convierte Date -> YYYY-MM-DD usando calendario local (sin UTC).
 * Útil para inputs type="date" y para guardar fechas sin corrimientos por zona horaria.
 */
export function formatLocalYMD(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = pad2(date.getMonth() + 1);
  const d = pad2(date.getDate());
  return `${y}-${m}-${d}`;
}

/** Convierte Date -> YYYY-MM usando calendario local (sin UTC). */
export function formatLocalYearMonth(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = pad2(date.getMonth() + 1);
  return `${y}-${m}`;
}

/**
 * Parsea YYYY-MM-DD a Date en medianoche local.
 * Evita el comportamiento de `new Date('YYYY-MM-DD')` que se interpreta como UTC y puede correrse de día.
 */
export function parseYMDToLocalDate(ymd: string): Date {
  const [y, m, d] = ymd.split('-').map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

/**
 * Devuelve la fecha/hora local correspondiente al primer sábado del mes a las 00:00.
 * `month` debe ser YYYY-MM.
 */
export function getFirstSaturdayStartLocal(month: string): Date {
  const [y, mon] = month.split('-').map(Number);
  const firstDay = new Date(y, (mon ?? 1) - 1, 1, 0, 0, 0, 0);
  const dow = firstDay.getDay(); // 0=Dom ... 6=Sáb
  const offsetToSaturday = (6 - dow + 7) % 7;
  return new Date(y, (mon ?? 1) - 1, 1 + offsetToSaturday, 0, 0, 0, 0);
}

/** Último día del mes (local) como YYYY-MM-DD. `month` debe ser YYYY-MM. */
export function getLastDayOfMonthYMD(month: string): string {
  const [y, mon] = month.split('-').map(Number);
  // Día 0 del mes siguiente = último día del mes actual
  const d = new Date(y, (mon ?? 1), 0, 0, 0, 0, 0);
  return formatLocalYMD(d);
}

export function formatNumber(num: number): string {
  return new Intl.NumberFormat('es-AR').format(Math.round(num));
}

export function formatCurrency(num: number): string {
  return '$' + formatNumber(num);
}

export function normalizeName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export const DEFAULT_CONFIG = {
  monthlyTarget: 1510000,
  fieldRental: 310000,
  maxParticipants: 25,
  notes: '',
  expenseCategories: ['Alquiler', 'Arbitraje', 'Equipamiento', 'Otros'] as string[],
};
