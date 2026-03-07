export const runtime = 'nodejs';

import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { validateProtectedTeamRouteWithMethod, getClientIp } from '@/lib/auth';
import { createAuditLog } from '@/lib/audit';
import { createPaymentSchema } from '@/lib/schemas';
import { ApiResponse } from '@/lib/api-response';
import { logger } from '@/lib/logger';

// GET all payments (opcional: ?limit=&offset= para paginación)
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
      const [payments, total] = await Promise.all([
        db.payment.findMany({
          where,
          orderBy: { date: 'desc' },
          take: limit ?? 100,
          skip: offset ?? 0,
        }),
        db.payment.count({ where }),
      ]);
      return ApiResponse.ok({ data: payments, total, limit: limit ?? 100, offset: offset ?? 0 });
    }

    const payments = await db.payment.findMany({
      where,
      orderBy: { date: 'desc' },
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

    // Validar autenticación, acceso al equipo y permiso de escritura
    const auth = await validateProtectedTeamRouteWithMethod(request, db, teamId, 'POST');
    if (!auth.authorized) {
      return ApiResponse.unauthorized(auth.error);
    }

    const userId = auth.userId;
    const ip = getClientIp(request) ?? undefined;

    const payment = await db.$transaction(async (tx) => {
      const created = await tx.payment.create({
        data: {
          teamId,
          participantId,
          date,
          amount: Number(amount),
          method: method || null,
          note: note || null,
        },
      });
      await createAuditLog(
        {
          teamId,
          userId,
          action: 'CREATE',
          entity: 'Payment',
          entityId: created.id,
          description: `Pago creado: $${amount} para participante ${participantId}`,
          metadata: { participantId, date, amount, method, note },
          ipAddress: ip,
        },
        tx
      );
      return created;
    });

    return ApiResponse.created(payment);
  } catch (error) {
    logger.error('POST /api/payments error', error);
    return ApiResponse.internalError('Failed to create payment');
  }
}
