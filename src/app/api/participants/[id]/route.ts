export const runtime = 'nodejs';

import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { validateProtectedTeamRoute, getClientIp } from '@/lib/auth';
import { updateParticipantSchema } from '@/lib/schemas';
import { ApiResponse } from '@/lib/api-response';
import { logger } from '@/lib/logger';

// GET single participant
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const participant = await db.participant.findUnique({
      where: { id: Number(id) }
    });

    if (!participant) {
      return ApiResponse.notFound('Participant not found');
    }

    // Validar acceso al equipo del participante
    const auth = await validateProtectedTeamRoute(request, db, participant.teamId);
    if (!auth.authorized) {
      return ApiResponse.unauthorized(auth.error);
    }

    return ApiResponse.ok(participant);
  } catch (error) {
    logger.error('GET /api/participants/[id] error', error);
    return ApiResponse.internalError('Failed to fetch participant');
  }
}

// PATCH update participant
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const body = await request.json();
    const validation = updateParticipantSchema.safeParse(body);
    if (!validation.success) {
      return ApiResponse.fromZodError(validation.error);
    }

    const data = validation.data;
    const { id } = await params;
    
    const currentParticipant = await db.participant.findUnique({
      where: { id: Number(id) }
    });

    if (!currentParticipant) {
      return ApiResponse.notFound('Participant not found');
    }

    // Validar acceso al equipo
    const auth = await validateProtectedTeamRoute(request, db, currentParticipant.teamId);
    if (!auth.authorized) {
      return ApiResponse.unauthorized(auth.error);
    }

    const userId = auth.userId;

    const participant = await db.participant.update({
      where: { id: Number(id) },
      data
    });

    // Crear log de auditoría
    await db.auditLog.create({
      data: {
        teamId: participant.teamId,
        userId: userId || null,
        action: 'UPDATE',
        entity: 'Participant',
        entityId: participant.id,
        description: `Participante actualizado: ${participant.name}`,
        metadata: JSON.stringify({ before: currentParticipant, after: participant }),
        ipAddress: getClientIp(request) || null,
      },
    });

    return ApiResponse.ok(participant);
  } catch (error) {
    logger.error('PATCH /api/participants/[id] error', error);
    return ApiResponse.internalError('Failed to update participant');
  }
}

// DELETE participant
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    const participant = await db.participant.findUnique({
      where: { id: Number(id) }
    });

    if (!participant) {
      return ApiResponse.notFound('Participant not found');
    }

    // Validar acceso al equipo
    const auth = await validateProtectedTeamRoute(request, db, participant.teamId);
    if (!auth.authorized) {
      return ApiResponse.unauthorized(auth.error);
    }

    const userId = auth.userId;

    // Crear log antes de eliminar
    await db.auditLog.create({
      data: {
        teamId: participant.teamId,
        userId: userId || null,
        action: 'DELETE',
        entity: 'Participant',
        entityId: participant.id,
        description: `Participante eliminado: ${participant.name}`,
        metadata: JSON.stringify(participant),
        ipAddress: getClientIp(request) || null,
      },
    });

    await db.participant.delete({
      where: { id: Number(id) }
    });

    return ApiResponse.ok({ success: true });
  } catch (error) {
    logger.error('DELETE /api/participants/[id] error', error);
    return ApiResponse.internalError('Failed to delete participant');
  }
}
