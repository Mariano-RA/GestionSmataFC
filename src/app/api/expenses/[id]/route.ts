export const runtime = 'nodejs';

import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { validateProtectedTeamRoute, getClientIp } from '@/lib/auth';
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

    // Validar acceso al equipo
    const auth = await validateProtectedTeamRoute(request, db, expense.teamId);
    if (!auth.authorized) {
      return ApiResponse.unauthorized(auth.error);
    }

    const userId = auth.userId;

    // Crear log antes de eliminar
    await db.auditLog.create({
      data: {
        teamId: expense.teamId,
        userId: userId || null,
        action: 'DELETE',
        entity: 'Expense',
        entityId: expense.id,
        description: `Gasto eliminado: ${expense.name} - $${expense.amount}`,
        metadata: JSON.stringify(expense),
        ipAddress: getClientIp(request) || null,
      },
    });

    await db.expense.delete({
      where: { id: Number(id) }
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
    const { name, amount, date, category } = validation.data;
    
    const currentExpense = await db.expense.findUnique({
      where: { id: Number(id) }
    });

    if (!currentExpense) {
      return ApiResponse.notFound('Expense not found');
    }

    // Validar acceso al equipo
    const auth = await validateProtectedTeamRoute(request, db, currentExpense.teamId);
    if (!auth.authorized) {
      return ApiResponse.unauthorized(auth.error);
    }

    const userId = auth.userId;

    const expense = await db.expense.update({
      where: { id: Number(id) },
      data: {
        name,
        amount: Number(amount),
        date,
        category: category || 'Otros'
      }
    });

    // Crear log de auditoría
    await db.auditLog.create({
      data: {
        teamId: expense.teamId,
        userId: userId || null,
        action: 'UPDATE',
        entity: 'Expense',
        entityId: expense.id,
        description: `Gasto actualizado: ${expense.name} - $${expense.amount}`,
        metadata: JSON.stringify({ before: currentExpense, after: expense }),
        ipAddress: getClientIp(request) || null,
      },
    });

    return ApiResponse.ok(expense);
  } catch (error) {
    logger.error('PATCH /api/expenses/[id] error', error);
    return ApiResponse.internalError('Failed to update expense');
  }
}