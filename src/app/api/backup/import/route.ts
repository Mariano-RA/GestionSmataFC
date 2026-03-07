export const runtime = 'nodejs';

import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { validateProtectedTeamRouteWithMethod, getClientIp } from '@/lib/auth';
import { createAuditLog } from '@/lib/audit';
import { importBackupSchema } from '@/lib/schemas';
import { ApiResponse } from '@/lib/api-response';
import { logger } from '@/lib/logger';
import { DEFAULT_CONFIG } from '@/lib/utils';

/**
 * POST /api/backup/import
 * Importa participantes, pagos, gastos y opcionalmente config para un equipo.
 * Body: { teamId, participants?: [], payments?: [], expenses?: [], config?: {} }
 * participantId en payments es el id original del export (se mapea al nuevo id tras crear participantes).
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validation = importBackupSchema.safeParse(body);
    if (!validation.success) {
      return ApiResponse.fromZodError(validation.error);
    }

    const { teamId, participants: participantsData, payments: paymentsData, expenses: expensesData, config: configData } = validation.data;

    const auth = await validateProtectedTeamRouteWithMethod(request, db, teamId, 'POST');
    if (!auth.authorized) {
      return ApiResponse.unauthorized(auth.error);
    }

    const userId = auth.userId;
    const ip = getClientIp(request) ?? undefined;

    await db.$transaction(async (tx) => {
      const oldIdToNewId = new Map<number, number>();

      for (let i = 0; i < participantsData.length; i++) {
        const p = participantsData[i];
        const created = await tx.participant.create({
          data: {
            teamId,
            name: p.name.trim(),
            phone: p.phone?.trim() || null,
            notes: p.notes?.trim() || null,
            active: p.active ?? true,
          },
        });
        const oldId = p.id ?? i;
        oldIdToNewId.set(oldId, created.id);
      }

      for (const pay of paymentsData) {
        const newParticipantId = oldIdToNewId.get(pay.participantId);
        if (newParticipantId == null) continue;
        await tx.payment.create({
          data: {
            teamId,
            participantId: newParticipantId,
            date: pay.date,
            amount: pay.amount,
            method: pay.method || null,
            note: pay.note || null,
          },
        });
      }

      for (const exp of expensesData) {
        await tx.expense.create({
          data: {
            teamId,
            name: exp.name.trim(),
            amount: exp.amount,
            date: exp.date,
            category: exp.category?.trim() || 'Otros',
          },
        });
      }

      if (configData && Object.keys(configData).length > 0) {
        await tx.config.deleteMany({ where: { teamId } });
        const entries = [
          { key: 'monthlyTarget', value: String(configData.monthlyTarget ?? DEFAULT_CONFIG.monthlyTarget) },
          { key: 'fieldRental', value: String(configData.fieldRental ?? DEFAULT_CONFIG.fieldRental) },
          { key: 'maxParticipants', value: String(configData.maxParticipants ?? DEFAULT_CONFIG.maxParticipants) },
          { key: 'notes', value: configData.notes ?? DEFAULT_CONFIG.notes },
        ];
        for (const entry of entries) {
          await tx.config.create({
            data: { teamId, key: entry.key, value: entry.value },
          });
        }
      }

      await createAuditLog(
        {
          teamId,
          userId,
          action: 'CREATE',
          entity: 'Import',
          description: `Importación: ${participantsData.length} participantes, ${paymentsData.length} pagos, ${expensesData.length} gastos`,
          metadata: { participants: participantsData.length, payments: paymentsData.length, expenses: expensesData.length },
          ipAddress: ip,
        },
        tx
      );
    });

    return ApiResponse.ok({
      imported: {
        participants: participantsData.length,
        payments: paymentsData.length,
        expenses: expensesData.length,
        config: configData != null,
      },
    });
  } catch (error) {
    logger.error('POST /api/backup/import error', error);
    return ApiResponse.internalError('Error al importar los datos');
  }
}
