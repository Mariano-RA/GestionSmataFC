export const runtime = 'nodejs';

import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { validateProtectedTeamRouteWithMethod, getClientIp } from '@/lib/auth';
import { createAuditLog } from '@/lib/audit';
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

    // Validar acceso al equipo y permiso de lectura
    const auth = await validateProtectedTeamRouteWithMethod(request, db, participant.teamId, 'GET');
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

    // Validar acceso al equipo y permiso de escritura
    const auth = await validateProtectedTeamRouteWithMethod(request, db, currentParticipant.teamId, 'PATCH');
    if (!auth.authorized) {
      return ApiResponse.unauthorized(auth.error);
    }

    const userId = auth.userId;
    const ip = getClientIp(request) ?? undefined;

    const participant = await db.$transaction(async (tx) => {
      const updated = await tx.participant.update({
        where: { id: Number(id) },
        data,
      });
      await createAuditLog(
        {
          teamId: updated.teamId,
          userId,
          action: 'UPDATE',
          entity: 'Participant',
          entityId: updated.id,
          description: `Participante actualizado: ${updated.name}`,
          metadata: { before: currentParticipant, after: updated },
          ipAddress: ip,
        },
        tx
      );
      return updated;
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

    // Validar acceso al equipo y permiso de eliminación
    const auth = await validateProtectedTeamRouteWithMethod(request, db, participant.teamId, 'DELETE');
    if (!auth.authorized) {
      return ApiResponse.unauthorized(auth.error);
    }

    const userId = auth.userId;
    const ip = getClientIp(request) ?? undefined;

    await db.$transaction(async (tx) => {
      await createAuditLog(
        {
          teamId: participant.teamId,
          userId,
          action: 'DELETE',
          entity: 'Participant',
          entityId: participant.id,
          description: `Participante eliminado: ${participant.name}`,
          metadata: participant,
          ipAddress: ip,
        },
        tx
      );
      await tx.participant.delete({
        where: { id: Number(id) },
      });
    });

    return ApiResponse.ok({ success: true });
  } catch (error) {
    logger.error('DELETE /api/participants/[id] error', error);
    return ApiResponse.internalError('Failed to delete participant');
  }
}
