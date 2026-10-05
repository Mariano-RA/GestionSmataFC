import type { Participant, Payment } from '@/types';
import { addMonths, parseYMDToLocalDate } from '@/lib/utils';
import { computeMonthlyHistory, type MonthlyHistoryItem } from './history';

export interface ParticipantWithDebtStatus extends Participant {
  required: number;
  paid: number;
  debt: number;
  previousDebt: number;
  totalDebt: number;
  paymentHistory: Payment[];
}

interface ComputeDebtOptions {
  getRequiredAmountForMonth?: (p: Participant, month: string) => number;
  historyMonths?: string[];
}

/**
 * Calcula el estado de deuda de cada participante activo para el mes dado.
 * Funciones puras y testeables.
 */
export function computeParticipantsWithDebtStatus(
  participants: Participant[],
  payments: Payment[],
  currentMonth: string,
  getRequiredAmount: (p: Participant) => number,
  options?: ComputeDebtOptions
): ParticipantWithDebtStatus[] {
  const getPayMonth = (pay: Payment) => pay.appliedMonth ?? pay.date.slice(0, 7);
  return participants
    .map(p => {
      const baseRequired = getRequiredAmount(p);
      const participantPayments = payments.filter(pay => pay.participantId === p.id);
      const paidThisMonth = participantPayments
        .filter(pay => getPayMonth(pay) === currentMonth)
        .reduce((sum, pay) => sum + pay.amount, 0);

      const monthPayments = participantPayments
        .filter(pay => getPayMonth(pay) === currentMonth)
        .sort((a, b) => parseYMDToLocalDate(b.date).getTime() - parseYMDToLocalDate(a.date).getTime());

      const requiredThisMonth =
        options?.getRequiredAmountForMonth?.(p, currentMonth) ?? baseRequired;
      const debtThisMonth = Math.max(0, requiredThisMonth - paidThisMonth);

      const monthsWithActivity = new Set(participantPayments.map(getPayMonth));
      monthsWithActivity.add(currentMonth);
      options?.historyMonths?.forEach((month) => {
        if (month <= currentMonth) monthsWithActivity.add(month);
      });
      const allMonths = Array.from(monthsWithActivity).sort();
      let totalDebt = 0;
      allMonths.forEach(month => {
        const requiredForMonth = options?.getRequiredAmountForMonth?.(p, month) ?? baseRequired;
        const paidInMonth = participantPayments
          .filter(pay => getPayMonth(pay) === month)
          .reduce((sum, pay) => sum + pay.amount, 0);
        totalDebt += Math.max(0, requiredForMonth - paidInMonth);
      });
      const previousDebt = Math.max(0, totalDebt - debtThisMonth);

      return {
        ...p,
        required: requiredThisMonth,
        paid: paidThisMonth,
        debt: debtThisMonth,
        previousDebt,
        totalDebt,
        paymentHistory: monthPayments,
      };
    })
    .filter((p) => {
      // Mostrar solo participantes relevantes para el mes (evita colar inactivos sin cuota)
      if (p.required > 0) return true;
      if (p.paid > 0) return true;
      // Activos sin trabajo: cuota 0 pero deben listarse (p. ej. copiar WhatsApp)
      if (p.active && p.status === 'sin_laburo') return true;
      return false;
    })
    .sort((a, b) => b.debt - a.debt);
}

/**
 * Meses con deuda pendiente de un jugador hasta `upToMonth` inclusive.
 * Mismos meses y criterio que `totalDebt` en `computeParticipantsWithDebtStatus`
 * (meses con pagos + `historyMonths` + `upToMonth`; faltante por mes sin compensar entre meses).
 */
export function computeOutstandingDebtByMonth(
  participant: Participant,
  payments: Payment[],
  upToMonth: string,
  historyMonths: string[],
  getRequiredAmountForMonth: (p: Participant, month: string) => number
): { month: string; debt: number }[] {
  const getPayMonth = (pay: Payment) => pay.appliedMonth ?? pay.date.slice(0, 7);
  const participantPayments = payments.filter((pay) => pay.participantId === participant.id);
  const months = new Set([...participantPayments.map(getPayMonth), ...historyMonths, upToMonth]);
  return Array.from(months)
    .filter((month) => month <= upToMonth)
    .sort()
    .map((month) => {
      const paid = participantPayments
        .filter((pay) => getPayMonth(pay) === month)
        .reduce((sum, pay) => sum + pay.amount, 0);
      return { month, debt: Math.max(0, getRequiredAmountForMonth(participant, month) - paid) };
    })
    .filter((row) => row.debt > 0);
}

export type DebtFilterType = 'all' | 'high' | 'medium' | 'completed';

/** Cinco meses consecutivos: cuatro anteriores al mes de trabajo del equipo + el mes actual. */
export function buildDebtMatrixMonths(currentMonth: string): string[] {
  return [-4, -3, -2, -1, 0]
    .map((d) => addMonths(currentMonth, d))
    .sort((a, b) => a.localeCompare(b));
}

/**
 * Deuda por mes para la matriz de deudores; misma lógica que el historial individual (`computeMonthlyHistory`).
 */
export function computeParticipantDebtMatrixRow(
  participant: Participant,
  payments: Payment[],
  matrixMonths: string[],
  getRequiredAmountForMonth: (p: Participant, month: string) => number
): MonthlyHistoryItem[] {
  const participantPayments = payments.filter((pay) => pay.participantId === participant.id);
  return computeMonthlyHistory(participantPayments, matrixMonths, (month) =>
    getRequiredAmountForMonth(participant, month)
  );
}

/**
 * Filtra la lista de participantes con estado de deuda según el tipo de filtro.
 */
export function filterDebtorsByType(
  allParticipantsStatus: ParticipantWithDebtStatus[],
  filterType: DebtFilterType
): ParticipantWithDebtStatus[] {
  const debtors = allParticipantsStatus.filter(p => p.debt > 0);
  if (filterType === 'all') return debtors;
  if (filterType === 'high') {
    return debtors.filter(p => p.required > 0 && p.debt > p.required * 0.5);
  }
  if (filterType === 'medium') {
    return debtors.filter(p => p.debt > 0 && (p.required <= 0 || p.debt <= p.required * 0.5));
  }
  if (filterType === 'completed') {
    return allParticipantsStatus.filter(p => p.debt === 0);
  }
  return debtors;
}
