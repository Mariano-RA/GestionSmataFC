import type { Expense, MonthlyConfig, Participant, ParticipantMonthlyStatus, ParticipantStatus, Payment } from '@/types';
import { normalizeName } from '@/lib/utils';
import { shouldChargeForMonth } from './joinDate';
import { getStatusWeight, resolveMonthlyState, type ResolvedMonthlyState } from './monthlyStatus';
import { computeParticipantsWithDebtStatus, type ParticipantWithDebtStatus } from './debt';

/**
 * Cuentas del mes de un equipo, del lado del servidor.
 *
 * Es la misma lógica que arma `useTeamData` en el navegador (cuota del mes, monto exigido por jugador y deuda),
 * para que el asistente (Hermes) vea los mismos números que la pantalla. Si cambia la regla en el hook,
 * hay que cambiarla acá también: `teamMonth.test.ts` fija los casos principales.
 */

export interface TeamMonthInput {
  /** Jugadores del equipo tal como están en la base (sin resolver el estado del mes). */
  participants: Participant[];
  payments: Payment[];
  expenses: Pick<Expense, 'date' | 'amount' | 'includeInMonthlyShare'>[];
  monthlyStatuses: Pick<ParticipantMonthlyStatus, 'participantId' | 'month' | 'active' | 'status' | 'debtWaived'>[];
  monthlyConfigs: Pick<
    MonthlyConfig,
    'month' | 'monthlyTarget' | 'rent' | 'includedExpenses' | 'effectiveParticipants' | 'closedAt'
  >[];
  /** Objetivo y alquiler del mes elegido: los del mes si tiene config propia, si no los globales. */
  config: { monthlyTarget: number; fieldRental: number };
  /** Mes que se calcula (YYYY-MM). */
  currentMonth: string;
}

export interface TeamMonthState {
  monthlyObjective: number;
  effectiveParticipants: number;
  monthlyShare: number;
  /** Cuánto debe pagar el jugador en un mes (considera alta, estado del mes y condonación). */
  getRequiredAmountForMonth: (p: Participant, month: string) => number;
  /** Jugadores relevantes del mes con lo exigido, lo pagado y la deuda; ordenados como en la pantalla de deudores. */
  status: ParticipantWithDebtStatus[];
  isMonthClosed: (month: string) => boolean;
}

const STATUS_SORT_ORDER: Record<ParticipantStatus, number> = {
  sin_laburo: 0,
  lesionado: 1,
  media_cuota: 2,
  activo: 3,
};

