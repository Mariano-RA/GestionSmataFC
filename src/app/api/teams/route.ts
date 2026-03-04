import { NextRequest, NextResponse } from 'next/server';
import { db as prisma } from '@/lib/db';
import { validateRequestAuth, getClientIp } from '@/lib/auth';
import { createTeamSchema } from '@/lib/schemas';
import { ApiResponse } from '@/lib/api-response';
import { logger } from '@/lib/logger';

// GET /api/teams - Lista todos los equipos
export async function GET(request: NextRequest) {
  try {
    // Validar JWT
    const auth = validateRequestAuth(request);
    if (!auth.authorized) {
      return ApiResponse.unauthorized(auth.error);
    }

    const { searchParams } = new URL(request.url);
    const active = searchParams.get('active');

    const teams = await prisma.team.findMany({
      where: active !== null ? { active: active === 'true' } : undefined,
      include: {
        _count: {
          select: {
            participants: true,
            payments: true,
            expenses: true,
            userTeams: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return ApiResponse.ok(teams);
  } catch (error) {
    logger.error('Error fetching teams:', error);
    return ApiResponse.internalError('Error al obtener los equipos');
  }
}

// POST /api/teams - Crear un nuevo equipo
export async function POST(request: NextRequest) {
  try {
    // Validar JWT
    const auth = validateRequestAuth(request);
    if (!auth.authorized) {
      return ApiResponse.unauthorized(auth.error);
    }

    const userId = auth.userId;
    const body = await request.json();
    const validation = createTeamSchema.safeParse(body);
    if (!validation.success) {
      return ApiResponse.fromZodError(validation.error);
    }

    const { name, description, active = true } = validation.data;

    const team = await prisma.team.create({
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        active,
      },
    });

    // Crear log de auditoría
    await prisma.auditLog.create({
      data: {
        teamId: team.id,
        userId: userId || null,
        action: 'CREATE',
        entity: 'Team',
        entityId: team.id,
        description: `Equipo creado: ${team.name}`,
        metadata: JSON.stringify({ name, description }),
        ipAddress: getClientIp(request) || null,
      },
    });

    return ApiResponse.created(team);
  } catch (error) {
    logger.error('Error creating team:', error);
    return ApiResponse.internalError('Error al crear el equipo');
  }
}
