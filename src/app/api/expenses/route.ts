export const runtime = 'nodejs';

import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { validateProtectedTeamRouteWithMethod, getClientIp } from '@/lib/auth';
import { createAuditLog } from '@/lib/audit';
import { createExpenseSchema } from '@/lib/schemas';
import { ApiResponse } from '@/lib/api-response';
import { logger } from '@/lib/logger';

// GET all expenses (opcional: ?limit=&offset= para paginación)
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
      const [expenses, total] = await Promise.all([
        db.expense.findMany({
          where,
          orderBy: { date: 'desc' },
          take: limit ?? 100,
          skip: offset ?? 0,
        }),
        db.expense.count({ where }),
      ]);
      return ApiResponse.ok({ data: expenses, total, limit: limit ?? 100, offset: offset ?? 0 });
    }

    const expenses = await db.expense.findMany({
      where,
      orderBy: { date: 'desc' },
    });
    return ApiResponse.ok(expenses);
  } catch (error) {
    logger.error('GET /api/expenses error', error);
    return ApiResponse.internalError('Failed to fetch expenses');
  }
}

// POST create expense
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { searchParams } = new URL(request.url);
    const teamId =
      (typeof body.teamId === 'number' ? body.teamId : parseInt(body.teamId, 10)) ||
      parseInt(searchParams.get('teamId') || '0', 10);

    if (!teamId) {
      return ApiResponse.badRequest('teamId is required');
    }

    const validation = createExpenseSchema.omit({ teamId: true }).safeParse(body);
    if (!validation.success) {
      return ApiResponse.fromZodError(validation.error);
    }

    const { name, amount, date, category } = validation.data;

    // Validar autenticación, acceso al equipo y permiso de escritura
    const auth = await validateProtectedTeamRouteWithMethod(request, db, teamId, 'POST');
    if (!auth.authorized) {
      return ApiResponse.unauthorized(auth.error);
    }

    const userId = auth.userId;
    const ip = getClientIp(request) ?? undefined;

    const expense = await db.$transaction(async (tx) => {
      const created = await tx.expense.create({
        data: {
          teamId,
          name,
          amount: Number(amount),
          date,
          category: category || 'Otros',
        },
      });
      await createAuditLog(
        {
          teamId,
          userId,
          action: 'CREATE',
          entity: 'Expense',
          entityId: created.id,
          description: `Gasto creado: ${name} - $${amount}`,
          metadata: { name, amount, date, category },
          ipAddress: ip,
        },
        tx
      );
      return created;
    });

    return ApiResponse.created(expense);
  } catch (error) {
    logger.error('POST /api/expenses error', error);
    return ApiResponse.internalError('Failed to create expense');
  }
}
