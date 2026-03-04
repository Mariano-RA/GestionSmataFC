export const runtime = 'nodejs';

import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { validateProtectedTeamRoute, getClientIp } from '@/lib/auth';
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

    // Validar acceso al equipo
    const auth = await validateProtectedTeamRoute(request, db, payment.teamId);
    if (!auth.authorized) {
      return ApiResponse.unauthorized(auth.error);
    }

    const userId = auth.userId;

    // Crear log antes de eliminar
    await db.auditLog.create({
      data: {
        teamId: payment.teamId,
        userId: userId || null,
        action: 'DELETE',
        entity: 'Payment',
        entityId: payment.id,
        description: `Pago eliminado: $${payment.amount}`,
        metadata: JSON.stringify(payment),
        ipAddress: getClientIp(request) || null,
      },
    });

    await db.payment.delete({
      where: { id: Number(id) }
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

    // Validar acceso al equipo
    const auth = await validateProtectedTeamRoute(request, db, currentPayment.teamId);
    if (!auth.authorized) {
      return ApiResponse.unauthorized(auth.error);
    }

    const userId = auth.userId;

    const payment = await db.payment.update({
      where: { id: Number(id) },
      data: {
        participantId,
        date,
        amount: Number(amount),
        method: method || null,
        note: note || null,
      }
    });

    // Crear log de auditoría
    await db.auditLog.create({
      data: {
        teamId: payment.teamId,
        userId: userId || null,
        action: 'UPDATE',
        entity: 'Payment',
        entityId: payment.id,
        description: `Pago actualizado: $${payment.amount}`,
        metadata: JSON.stringify({ before: currentPayment, after: payment }),
        ipAddress: getClientIp(request) || null,
      },
    });

    return ApiResponse.ok(payment);
  } catch (error) {
    logger.error('PATCH /api/payments/[id] error', error);
    return ApiResponse.internalError('Failed to update payment');
  }
}
