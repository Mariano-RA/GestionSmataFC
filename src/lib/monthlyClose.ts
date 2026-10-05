import type { PrismaClient } from '@prisma/client';
import { DEFAULT_CONFIG } from '@/lib/utils';
import { shouldChargeForMonth } from '@/lib/domain/joinDate';
import { createAuditLog } from '@/lib/audit';
import { getStatusWeight } from '@/lib/domain/monthlyStatus';
import type { SeasonClose } from '@/types';

export type MonthlyCloseNumbers = {
  monthlyTarget: number;
  rent: number;
  includedExpenses?: number;
  activeParticipants?: number;
  effectiveParticipants?: number;
  monthlyShare?: number;
};

export type TeamParticipantRow = {
  id: number;
  active: boolean;
  status: string | null;
  joinDate: Date;
};

/**
 * Cierra un mes como POST /api/config?month=…: upsert MonthlyConfig + snapshots por jugador.
 * Misma lógica que el handler de config (valores ya validados o calculados).
 * Jugadores con joinDate posterior al mes quedan con snapshot active=false y no entran en efectivos.
 * El estado de cada jugador es el elegido para ese mes (snapshot existente) o, si no hay, su último estado.
 * `waivedParticipantIds`: jugadores a los que se les condona la deuda del mes (no cuenta como pago).
 * `seasonClose` (último mes del campeonato): condona la deuda de los meses indicados por jugador y,
 * después de congelar el mes, deshabilita a los que no siguen.
 */
export async function runMonthlyClose(
  prisma: PrismaClient,
  params: {
    teamId: number;
    month: string;
    userId: number;
    ip?: string;
    numbers: MonthlyCloseNumbers;
    teamParticipants: TeamParticipantRow[];
    waivedParticipantIds?: number[];
    seasonClose?: SeasonClose;
  }
) {
  const { teamId, month, userId, ip, numbers, waivedParticipantIds = [], seasonClose } = params;
  const { monthlyTarget, rent, includedExpenses } = numbers;

  const existingSnapshots = await prisma.participantMonthlyStatus.findMany({
    where: { teamId, month },
    select: { participantId: true, status: true },
  });
  const monthStatusById = new Map(existingSnapshots.map((s) => [s.participantId, s.status]));
  const teamParticipants = params.teamParticipants.map((p) => ({
    ...p,
    status: monthStatusById.get(p.id) ?? p.status,
  }));
  const teamParticipantById = new Map(params.teamParticipants.map((p) => [p.id, p]));
  // Solo jugadores del equipo y meses hasta el que se cierra.
  const seasonWaivers = (seasonClose?.waiveDebt ?? [])
    .filter((w) => teamParticipantById.has(w.participantId))
    .map((w) => ({ participantId: w.participantId, months: w.months.filter((m) => m <= month) }));
  const deactivateIds = (seasonClose?.deactivateParticipantIds ?? []).filter((id) =>
    teamParticipantById.has(id)
  );
  const waivedIds = new Set([
    ...waivedParticipantIds,
    ...seasonWaivers.filter((w) => w.months.includes(month)).map((w) => w.participantId),
  ]);
  const previousMonthWaivers = seasonWaivers.flatMap((w) =>
    w.months.filter((m) => m !== month).map((m) => ({ participantId: w.participantId, month: m }))
  );

  const chargeableParticipants = teamParticipants.filter((p) =>
    shouldChargeForMonth(p.joinDate, month)
  );
  const activeTeamParticipants = chargeableParticipants.filter((p) => p.active);
  const computedActiveParticipants = activeTeamParticipants.length;
  const computedEffectiveParticipants =
    activeTeamParticipants.reduce((sum, p) => sum + getStatusWeight(p.status), 0) || 1;
  // Siempre calcular desde jugadores chargeables por joinDate (no inflar meses pasados).
  const snapshotActiveParticipants = computedActiveParticipants;
  const snapshotEffectiveParticipants = computedEffectiveParticipants;
  const snapshotIncludedExpenses = includedExpenses ?? 0;
  const snapshotMonthlyShare =
    (monthlyTarget + rent + snapshotIncludedExpenses) /
    (snapshotEffectiveParticipants > 0 ? snapshotEffectiveParticipants : 1);

  return prisma.$transaction(async (tx) => {
    const upserted = await tx.monthlyConfig.upsert({
      where: { teamId_month: { teamId: teamId, month } },
      update: {
        monthlyTarget,
        rent,
        includedExpenses: snapshotIncludedExpenses,
        activeParticipants: snapshotActiveParticipants,
        effectiveParticipants: snapshotEffectiveParticipants,
        monthlyShare: snapshotMonthlyShare,
      },
      create: {
        teamId,
        month,
        monthlyTarget,
        rent,
        includedExpenses: snapshotIncludedExpenses,
        activeParticipants: snapshotActiveParticipants,
        effectiveParticipants: snapshotEffectiveParticipants,
        monthlyShare: snapshotMonthlyShare,
      },
    });
    await Promise.all(
      teamParticipants.map((participant) => {
        const chargesThisMonth = shouldChargeForMonth(participant.joinDate, month);
        const snapshotActive = chargesThisMonth ? participant.active : false;
        const snapshotStatus = participant.status || 'activo';
        const waived = waivedIds.has(participant.id);
        return tx.participantMonthlyStatus.upsert({
          where: {
            participantId_month: {
              participantId: participant.id,
              month,
            },
          },
          update: {
            active: snapshotActive,
            status: snapshotStatus,
            teamId,
            ...(waived ? { debtWaived: true } : {}),
          },
          create: {
            teamId,
            participantId: participant.id,
            month,
            active: snapshotActive,
            status: snapshotStatus,
            debtWaived: waived,
          },
        });
      })
    );
    await Promise.all(
      previousMonthWaivers.map(({ participantId, month: waivedMonth }) => {
        const participant = teamParticipantById.get(participantId)!;
        return tx.participantMonthlyStatus.upsert({
          where: { participantId_month: { participantId, month: waivedMonth } },
          update: { debtWaived: true },
          create: {
            teamId,
            participantId,
            month: waivedMonth,
            active: participant.active,
            status: participant.status || 'activo',
            debtWaived: true,
          },
        });
      })
    );
    if (deactivateIds.length > 0) {
      await tx.participant.updateMany({
        where: { teamId, id: { in: deactivateIds } },
        data: { active: false },
      });
    }
    if (seasonClose) {
      await createAuditLog(
        {
          teamId,
          userId,
          action: 'UPDATE',
          entity: 'Season',
          description: `Campeonato cerrado en ${month}: ${seasonWaivers.length} deudas condonadas, ${deactivateIds.length} jugadores deshabilitados`,
          metadata: { month, waiveDebt: seasonWaivers, deactivateParticipantIds: deactivateIds },
          ipAddress: ip,
        },
        tx
      );
    }
    await createAuditLog(
      {
        teamId,
        userId,
        action: 'UPDATE',
        entity: 'MonthlyConfig',
        entityId: upserted.id,
        description: `Configuración mensual actualizada: ${month}`,
        metadata: {
          month,
          monthlyTarget,
          rent,
          includedExpenses: snapshotIncludedExpenses,
          activeParticipants: snapshotActiveParticipants,
          effectiveParticipants: snapshotEffectiveParticipants,
          monthlyShare: snapshotMonthlyShare,
          ...(waivedIds.size > 0 ? { waivedParticipantIds: Array.from(waivedIds) } : {}),
        },
        ipAddress: ip,
      },
      tx
    );
    return upserted;
  }, { timeout: 30000 });
}

