export const runtime = 'nodejs';

import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { validateProtectedTeamRouteWithMethod, getClientIp } from '@/lib/auth';
import { createAuditLog } from '@/lib/audit';
import { createParticipantSchema } from '@/lib/schemas';
import { ApiResponse } from '@/lib/api-response';
import { logger } from '@/lib/logger';

// GET all participants (opcional: ?limit=&offset= para paginación)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const teamId = parseInt(searchParams.get('teamId') || '0');
    const limitParam = searchParams.get('limit');
    const offsetParam = searchParams.get('offset');

    if (!teamId) {
      return ApiResponse.badRequest('teamId is required');
    }

    const auth = await validateProtectedTeamRouteWithMethod(request, db, teamId, 'GET');
    if (!auth.authorized) {
      return ApiResponse.unauthorized(auth.error);
    }

    const usePagination = limitParam != null || offsetParam != null;
    const limit = limitParam != null ? Math.min(500, Math.max(1, parseInt(limitParam, 10) || 100)) : undefined;
    const offset = offsetParam != null ? Math.max(0, parseInt(offsetParam, 10) || 0) : undefined;

    const where = { teamId };

    if (usePagination && (limit != null || offset != null)) {
      const [participants, total] = await Promise.all([
        db.participant.findMany({
          where,
          orderBy: { joinDate: 'desc' },
          take: limit ?? 100,
          skip: offset ?? 0,
        }),
        db.participant.count({ where }),
      ]);
      return ApiResponse.ok({ data: participants, total, limit: limit ?? 100, offset: offset ?? 0 });
    }

    const participants = await db.participant.findMany({
      where,
      orderBy: { joinDate: 'desc' },
    });
    return ApiResponse.ok(participants);
  } catch (error) {
    logger.error('GET /api/participants error', error);
    return ApiResponse.internalError('Failed to fetch participants');
  }
}

// POST create participant
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validation = createParticipantSchema.safeParse(body);
    if (!validation.success) {
      return ApiResponse.fromZodError(validation.error);
    }

    const { teamId, name, phone, notes } = validation.data;

    // Validar autenticación, acceso al equipo y permiso de escritura
    const auth = await validateProtectedTeamRouteWithMethod(request, db, teamId, 'POST');
    if (!auth.authorized) {
      return ApiResponse.unauthorized(auth.error);
    }

    const userId = auth.userId;
    const ip = getClientIp(request) ?? undefined;

    const participant = await db.$transaction(async (tx) => {
      const created = await tx.participant.create({
        data: {
          teamId,
          name,
          phone: phone || null,
          notes: notes || null,
        },
      });
      await createAuditLog(
        {
          teamId,
          userId,
          action: 'CREATE',
          entity: 'Participant',
          entityId: created.id,
          description: `Participante creado: ${created.name}`,
          metadata: { name, phone, notes },
          ipAddress: ip,
        },
        tx
      );
      return created;
    });

    return ApiResponse.created(participant);
  } catch (error) {
    logger.error('POST /api/participants error', error);
    return ApiResponse.internalError('Failed to create participant');
  }
}