export function computeTeamMonth(input: TeamMonthInput): TeamMonthState {
  const { payments, expenses, monthlyStatuses, monthlyConfigs, config, currentMonth } = input;

  const closedMonths = new Set(monthlyConfigs.filter((cfg) => cfg.closedAt).map((cfg) => cfg.month));
  const snapshotByKey = new Map(monthlyStatuses.map((s) => [`${s.participantId}:${s.month}`, s]));
  const rawById = new Map(input.participants.map((p) => [p.id, p]));

  const getMonthlyState = (p: Participant, month: string): ResolvedMonthlyState => {
    const base = rawById.get(p.id) ?? p;
    return resolveMonthlyState(base, snapshotByKey.get(`${p.id}:${month}`), closedMonths.has(month));
  };

  const participants = input.participants.map((p) => ({ ...p, status: getMonthlyState(p, currentMonth).status }));

  const paidByParticipantMonth = new Map<string, number>();
  for (const pay of payments) {
    const key = `${pay.participantId}:${pay.appliedMonth ?? pay.date.slice(0, 7)}`;
    paidByParticipantMonth.set(key, (paidByParticipantMonth.get(key) ?? 0) + pay.amount);
  }

  const monthIncludedExpenses = expenses
    .filter((e) => e.date.startsWith(currentMonth) && Boolean(e.includeInMonthlyShare))
    .reduce((sum, e) => sum + e.amount, 0);
  const monthlyObjective = (config.monthlyTarget || 0) + (config.fieldRental || 0) + monthIncludedExpenses;

  const effectiveParticipants =
    participants.filter((p) => p.active).reduce((sum, p) => sum + getStatusWeight(p.status), 0) || 1;
  const monthlyShare = monthlyObjective / effectiveParticipants;

  const monthlyConfigsSorted = [...monthlyConfigs].sort((a, b) => a.month.localeCompare(b.month));

  const getObjectiveForMonth = (month: string): number => {
    if (month === currentMonth) return monthlyObjective;
    const exact = monthlyConfigsSorted.find((cfg) => cfg.month === month);
    if (exact) return (exact.monthlyTarget || 0) + (exact.rent || 0) + (exact.includedExpenses || 0);
    const previous = monthlyConfigsSorted.filter((cfg) => cfg.month < month);
    if (previous.length > 0) {
      const last = previous[previous.length - 1];
      return (last.monthlyTarget || 0) + (last.rent || 0) + (last.includedExpenses || 0);
    }
    return monthlyObjective;
  };

  const getEffectiveParticipantsForMonth = (month: string): number => {
    if (month === currentMonth) return effectiveParticipants;
    const exact = monthlyConfigsSorted.find((cfg) => cfg.month === month);
    if (exact?.effectiveParticipants && exact.effectiveParticipants > 0) return exact.effectiveParticipants;
    return effectiveParticipants;
  };

  const getRequiredAmount = (p: Participant): number => {
    if (!p.active) return 0;
    if (p.status === 'sin_laburo') return 0;
    if (p.status === 'lesionado') return monthlyShare / 2;
    if (p.status === 'media_cuota') return monthlyShare / 2;
    return monthlyShare;
  };

  const getRequiredAmountForMonth = (p: Participant, month: string): number => {
    // El alta manda sobre los snapshots: los meses previos al alta nunca generan cuota.
    if (p.joinDate && !shouldChargeForMonth(p.joinDate, month)) return 0;

    const { active, status, debtWaived } = getMonthlyState(p, month);
    if (!active) return 0;
    const objective = getObjectiveForMonth(month);
    const participantsForMonth = getEffectiveParticipantsForMonth(month);
    const share = participantsForMonth > 0 ? objective / participantsForMonth : 0;
    const required = share * getStatusWeight(status);
    // Deuda condonada al cerrar: lo exigido queda en lo pagado (no suma pagos ni genera deuda).
    if (debtWaived) return Math.min(required, paidByParticipantMonth.get(`${p.id}:${month}`) ?? 0);
    return required;
  };

  const historyMonths = Array.from(
    new Set([...monthlyConfigs.filter((cfg) => cfg.month <= currentMonth).map((cfg) => cfg.month), currentMonth])
  ).sort();

  const computed = computeParticipantsWithDebtStatus(participants, payments, currentMonth, getRequiredAmount, {
    getRequiredAmountForMonth,
    historyMonths,
  });

  // Mismo orden que la pantalla de deudores: primero los que no pagaron, luego por estado y por nombre.
  const status = [...computed].sort((a, b) => {
    const aSinPagar = a.paid === 0 ? 0 : 1;
    const bSinPagar = b.paid === 0 ? 0 : 1;
    if (aSinPagar !== bSinPagar) return aSinPagar - bSinPagar;
    const orderA = STATUS_SORT_ORDER[(a.status as ParticipantStatus) ?? 'activo'];
    const orderB = STATUS_SORT_ORDER[(b.status as ParticipantStatus) ?? 'activo'];
    if (orderA !== orderB) return orderA - orderB;
    return normalizeName(a.name).localeCompare(normalizeName(b.name));
  });

  return {
    monthlyObjective,
    effectiveParticipants,
    monthlyShare,
    getRequiredAmountForMonth,
    status,
    isMonthClosed: (month: string) => closedMonths.has(month),
  };
}
