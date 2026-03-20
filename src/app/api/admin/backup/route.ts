export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { validateRequestAuth, validateSuperAdmin, getClientIp } from '@/lib/auth';
import { createAuditLog } from '@/lib/audit';
import { logger } from '@/lib/logger';
import { ApiResponse } from '@/lib/api-response';

async function getMonthlyConfigsForBackup() {
  try {
    return await db.monthlyConfig.findMany({ orderBy: { id: 'asc' } });
  } catch (error) {
    const code = (error as { code?: string })?.code;
    if (code === 'P2022') {
      // Compatibilidad temporal: base sin columnas nuevas de MonthlyConfig.
      return await db.monthlyConfig.findMany({
        orderBy: { id: 'asc' },
        select: {
          id: true,
          teamId: true,
          month: true,
          monthlyTarget: true,
          rent: true,
          createdAt: true,
          updatedAt: true,
        },
      });
    }
    throw error;
  }
}

async function getParticipantMonthlyStatusesForBackup() {
  try {
    return await db.participantMonthlyStatus.findMany({
      orderBy: [{ month: 'asc' }, { participantId: 'asc' }],
    });
  } catch (error) {
    const code = (error as { code?: string })?.code;
    if (code === 'P2021') {
      // Compatibilidad temporal: base todavía sin la tabla nueva.
      return [];
    }
    throw error;
  }
}

/**
 * GET /api/admin/backup
 * Exporta TODA la base de datos en JSON (solo super_admin).
 */
export async function GET(request: NextRequest) {
  try {
    const auth = validateRequestAuth(request);
    if (!auth.authorized) {
      return ApiResponse.unauthorized(auth.error);
    }

    const userId = auth.userId;
    const isSuperAdmin = await validateSuperAdmin(db, userId);
    if (!isSuperAdmin) {
      return ApiResponse.forbidden('Acceso denegado: solo super administradores');
    }

    const [
      users,
      teams,
      userTeams,
      participants,
      payments,
      expenses,
      configs,
      monthlyConfigs,
      participantMonthlyStatuses,
      auditLogs,
      loginAttempts,
    ] = await Promise.all([
      db.user.findMany({ orderBy: { id: 'asc' } }),
      db.team.findMany({ orderBy: { id: 'asc' } }),
      db.userTeam.findMany({ orderBy: { id: 'asc' } }),
      db.participant.findMany({ orderBy: { id: 'asc' } }),
      db.payment.findMany({ orderBy: { id: 'asc' } }),
      db.expense.findMany({ orderBy: { id: 'asc' } }),
      db.config.findMany({ orderBy: { id: 'asc' } }),
      getMonthlyConfigsForBackup(),
      getParticipantMonthlyStatusesForBackup(),
      db.auditLog.findMany({ orderBy: { id: 'asc' } }),
      db.loginAttempt.findMany({ orderBy: { id: 'asc' } }),
    ]);

    const generatedAt = new Date().toISOString();
    const backup = {
      meta: {
        generatedAt,
        exportedByUserId: userId,
        scope: 'full_database',
      },
      data: {
        users,
        teams,
        userTeams,
        participants,
        payments,
        expenses,
        configs,
        monthlyConfigs,
        participantMonthlyStatuses,
        auditLogs,
        loginAttempts,
      },
    };

    await createAuditLog({
      userId,
      action: 'CREATE',
      entity: 'Backup',
      description: 'Exportación completa de base de datos',
      metadata: {
        scope: 'full_database',
        generatedAt,
        counts: {
          users: users.length,
          teams: teams.length,
          userTeams: userTeams.length,
          participants: participants.length,
          payments: payments.length,
          expenses: expenses.length,
          configs: configs.length,
          monthlyConfigs: monthlyConfigs.length,
          participantMonthlyStatuses: participantMonthlyStatuses.length,
          auditLogs: auditLogs.length,
          loginAttempts: loginAttempts.length,
        },
      },
      ipAddress: getClientIp(request),
    });

    const fileName = `backup-completo-${generatedAt.slice(0, 10)}.json`;
    return new NextResponse(JSON.stringify(backup, null, 2), {
      status: 200,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Disposition': `attachment; filename="${fileName}"`,
      },
    });
  } catch (error) {
    logger.error('GET /api/admin/backup error', error);
    return ApiResponse.internalError('Error al generar backup completo');
  }
}