async function loadGlobalTeamTargetAndRent(prisma: PrismaClient, teamId: number) {
  const configEntries = await prisma.config.findMany({
    where: { teamId },
  });
  const config: Record<string, unknown> = { ...DEFAULT_CONFIG };
  configEntries.forEach((entry) => {
    try {
      config[entry.key] = JSON.parse(entry.value);
    } catch {
      config[entry.key] = entry.value;
    }
  });
  const monthlyTarget = Math.max(1, Number(config.monthlyTarget) || DEFAULT_CONFIG.monthlyTarget);
  const rent = Math.max(0, Number(config.fieldRental) ?? DEFAULT_CONFIG.fieldRental);
  return { monthlyTarget, rent };
}

/**
 * Calcula objetivo/renta desde Config global y gastos incluidos en cuota del mes; cierra el mes.
 * Usado tras limpiar snapshots desde admin.
 */
export async function closeMonthFromDatabaseState(
  prisma: PrismaClient,
  teamId: number,
  month: string,
  userId: number,
  ip?: string
) {
  const teamParticipants = await prisma.participant.findMany({
    where: { teamId },
    select: { id: true, active: true, status: true, joinDate: true },
  });
  const { monthlyTarget, rent } = await loadGlobalTeamTargetAndRent(prisma, teamId);
  const expenses = await prisma.expense.findMany({
    where: {
      teamId,
      date: { startsWith: month },
      includeInMonthlyShare: true,
    },
    select: { amount: true },
  });
  const includedExpenses = expenses.reduce((s, e) => s + e.amount, 0);

  return runMonthlyClose(prisma, {
    teamId,
    month,
    userId,
    ip,
    numbers: {
      monthlyTarget,
      rent,
      includedExpenses,
    },
    teamParticipants,
  });
}
