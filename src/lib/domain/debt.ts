import type { Participant, Payment } from '@/types';

export interface ParticipantWithDebtStatus extends Participant {
  required: number;
  paid: number;
  debt: number;
  previousDebt: number;
  totalDebt: number;
  paymentHistory: Payment[];
}

/**
 * Calcula el estado de deuda de cada participante activo para el mes dado.
 * Funciones puras y testeables.
 */
export function computeParticipantsWithDebtStatus(
  participants: Participant[],
  payments: Payment[],
  currentMonth: string,
  getRequiredAmount: (p: Participant) => number
): ParticipantWithDebtStatus[] {
  return participants
    .filter(p => p.active)
    .map(p => {
      const required = getRequiredAmount(p);
      const participantPayments = payments.filter(pay => pay.participantId === p.id);
      const paidThisMonth = participantPayments
        .filter(pay => pay.date.startsWith(currentMonth))
        .reduce((sum, pay) => sum + pay.amount, 0);

      const monthPayments = participantPayments
        .filter(pay => pay.date.startsWith(currentMonth))
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      const debtThisMonth = Math.max(0, required - paidThisMonth);

      const monthsWithActivity = new Set(participantPayments.map(pay => pay.date.slice(0, 7)));
      monthsWithActivity.add(currentMonth);
      const allMonths = Array.from(monthsWithActivity).sort();
      let totalDebt = 0;
      allMonths.forEach(month => {
        const paidInMonth = participantPayments
          .filter(pay => pay.date.startsWith(month))
          .reduce((sum, pay) => sum + pay.amount, 0);
        totalDebt += Math.max(0, required - paidInMonth);
      });
      const previousDebt = Math.max(0, totalDebt - debtThisMonth);

      return {
        ...p,
        required,
        paid: paidThisMonth,
        debt: debtThisMonth,
        previousDebt,
        totalDebt,
        paymentHistory: monthPayments,
      };
    })
    .sort((a, b) => b.debt - a.debt);
}

export type DebtFilterType = 'all' | 'high' | 'medium' | 'completed';

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
