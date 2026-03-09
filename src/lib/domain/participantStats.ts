import type { Participant, Payment } from '@/types';

export interface ParticipantPaymentStat {
  id: number;
  name: string;
  paid: number;
  required: number;
  missing: number;
  percentage: number;
}

/**
 * Calcula por cada participante activo: lo pagado en el mes, lo requerido, lo faltante y porcentaje.
 */
export function computeParticipantPaymentStats(
  participants: Participant[],
  payments: Payment[],
  currentMonth: string,
  getRequiredAmount: (p: Participant) => number
): ParticipantPaymentStat[] {
  const active = participants.filter(p => p.active);
  return active
    .map(p => {
      const paid = payments
        .filter(pay => pay.participantId === p.id && pay.date.startsWith(currentMonth))
        .reduce((sum, pay) => sum + pay.amount, 0);
      const required = getRequiredAmount(p);
      const missing = Math.max(0, required - paid);
      const percentage = required > 0 ? (paid / required) * 100 : 100;
      return {
        id: p.id,
        name: p.name,
        paid,
        required,
        missing,
        percentage,
      };
    })
    .sort((a, b) => b.paid - a.paid);
}
