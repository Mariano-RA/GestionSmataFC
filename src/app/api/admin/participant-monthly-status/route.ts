export const runtime = 'nodejs';

import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { validateRequestAuth, validateSuperAdmin, getClientIp } from '@/lib/auth';
import { adminParticipantMonthlyStatusMutationSchema } from '@/lib/schemas';
import { ApiResponse } from '@/lib/api-response';
import { createAuditLog } from '@/lib/audit';
import { logger } from '@/lib/logger';

/**
 * POST /api/admin/participant-monthly-status
 * Super admin only: eliminar un snapshot mensual o marcarlo active=true para corregir cuotas.
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
    const parsed = adminParticipantMonthlyStatusMutationSchema.safeParse(body);
    if (!parsed.success) {
      return ApiResponse.fromZodError(parsed.error);
    }

    const { action, teamId, participantId, month } = parsed.data;
    const ip = getClientIp(request) ?? undefined;

    const participant = await db.participant.findFirst({
      where: { id: participantId, teamId },
      select: { id: true, teamId: true, name: true, active: true, status: true },
    });

    if (!participant) {
      return ApiResponse.notFound('Participante no encontrado en ese equipo');
    }

    const snapshot = await db.participantMonthlyStatus.findUnique({
      where: {
        participantId_month: {
          participantId,
          month,
        },
      },
    });

    if (!snapshot) {
      return ApiResponse.notFound('No existe snapshot para ese jugador y mes');
    }

    if (snapshot.teamId !== teamId) {
      return ApiResponse.forbidden('El snapshot no pertenece al equipo indicado');
    }

    if (action === 'delete') {
      await db.$transaction(async (tx) => {
        await tx.participantMonthlyStatus.delete({
          where: { id: snapshot.id },
        });
        await createAuditLog(
          {
            teamId,
            userId: auth.userId,
            action: 'DELETE',
            entity: 'ParticipantMonthlyStatus',
            entityId: snapshot.id,
            description: `Snapshot mensual eliminado (${month}) para ${participant.name}`,
            metadata: { participantId, month, previous: snapshot },
            ipAddress: ip,
          },
          tx
        );
      });

      return ApiResponse.ok({ deleted: true, participantId, month });
    }

    const statusVal = participant.status || 'activo';
    const updated = await db.$transaction(async (tx) => {
      const row = await tx.participantMonthlyStatus.update({
        where: { id: snapshot.id },
        data: {
          active: true,
          status: statusVal,
          teamId,
        },
      });
      await createAuditLog(
        {
          teamId,
          userId: auth.userId,
          action: 'UPDATE',
          entity: 'ParticipantMonthlyStatus',
          entityId: row.id,
          description: `Snapshot mensual marcado activo (${month}) para ${participant.name}`,
          metadata: { participantId, month, before: snapshot, after: row },
          ipAddress: ip,
        },
        tx
      );
      return row;
    });

    return ApiResponse.ok(updated);
  } catch (error) {
    logger.error('POST /api/admin/participant-monthly-status error', error);
    return ApiResponse.internalError('Error al modificar el snapshot mensual');
  }
}
