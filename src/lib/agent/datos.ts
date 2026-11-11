import { db } from '@/lib/db';
import { DEFAULT_CONFIG } from '@/lib/utils';
import type { Participant, ParticipantStatus, Payment } from '@/types';
import type { TeamMonthInput } from '@/lib/domain/teamMonth';

/** Zona horaria de Nano y de los equipos: define qué es "hoy" y "el mes actual". */
export const ZONA_HORARIA = 'America/Argentina/Cordoba';

/** Fecha (YYYY-MM-DD) y mes (YYYY-MM) de hoy en Córdoba, sin depender de la zona horaria del servidor. */
export function hoyEnCordoba(ahora: Date = new Date()): { fecha: string; mes: string } {
  const fecha = new Intl.DateTimeFormat('en-CA', {
    timeZone: ZONA_HORARIA,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(ahora);
  return { fecha, mes: fecha.slice(0, 7) };
}

function numeroConfig(valor: unknown, porDefecto: number): number {
  const n = Number(valor);
  return Number.isFinite(n) ? n : porDefecto;
}

/** Lee de la base todo lo que necesita `computeTeamMonth` para un equipo y un mes. */
export async function cargarDatosEquipo(teamId: number, mes: string): Promise<TeamMonthInput> {
  const [participantes, pagos, gastos, estados, configsMensuales, configGlobal] = await Promise.all([
    db.participant.findMany({ where: { teamId }, orderBy: { joinDate: 'desc' } }),
    db.payment.findMany({ where: { teamId }, orderBy: { date: 'desc' } }),
    db.expense.findMany({ where: { teamId }, select: { date: true, amount: true, includeInMonthlyShare: true } }),
    db.participantMonthlyStatus.findMany({ where: { teamId } }),
    db.monthlyConfig.findMany({ where: { teamId }, orderBy: { month: 'asc' } }),
    db.config.findMany({ where: { teamId } }),
  ]);

  // Configuración global: mismos valores por defecto que GET /api/config.
  const global: Record<string, unknown> = { ...DEFAULT_CONFIG };
  for (const entrada of configGlobal) {
    try {
      global[entrada.key] = JSON.parse(entrada.value);
    } catch {
      global[entrada.key] = entrada.value;
    }
  }
  const objetivoGlobal = Number(global.monthlyTarget) || DEFAULT_CONFIG.monthlyTarget;
  const alquilerGlobal = numeroConfig(global.fieldRental, DEFAULT_CONFIG.fieldRental);

  // Si el mes tiene config propia manda; si no, la global (igual que la pantalla).
  const delMes = configsMensuales.find((c) => c.month === mes);

  const participants: Participant[] = participantes.map((p) => ({
    id: p.id,
    teamId: p.teamId,
    name: p.name,
    phone: p.phone ?? undefined,
    notes: p.notes ?? undefined,
    active: p.active,
    status: p.status as ParticipantStatus | null,
    joinDate: p.joinDate.toISOString(),
    createdAt: p.createdAt.toISOString(),
  }));

  const payments: Payment[] = pagos.map((p) => ({
    id: p.id,
    teamId: p.teamId,
    participantId: p.participantId,
    date: p.date,
    appliedMonth: p.appliedMonth,
    amount: p.amount,
    method: p.method ?? undefined,
    note: p.note ?? undefined,
    recordedAt: p.recordedAt.toISOString(),
  }));

  return {
    participants,
    payments,
    expenses: gastos.map((g) => ({ date: g.date, amount: g.amount, includeInMonthlyShare: g.includeInMonthlyShare })),
    monthlyStatuses: estados.map((s) => ({
      participantId: s.participantId,
      month: s.month,
      active: s.active,
      status: s.status as ParticipantStatus | null,
      debtWaived: s.debtWaived,
    })),
    monthlyConfigs: configsMensuales.map((c) => ({
      month: c.month,
      monthlyTarget: c.monthlyTarget,
      rent: c.rent,
      includedExpenses: c.includedExpenses,
      effectiveParticipants: c.effectiveParticipants,
      closedAt: c.closedAt ? c.closedAt.toISOString() : null,
    })),
    config: {
      monthlyTarget: delMes?.monthlyTarget ?? objetivoGlobal,
      fieldRental: delMes?.rent ?? alquilerGlobal,
    },
    currentMonth: mes,
  };
}
