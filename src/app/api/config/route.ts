export const runtime = 'nodejs';

import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { DEFAULT_CONFIG } from '@/lib/utils';
import { validateProtectedTeamRouteWithMethod, getClientIp } from '@/lib/auth';
import { createAuditLog } from '@/lib/audit';
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

    // Validar autenticación, acceso al equipo y permiso de lectura
    const auth = await validateProtectedTeamRouteWithMethod(request, db, teamId, 'GET');
    if (!auth.authorized) {
      return ApiResponse.unauthorized(auth.error);
    }

    const parsedTeamId = teamId;

    if (allMonths === 'true') {
      const monthlyConfigs = await db.monthlyConfig.findMany({
        where: { teamId: parsedTeamId },
        orderBy: { month: 'asc' },
      });
      // Contrato: incluir fieldRental como alias de rent para unificar con el front
      const withFieldRental = monthlyConfigs.map(m => ({
        ...m,
        fieldRental: m.rent,
      }));
      return ApiResponse.ok(withFieldRental);
    }

    // Si viene month, obtener configuración mensual
    if (month) {
      const monthlyConfig = await db.monthlyConfig.findFirst({
        where: { teamId: parsedTeamId, month },
      });
      if (monthlyConfig) {
        return ApiResponse.ok({
          ...monthlyConfig,
          fieldRental: monthlyConfig.rent,
        });
      }
    }

    // Configuración global (sin month o mes sin config específica)
    const configEntries = await db.config.findMany({
      where: { teamId: parsedTeamId },
    });
    const config: Record<string, unknown> = { ...DEFAULT_CONFIG };
    configEntries.forEach(entry => {
      try {
        (config as Record<string, unknown>)[entry.key] = JSON.parse(entry.value);
      } catch {
        (config as Record<string, unknown>)[entry.key] = entry.value;
      }
    });
    const appConfig = {
      monthlyTarget: Number(config.monthlyTarget) || DEFAULT_CONFIG.monthlyTarget,
      fieldRental: Number(config.fieldRental) ?? DEFAULT_CONFIG.fieldRental,
      maxParticipants: Number(config.maxParticipants) ?? DEFAULT_CONFIG.maxParticipants,
      notes: typeof config.notes === 'string' ? config.notes : DEFAULT_CONFIG.notes,
    };
    return ApiResponse.ok(appConfig);
  } catch (error) {
    logger.error('GET /api/config error', error);
    return ApiResponse.internalError('Error al obtener la configuración');
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

    // Validar autenticación, acceso al equipo y permiso de escritura
    const auth = await validateProtectedTeamRouteWithMethod(request, db, teamId, 'POST');
    if (!auth.authorized) {
      return ApiResponse.unauthorized(auth.error);
    }

    const userId = auth.userId;
    const parsedTeamId = teamId;

    const ip = getClientIp(request) ?? undefined;

    // Si viene month, guardar configuración mensual
    if (month) {
      const validation = monthlyConfigSchema.safeParse(configData);
      if (!validation.success) {
        return ApiResponse.fromZodError(validation.error);
      }
      const { monthlyTarget, rent } = validation.data;

      const config = await db.$transaction(async (tx) => {
        const upserted = await tx.monthlyConfig.upsert({
          where: { teamId_month: { teamId: parsedTeamId, month } },
          update: { monthlyTarget, rent },
          create: { teamId: parsedTeamId, month, monthlyTarget, rent },
        });
        await createAuditLog(
          {
            teamId: parsedTeamId,
            userId,
            action: 'UPDATE',
            entity: 'MonthlyConfig',
            entityId: upserted.id,
            description: `Configuración mensual actualizada: ${month}`,
            metadata: { month, monthlyTarget, rent },
            ipAddress: ip,
          },
          tx
        );
        return upserted;
      });

      return ApiResponse.created(config);
    }

    // Si no, guardar configuración global
    await db.$transaction(async (tx) => {
      await tx.config.deleteMany({
        where: { teamId: parsedTeamId },
      });
      const configEntries = Object.entries(configData).map(([key, value]) => ({
        teamId: parsedTeamId,
        key,
        value: typeof value === 'string' ? value : JSON.stringify(value),
      }));
      for (const entry of configEntries) {
        await tx.config.create({ data: entry });
      }
      await createAuditLog(
        {
          teamId: parsedTeamId,
          userId,
          action: 'UPDATE',
          entity: 'Config',
          description: 'Configuración global actualizada',
          metadata: configData,
          ipAddress: ip,
        },
        tx
      );
    });

    return ApiResponse.created(configData);
  } catch (error) {
    logger.error('POST /api/config error', error);
    return ApiResponse.internalError('Failed to save config');
  }
}
