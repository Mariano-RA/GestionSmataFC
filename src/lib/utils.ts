export function getCurrentMonth(): string {
  return new Date().toISOString().slice(0, 7);
}

export function addMonths(monthStr: string, delta: number): string {
  const [y, m] = monthStr.split('-').map(Number);
  const d = new Date(y, m - 1 + delta);
  return d.toISOString().slice(0, 7);
}

export function getMonthName(m: string): string {
  const [y, mon] = m.split('-').map(Number);
  const d = new Date(y, mon - 1, 1);
  return d.toLocaleDateString('es-AR', { month: 'long', year: 'numeric' });
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
  notes: ''
};
