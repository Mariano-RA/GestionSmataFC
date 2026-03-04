export const runtime = 'nodejs';

import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { validateProtectedTeamRoute, getClientIp } from '@/lib/auth';
import { createExpenseSchema } from '@/lib/schemas';
import { ApiResponse } from '@/lib/api-response';
import { logger } from '@/lib/logger';

// GET all expenses
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

    const expenses = await db.expense.findMany({
      where: { teamId },
      orderBy: { date: 'desc' }
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
    const validation = createExpenseSchema.safeParse(body);
    if (!validation.success) {
      return ApiResponse.fromZodError(validation.error);
    }

    const { teamId, name, amount, date, category } = validation.data;

    // Validar autenticación y acceso al equipo
    const auth = await validateProtectedTeamRoute(request, db, teamId);
    if (!auth.authorized) {
      return ApiResponse.unauthorized(auth.error);
    }

    const userId = auth.userId;

    const expense = await db.expense.create({
      data: {
        teamId,
        name,
        amount: Number(amount),
        date,
        category: category || 'Otros'
      }
    });

    // Crear log de auditoría
    await db.auditLog.create({
      data: {
        teamId,
        userId: userId || null,
        action: 'CREATE',
        entity: 'Expense',
        entityId: expense.id,
        description: `Gasto creado: ${name} - $${amount}`,
        metadata: JSON.stringify({ name, amount, date, category }),
        ipAddress: getClientIp(request) || null,
      },
    });

    return ApiResponse.created(expense);
  } catch (error) {
    logger.error('POST /api/expenses error', error);
    return ApiResponse.internalError('Failed to create expense');
  }
}
