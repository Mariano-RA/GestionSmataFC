export const runtime = 'nodejs';

import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { validateProtectedTeamRouteWithMethod, getClientIp } from '@/lib/auth';
import { ApiResponse } from '@/lib/api-response';
import { createAuditLog } from '@/lib/audit';
import { setParticipantMonthlyStatusesSchema } from '@/lib/schemas';
import { logger } from '@/lib/logger';

/**
 * GET /api/participant-monthly-status?teamId=1&month=YYYY-MM
 * Devuelve snapshots de estado mensual por jugador.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const teamId = parseInt(searchParams.get('teamId') || '0', 10);
    const month = searchParams.get('month');
    const allMonths = searchParams.get('allMonths') === 'true';

    if (!teamId) return ApiResponse.badRequest('teamId is required');

    const auth = await validateProtectedTeamRouteWithMethod(request, db, teamId, 'GET');
    if (!auth.authorized) return ApiResponse.unauthorized(auth.error);

    if (allMonths) {
      const snapshots = await db.participantMonthlyStatus.findMany({
        where: { teamId },
        orderBy: [{ month: 'asc' }, { participantId: 'asc' }],
      });
      return ApiResponse.ok(snapshots);
    }

    if (!month) {
      return ApiResponse.badRequest('month is required when allMonths is false');
    }

    const snapshots = await db.participantMonthlyStatus.findMany({
      where: { teamId, month },
      orderBy: { participantId: 'asc' },
    });
    return ApiResponse.ok(snapshots);
  } catch (error) {
    logger.error('GET /api/participant-monthly-status error', error);
    return ApiResponse.internalError('Error al obtener estado mensual de participantes');
  }
}


/**
 * PUT /api/participant-monthly-status
 * Body: { teamId, month: YYYY-MM, statuses: [{ participantId, status }] }
 * Fija el estado de cada jugador para un mes abierto (no cerrado). Si es el mes más reciente del jugador,
 * también actualiza su último estado para que se arrastre a los meses siguientes.
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null);
    const parsed = setParticipantMonthlyStatusesSchema.safeParse(body);
    if (!parsed.success) return ApiResponse.fromZodError(parsed.error);

    const { teamId, month, statuses } = parsed.data;
    const auth = await validateProtectedTeamRouteWithMethod(request, db, teamId, 'PATCH');
    if (!auth.authorized) return ApiResponse.unauthorized(auth.error);

    const closed = await db.monthlyConfig.findUnique({
      where: { teamId_month: { teamId, month } },
      select: { id: true },
    });
    if (closed) {
      return ApiResponse.badRequest('El mes ya está cerrado; no se pueden cambiar los estados');
    }

    const statusById = new Map(statuses.map((s) => [s.participantId, s.status]));
    const participantIds = Array.from(statusById.keys());
    const [participants, laterSnapshots] = await Promise.all([
      db.participant.findMany({
        where: { teamId, id: { in: participantIds } },
        select: { id: true, name: true, active: true, status: true },
      }),
      db.participantMonthlyStatus.findMany({
        where: { teamId, participantId: { in: participantIds }, month: { gt: month } },
        select: { participantId: true },
      }),
    ]);
    if (participants.length !== participantIds.length) {
      return ApiResponse.badRequest('Hay jugadores que no pertenecen al equipo');
    }
    const hasLaterMonth = new Set(laterSnapshots.map((s) => s.participantId));
    const ip = getClientIp(request) ?? undefined;

    const rows = await db.$transaction(async (tx) => {
      const upserted = await Promise.all(
        participants.map((p) => {
          const status = statusById.get(p.id)!;
          return tx.participantMonthlyStatus.upsert({
            where: { participantId_month: { participantId: p.id, month } },
            update: { status, active: p.active, teamId },
            create: { teamId, participantId: p.id, month, active: p.active, status },
          });
        })
      );
      await Promise.all(
        participants
          .filter((p) => !hasLaterMonth.has(p.id) && p.status !== statusById.get(p.id))
          .map((p) =>
            tx.participant.update({
              where: { id: p.id },
              data: { status: statusById.get(p.id) },
            })
          )
      );
      await createAuditLog(
        {
          teamId,
          userId: auth.userId,
          action: 'UPDATE',
          entity: 'ParticipantMonthlyStatus',
          description: `Estados del mes ${month} actualizados (${participants.length} jugadores)`,
          metadata: {
            month,
            changes: participants.map((p) => ({
              participantId: p.id,
              name: p.name,
              previousStatus: p.status,
              status: statusById.get(p.id),
            })),
          },
          ipAddress: ip,
        },
        tx
      );
      return upserted;
    });

    return ApiResponse.ok(rows);
  } catch (error) {
    logger.error('PUT /api/participant-monthly-status error', error);
    return ApiResponse.internalError('Error al guardar el estado mensual de participantes');
  }
}
