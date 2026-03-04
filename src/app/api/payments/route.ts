export const runtime = 'nodejs';

import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { validateProtectedTeamRoute, getClientIp } from '@/lib/auth';
import { createPaymentSchema } from '@/lib/schemas';
import { ApiResponse } from '@/lib/api-response';
import { logger } from '@/lib/logger';

// GET all payments
export async function GET(request: NextRequest) {
  try {
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

    const payments = await db.payment.findMany({
      where: { teamId },
      orderBy: { date: 'desc' }
    });
    return ApiResponse.ok(payments);
  } catch (error) {
    logger.error('GET /api/payments error', error);
    return ApiResponse.internalError('Failed to fetch payments');
  }
}

// POST create payment
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validation = createPaymentSchema.safeParse(body);
    if (!validation.success) {
      return ApiResponse.fromZodError(validation.error);
    }

    const { teamId, participantId, date, amount, method, note } = validation.data;

    // Validar autenticación y acceso al equipo
    const auth = await validateProtectedTeamRoute(request, db, teamId);
    if (!auth.authorized) {
      return ApiResponse.unauthorized(auth.error);
    }

    const userId = auth.userId;

    const payment = await db.payment.create({
      data: {
        teamId,
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
        teamId,
        userId: userId || null,
        action: 'CREATE',
        entity: 'Payment',
        entityId: payment.id,
        description: `Pago creado: $${amount} para participante ${participantId}`,
        metadata: JSON.stringify({ participantId, date, amount, method, note }),
        ipAddress: getClientIp(request) || null,
      },
    });

    return ApiResponse.created(payment);
  } catch (error) {
    logger.error('POST /api/payments error', error);
    return ApiResponse.internalError('Failed to create payment');
  }
}
