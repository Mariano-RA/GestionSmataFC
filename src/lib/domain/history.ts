import type { Payment } from '@/types';
import type { MonthlyConfig } from '@/types';

export interface MonthlyHistoryItem {
  month: string;
  paid: number;
  required: number;
  debtMonth: number;
  debtAccumulated: number;
}

/** Objetivo = monthlyTarget + rent (o fieldRental si viene de API). */
function objectiveFromConfig(cfg: MonthlyConfig): number {
  const rent = 'rent' in cfg ? cfg.rent : (cfg as { fieldRental?: number }).fieldRental ?? 0;
  return (cfg.monthlyTarget || 0) + rent;
}

/**
 * Obtiene el objetivo mensual (cuota + alquiler) para un mes en el historial.
 */
export function getMonthlyObjectiveForHistory(
  month: string,
  monthlyConfigsSorted: MonthlyConfig[],
  fallbackTarget: number,
  fallbackRent: number
): number {
  const exact = monthlyConfigsSorted.find(cfg => cfg.month === month);
  if (exact) return objectiveFromConfig(exact);
  const previous = monthlyConfigsSorted.filter(cfg => cfg.month < month);
  if (previous.length > 0) return objectiveFromConfig(previous[previous.length - 1]);
  return fallbackTarget + fallbackRent;
}

/**
 * Calcula el historial por mes para un participante (pagos y deuda acumulada).
 */
export function computeMonthlyHistory(
  historyPayments: Payment[],
  historyMonths: string[],
  getRequiredForMonth: (month: string) => number
): MonthlyHistoryItem[] {
  let runningDebt = 0;
  return historyMonths.map(month => {
    const paid = historyPayments
      .filter(p => p.date.startsWith(month))
      .reduce((sum, p) => sum + p.amount, 0);
    const required = getRequiredForMonth(month);
    const debtMonth = Math.max(0, required - paid);
    runningDebt = Math.max(0, runningDebt + required - paid);
    return {
      month,
      paid,
      required,
      debtMonth,
      debtAccumulated: runningDebt,
    };
  });
}
