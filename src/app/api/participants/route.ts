export const runtime = 'nodejs';

import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { validateProtectedTeamRoute, getClientIp } from '@/lib/auth';
import { createParticipantSchema } from '@/lib/schemas';
import { ApiResponse } from '@/lib/api-response';
import { logger } from '@/lib/logger';

// GET all participants
export async function GET(request: NextRequest) {
  try {
    // Validar JWT y acceso al equipo
    const { searchParams } = new URL(request.url);
    const teamId = parseInt(searchParams.get('teamId') || '0');

    if (!teamId) {
      return ApiResponse.badRequest('teamId is required');
    }

    // Validar autenticación y acceso al equipo
    const auth = await validateProtectedTeamRoute(request, db, teamId);
    if (!auth.authorized) {
      return ApiResponse.unauthorized(auth.error);
    }

    const participants = await db.participant.findMany({
      where: { teamId },
      orderBy: { joinDate: 'desc' }
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

    // Validar autenticación y acceso al equipo
    const auth = await validateProtectedTeamRoute(request, db, teamId);
    if (!auth.authorized) {
      return ApiResponse.unauthorized(auth.error);
    }

    const userId = auth.userId;

    const participant = await db.participant.create({
      data: {
        teamId,
        name,
        phone: phone || null,
        notes: notes || null,
      }
    });

    // Crear log de auditoría
    await db.auditLog.create({
      data: {
        teamId,
        userId: userId || null,
        action: 'CREATE',
        entity: 'Participant',
        entityId: participant.id,
        description: `Participante creado: ${participant.name}`,
        metadata: JSON.stringify({ name, phone, notes }),
        ipAddress: getClientIp(request) || null,
      },
    });

    return ApiResponse.created(participant);
  } catch (error) {
    logger.error('POST /api/participants error', error);
    return ApiResponse.internalError('Failed to create participant');
  }
}
