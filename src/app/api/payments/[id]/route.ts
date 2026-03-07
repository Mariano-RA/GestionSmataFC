export const runtime = 'nodejs';

import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { validateProtectedTeamRouteWithMethod, getClientIp } from '@/lib/auth';
import { createAuditLog } from '@/lib/audit';
import { updatePaymentSchema } from '@/lib/schemas';
import { ApiResponse } from '@/lib/api-response';
import { logger } from '@/lib/logger';

// DELETE payment
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    const payment = await db.payment.findUnique({
      where: { id: Number(id) }
    });

    if (!payment) {
      return ApiResponse.notFound('Payment not found');
    }

    // Validar acceso al equipo y permiso de eliminación
    const auth = await validateProtectedTeamRouteWithMethod(request, db, payment.teamId, 'DELETE');
    if (!auth.authorized) {
      return ApiResponse.unauthorized(auth.error);
    }

    const userId = auth.userId;
    const ip = getClientIp(request) ?? undefined;

    await db.$transaction(async (tx) => {
      await createAuditLog(
        {
          teamId: payment.teamId,
          userId,
          action: 'DELETE',
          entity: 'Payment',
          entityId: payment.id,
          description: `Pago eliminado: $${payment.amount}`,
          metadata: payment,
          ipAddress: ip,
        },
        tx
      );
      await tx.payment.delete({
        where: { id: Number(id) },
      });
    });

    return ApiResponse.ok({ success: true });
  } catch (error) {
    logger.error('DELETE /api/payments/[id] error', error);
    return ApiResponse.internalError('Failed to delete payment');
  }
}

// PATCH update payment
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const validation = updatePaymentSchema.safeParse(body);
    if (!validation.success) {
      return ApiResponse.fromZodError(validation.error);
    }

    const { participantId, date, amount, method, note } = validation.data;

    const currentPayment = await db.payment.findUnique({
      where: { id: Number(id) }
    });

    if (!currentPayment) {
      return ApiResponse.notFound('Payment not found');
    }

    // Validar acceso al equipo y permiso de escritura
    const auth = await validateProtectedTeamRouteWithMethod(request, db, currentPayment.teamId, 'PATCH');
    if (!auth.authorized) {
      return ApiResponse.unauthorized(auth.error);
    }

    const userId = auth.userId;
    const ip = getClientIp(request) ?? undefined;

    const payment = await db.$transaction(async (tx) => {
      const updated = await tx.payment.update({
        where: { id: Number(id) },
        data: {
          participantId,
          date,
          amount: Number(amount),
          method: method || null,
          note: note || null,
        },
      });
      await createAuditLog(
        {
          teamId: updated.teamId,
          userId,
          action: 'UPDATE',
          entity: 'Payment',
          entityId: updated.id,
          description: `Pago actualizado: $${updated.amount}`,
          metadata: { before: currentPayment, after: updated },
          ipAddress: ip,
        },
        tx
      );
      return updated;
    });

    return ApiResponse.ok(payment);
  } catch (error) {
    logger.error('PATCH /api/payments/[id] error', error);
    return ApiResponse.internalError('Failed to update payment');
  }
}
