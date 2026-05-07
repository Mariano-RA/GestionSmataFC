export const runtime = 'nodejs';

import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { validateRequestAuth, validateSuperAdmin, getClientIp } from '@/lib/auth';
import { adminClearTeamSnapshotsSchema } from '@/lib/schemas';
import { ApiResponse } from '@/lib/api-response';
import { createAuditLog } from '@/lib/audit';
import { logger } from '@/lib/logger';
import { closeMonthFromDatabaseState } from '@/lib/monthlyClose';

/**
 * POST /api/admin/participant-monthly-status/clear
 * Super admin only: elimina TODOS los ParticipantMonthlyStatus de los equipos indicados.
 * Pagos, jugadores y configuración global no se tocan. Opcional: cerrar mes(es) tras borrar.
 */
export async function POST(request: NextRequest) {
  try {
    const auth = validateRequestAuth(request);
    if (!auth.authorized) {
      return ApiResponse.unauthorized(auth.error);
    }

    const isSuperAdmin = await validateSuperAdmin(db, auth.userId);
    if (!isSuperAdmin) {
      return ApiResponse.forbidden('Solo super administradores');
    }

    const body = await request.json().catch(() => null);
    const parsed = adminClearTeamSnapshotsSchema.safeParse(body);
    if (!parsed.success) {
      return ApiResponse.fromZodError(parsed.error);
    }

    const { teamIds, closeMonths: closeMonthsRaw } = parsed.data;
    const uniqueTeamIds = Array.from(new Set(teamIds));
    const uniqueCloseMonths = closeMonthsRaw?.length
      ? Array.from(new Set(closeMonthsRaw)).sort()
      : [];
    const ip = getClientIp(request) ?? undefined;

    const teams = await db.team.findMany({
      where: { id: { in: uniqueTeamIds } },
      select: { id: true, name: true },
    });

    if (teams.length !== uniqueTeamIds.length) {
      const found = new Set(teams.map((t) => t.id));
      const missing = uniqueTeamIds.filter((id) => !found.has(id));
      return ApiResponse.badRequest(
        `Equipos no encontrados: ${missing.join(', ')}`
      );
    }

    const result = await db.participantMonthlyStatus.deleteMany({
      where: { teamId: { in: uniqueTeamIds } },
    });

    await createAuditLog({
      teamId: uniqueTeamIds[0],
      userId: auth.userId,
      action: 'DELETE',
      entity: 'ParticipantMonthlyStatus',
      description: `Eliminación masiva de snapshots mensuales (${result.count} filas) para equipos: ${uniqueTeamIds.join(', ')}`,
      metadata: {
        teamIds: uniqueTeamIds,
        deletedCount: result.count,
        teamNames: teams.map((t) => ({ id: t.id, name: t.name })),
        closeMonthsRequested: uniqueCloseMonths,
      },
      ipAddress: ip,
    });

    const monthsClosed: { teamId: number; month: string }[] = [];
    for (const tid of uniqueTeamIds) {
      for (const m of uniqueCloseMonths) {
        await closeMonthFromDatabaseState(db, tid, m, auth.userId, ip);
        monthsClosed.push({ teamId: tid, month: m });
      }
    }

    return ApiResponse.ok({
      deletedCount: result.count,
      teamIds: uniqueTeamIds,
      monthsClosed,
    });
  } catch (error) {
    logger.error('POST /api/admin/participant-monthly-status/clear error', error);
    return ApiResponse.internalError('Error al borrar snapshots');
  }
}
