export const runtime = 'nodejs';

import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { validateProtectedTeamRouteWithMethod } from '@/lib/auth';
import { ApiResponse } from '@/lib/api-response';
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

