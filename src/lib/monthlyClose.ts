import type { PrismaClient } from '@prisma/client';
import { DEFAULT_CONFIG } from '@/lib/utils';
import { createAuditLog } from '@/lib/audit';

export type MonthlyCloseNumbers = {
  monthlyTarget: number;
  rent: number;
  includedExpenses?: number;
  activeParticipants?: number;
  effectiveParticipants?: number;
  monthlyShare?: number;
};

type TeamParticipantRow = { id: number; active: boolean; status: string | null };

/**
 * Cierra un mes como POST /api/config?month=…: upsert MonthlyConfig + snapshots por jugador.
 * Misma lógica que el handler de config (valores ya validados o calculados).
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
  }
) {
  const { teamId, month, userId, ip, numbers, teamParticipants } = params;
  const {
    monthlyTarget,
    rent,
    includedExpenses,
    activeParticipants,
    effectiveParticipants,
    monthlyShare,
  } = numbers;

  const activeTeamParticipants = teamParticipants.filter((p) => p.active);
  const computedActiveParticipants = activeTeamParticipants.length;
  const computedEffectiveParticipants =
    activeTeamParticipants.reduce(
      (sum, p) =>
        sum +
        (p.status === 'sin_laburo'
          ? 0
          : p.status === 'lesionado'
            ? 0.5
            : p.status === 'media_cuota'
              ? 0.5
              : 1),
      0
    ) || 1;
  const snapshotActiveParticipants = activeParticipants ?? computedActiveParticipants;
  const snapshotEffectiveParticipants = effectiveParticipants ?? computedEffectiveParticipants;
  const snapshotIncludedExpenses = includedExpenses ?? 0;
  const snapshotMonthlyShare =
    monthlyShare ??
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
      teamParticipants.map((participant) =>
        tx.participantMonthlyStatus.upsert({
          where: {
            participantId_month: {
              participantId: participant.id,
              month,
            },
          },
          update: {
            active: participant.active,
            status: participant.status || 'activo',
            teamId,
          },
          create: {
            teamId,
            participantId: participant.id,
            month,
            active: participant.active,
            status: participant.status || 'activo',
          },
        })
      )
    );
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
        },
        ipAddress: ip,
      },
      tx
    );
    return upserted;
  });
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
    select: { id: true, active: true, status: true },
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
