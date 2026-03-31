import type { Participant, Payment } from '@/types';
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

/** Fila agregada del equipo por mes (recaudado y deudas coherentes con el historial por participante). */
export interface TeamMonthlyHistoryRow {
  month: string;
  collected: number;
  debtMonth: number;
  debtAccumulated: number;
}

/**
 * Historial mensual a nivel equipo: recaudado total, suma de faltantes del mes y deuda acumulada
 * (suma de las deudas corridas de cada participante, misma lógica que computeMonthlyHistory).
 * Meses anteriores a `operationalStartMonth` quedan en cero (sin cuotas ni deuda ficticia).
 */
export function computeTeamMonthlyHistory(
  participants: Participant[],
  payments: Payment[],
  historyMonths: string[],
  getRequiredAmountForMonth: (p: Participant, month: string) => number,
  operationalStartMonth: string
): TeamMonthlyHistoryRow[] {
  const sortedMonths = [...historyMonths].sort((a, b) => a.localeCompare(b));
  if (sortedMonths.length === 0) return [];

  const monthsActive = sortedMonths.filter((m) => m >= operationalStartMonth);
  if (monthsActive.length === 0) {
    return sortedMonths.map((month) => ({
      month,
      collected: 0,
      debtMonth: 0,
      debtAccumulated: 0,
    }));
  }

  const perParticipant = participants.map((p) => {
    const participantPayments = payments.filter((pay) => pay.participantId === p.id);
    return computeMonthlyHistory(participantPayments, monthsActive, (month) =>
      getRequiredAmountForMonth(p, month)
    );
  });

  const calcByMonth = new Map<string, { collected: number; debtMonth: number; debtAccumulated: number }>();
  monthsActive.forEach((month, idx) => {
    const collected = payments
      .filter((pay) => pay.date.startsWith(month))
      .reduce((sum, pay) => sum + pay.amount, 0);
    let debtMonth = 0;
    let debtAccumulated = 0;
    for (const hist of perParticipant) {
      const row = hist[idx];
      if (row) {
        debtMonth += row.debtMonth;
        debtAccumulated += row.debtAccumulated;
      }
    }
    calcByMonth.set(month, { collected, debtMonth, debtAccumulated });
  });

  return sortedMonths.map((month) => {
    if (month < operationalStartMonth) {
      return { month, collected: 0, debtMonth: 0, debtAccumulated: 0 };
    }
    const calc = calcByMonth.get(month);
    if (calc) return { month, ...calc };
    return { month, collected: 0, debtMonth: 0, debtAccumulated: 0 };
  });
}
