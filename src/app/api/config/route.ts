export const runtime = 'nodejs';

import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { DEFAULT_CONFIG } from '@/lib/utils';
import { validateProtectedTeamRoute, getClientIp } from '@/lib/auth';
import { monthlyConfigSchema } from '@/lib/schemas';
import { ApiResponse } from '@/lib/api-response';
import { logger } from '@/lib/logger';

// GET config
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const teamId = parseInt(searchParams.get('teamId') || '0');
    const month = searchParams.get('month');
    const allMonths = searchParams.get('allMonths');

    if (!teamId) {
      return ApiResponse.badRequest('teamId is required');
    }

    // Validar autenticación y acceso al equipo
    const auth = await validateProtectedTeamRoute(request, db, teamId);
    if (!auth.authorized) {
      return ApiResponse.unauthorized(auth.error);
    }

    const parsedTeamId = teamId;

    if (allMonths === 'true') {
      const monthlyConfigs = await db.monthlyConfig.findMany({
        where: { teamId: parsedTeamId },
        orderBy: { month: 'asc' }
      });
      return ApiResponse.ok(monthlyConfigs);
    }

    // Si viene month, obtener configuración mensual
    if (month) {
      const monthlyConfig = await db.monthlyConfig.findFirst({ 
        where: { teamId: parsedTeamId, month } 
      });
      if (monthlyConfig) {
        return ApiResponse.ok(monthlyConfig);
      }
      // Si no existe config para ese mes, devolver config global como fallback
    }

    // Si no, obtener configuración global
    const configEntries = await db.config.findMany({
      where: { teamId: parsedTeamId }
    });
    if (configEntries.length === 0) {
      return ApiResponse.ok(DEFAULT_CONFIG);
    }

    const config: Record<string, any> = {};
    configEntries.forEach(entry => {
      try {
        config[entry.key] = JSON.parse(entry.value);
      } catch {
        config[entry.key] = entry.value;
      }
    });

    return ApiResponse.ok(config);
  } catch (error) {
    logger.error('GET /api/config error', error);
    return ApiResponse.ok(DEFAULT_CONFIG);
  }
}

// POST save config
export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const teamId = parseInt(searchParams.get('teamId') || '0');
    const month = searchParams.get('month');
    const configData = await request.json();

    if (!teamId) {
      return ApiResponse.badRequest('teamId is required');
    }

    // Validar autenticación y acceso al equipo
    const auth = await validateProtectedTeamRoute(request, db, teamId);
    if (!auth.authorized) {
      return ApiResponse.unauthorized(auth.error);
    }

    const userId = auth.userId;
    const parsedTeamId = teamId;

    // Si viene month, guardar configuración mensual
    if (month) {
      const validation = monthlyConfigSchema.safeParse(configData);
      if (!validation.success) {
        return ApiResponse.fromZodError(validation.error);
      }
      const { monthlyTarget, rent } = validation.data;
      const config = await db.monthlyConfig.upsert({
        where: { teamId_month: { teamId: parsedTeamId, month } },
        update: { monthlyTarget, rent },
        create: { teamId: parsedTeamId, month, monthlyTarget, rent },
      });

      // Crear log de auditoría
      await db.auditLog.create({
        data: {
          teamId: parsedTeamId,
          userId: userId || null,
          action: 'UPDATE',
          entity: 'MonthlyConfig',
          entityId: config.id,
          description: `Configuración mensual actualizada: ${month}`,
          metadata: JSON.stringify({ month, monthlyTarget, rent }),
          ipAddress: getClientIp(request) || null,
        },
      });

      return ApiResponse.created(config);
    }

    // Si no, guardar configuración global
    await db.config.deleteMany({
      where: { teamId: parsedTeamId }
    });
    const configEntries = Object.entries(configData).map(([key, value]) => ({
      teamId: parsedTeamId,
      key,
      value: typeof value === 'string' ? value : JSON.stringify(value),
    }));

    await Promise.all(
      configEntries.map(entry =>
        db.config.create({ data: entry })
      )
    );

    // Crear log de auditoría
    await db.auditLog.create({
      data: {
        teamId: parsedTeamId,
        userId: userId || null,
        action: 'UPDATE',
        entity: 'Config',
        description: 'Configuración global actualizada',
        metadata: JSON.stringify(configData),
        ipAddress: getClientIp(request) || null,
      },
    });

    return ApiResponse.created(configData);
  } catch (error) {
    logger.error('POST /api/config error', error);
    return ApiResponse.internalError('Failed to save config');
  }
}
