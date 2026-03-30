export const runtime = 'nodejs';

import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { validateProtectedTeamRouteWithMethod, getClientIp } from '@/lib/auth';
import { createAuditLog } from '@/lib/audit';
import { updateExpenseSchema } from '@/lib/schemas';
import { ApiResponse } from '@/lib/api-response';
import { logger } from '@/lib/logger';

// DELETE expense
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    const expense = await db.expense.findUnique({
      where: { id: Number(id) }
    });

    if (!expense) {
      return ApiResponse.notFound('Expense not found');
    }

    // Validar acceso al equipo y permiso de eliminación
    const auth = await validateProtectedTeamRouteWithMethod(request, db, expense.teamId, 'DELETE');
    if (!auth.authorized) {
      return ApiResponse.unauthorized(auth.error);
    }

    const userId = auth.userId;
    const ip = getClientIp(request) ?? undefined;

    await db.$transaction(async (tx) => {
      await createAuditLog(
        {
          teamId: expense.teamId,
          userId,
          action: 'DELETE',
          entity: 'Expense',
          entityId: expense.id,
          description: `Gasto eliminado: ${expense.name} - $${expense.amount}`,
          metadata: expense,
          ipAddress: ip,
        },
        tx
      );
      await tx.expense.delete({
        where: { id: Number(id) },
      });
    });
    return ApiResponse.ok({ success: true });
  } catch (error) {
    logger.error('DELETE /api/expenses/[id] error', error);
    return ApiResponse.internalError('Failed to delete expense');
  }
}

// PATCH update expense
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const validation = updateExpenseSchema.safeParse(body);
    if (!validation.success) {
      return ApiResponse.fromZodError(validation.error);
    }
    const { name, amount, date, category, includeInMonthlyShare } = validation.data;
    
    const currentExpense = await db.expense.findUnique({
      where: { id: Number(id) }
    });

    if (!currentExpense) {
      return ApiResponse.notFound('Expense not found');
    }

    // Validar acceso al equipo y permiso de escritura
    const auth = await validateProtectedTeamRouteWithMethod(request, db, currentExpense.teamId, 'PATCH');
    if (!auth.authorized) {
      return ApiResponse.unauthorized(auth.error);
    }

    const userId = auth.userId;
    const ip = getClientIp(request) ?? undefined;

    const expense = await db.$transaction(async (tx) => {
      const updated = await tx.expense.update({
        where: { id: Number(id) },
        data: {
          name,
          amount: Number(amount),
          date,
          category: category || 'Otros',
          ...(includeInMonthlyShare === undefined ? {} : { includeInMonthlyShare: Boolean(includeInMonthlyShare) }),
        },
      });
      await createAuditLog(
        {
          teamId: updated.teamId,
          userId,
          action: 'UPDATE',
          entity: 'Expense',
          entityId: updated.id,
          description: `Gasto actualizado: ${updated.name} - $${updated.amount}`,
          metadata: { before: currentExpense, after: updated },
          ipAddress: ip,
        },
        tx
      );
      return updated;
    });

    return ApiResponse.ok(expense);
  } catch (error) {
    logger.error('PATCH /api/expenses/[id] error', error);
    return ApiResponse.internalError('Failed to update expense');
  }
}