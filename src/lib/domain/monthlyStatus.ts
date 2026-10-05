import type { ParticipantStatus } from '@/types';
import { addMonths } from '@/lib/utils';

/** Estado de un jugador que se revisa al comenzar cada mes (todo lo que no es `activo`). */
export const REVIEWABLE_STATUSES: ParticipantStatus[] = ['sin_laburo', 'lesionado', 'media_cuota'];

/** Peso del jugador en la división de la cuota: activo 1, lesionado/media cuota 0.5, sin trabajo 0. */
export function getStatusWeight(status?: string | null): number {
  if (status === 'sin_laburo') return 0;
  if (status === 'lesionado') return 0.5;
  if (status === 'media_cuota') return 0.5;
  return 1;
}

export interface MonthlyStatusSnapshot {
  participantId: number;
  month: string;
  active: boolean;
  status?: string | null;
  debtWaived?: boolean | null;
}

export interface ResolvedMonthlyState {
  active: boolean;
  status: ParticipantStatus;
  debtWaived: boolean;
}

/**
 * Estado efectivo de un jugador en un mes.
 * - `status`: el del snapshot del mes si existe; si no, el último estado del jugador (se arrastra).
 * - `active`: en meses cerrados manda el snapshot; en meses abiertos manda el jugador (habilitar/deshabilitar es global).
 */
export function resolveMonthlyState(
  participant: { active: boolean; status?: string | null },
  snapshot: MonthlyStatusSnapshot | undefined,
  monthClosed: boolean
): ResolvedMonthlyState {
  const active = snapshot && monthClosed ? snapshot.active : participant.active;
  const status = (snapshot?.status ?? participant.status ?? 'activo') as ParticipantStatus;
  return { active, status, debtWaived: Boolean(snapshot?.debtWaived) };
}

/**
 * Jugadores habilitados con estado distinto de `activo` en el mes (los que hay que revisar al comenzarlo).
 * `participants` ya debe tener el estado resuelto para ese mes.
 */
export function getParticipantsForStatusReview<
  T extends { id: number; active: boolean; status?: string | null }
>(participants: T[]): T[] {
  return participants.filter(
    (p) => p.active && REVIEWABLE_STATUSES.includes((p.status ?? 'activo') as ParticipantStatus)
  );
}

/** De los que hay que revisar, los que todavía no tienen estado confirmado (snapshot) en el mes. */
export function getPendingStatusReview<
  T extends { id: number; active: boolean; status?: string | null }
>(participants: T[], month: string, snapshots: MonthlyStatusSnapshot[]): T[] {
  const withSnapshot = new Set(
    snapshots.filter((s) => s.month === month).map((s) => s.participantId)
  );
  return getParticipantsForStatusReview(participants).filter((p) => !withSnapshot.has(p.id));
}

/**
 * Un mes "comienza" (y se ofrece la revisión de estados) si está abierto y es el mes calendario actual
 * o el siguiente al último mes cerrado.
 */
export function isStatusReviewMonth(
  month: string,
  closedMonths: string[],
  calendarMonth: string
): boolean {
  if (closedMonths.includes(month)) return false;
  if (month === calendarMonth) return true;
  if (closedMonths.length === 0) return false;
  const lastClosed = closedMonths.reduce((max, m) => (m > max ? m : max), closedMonths[0]);
  return month === addMonths(lastClosed, 1);
}
