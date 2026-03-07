import { NextRequest, NextResponse } from 'next/server';
import { db as prisma } from '@/lib/db';
import { validateRequestAuth, validateSuperAdmin, getClientIp } from '@/lib/auth';
import { createAuditLog } from '@/lib/audit';
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

// POST /api/teams - Crear un nuevo equipo (solo super_admin)
export async function POST(request: NextRequest) {
  try {
    const auth = validateRequestAuth(request);
    if (!auth.authorized) {
      return ApiResponse.unauthorized(auth.error);
    }

    const isSuperAdmin = await validateSuperAdmin(prisma, auth.userId);
    if (!isSuperAdmin) {
      return ApiResponse.forbidden('Solo un super administrador puede crear equipos');
    }

    const userId = auth.userId;
    const body = await request.json();
    const validation = createTeamSchema.safeParse(body);
    if (!validation.success) {
      return ApiResponse.fromZodError(validation.error);
    }

    const { name, description, active = true } = validation.data;
    const ip = getClientIp(request) ?? undefined;

    const team = await prisma.$transaction(async (tx) => {
      const created = await tx.team.create({
        data: {
          name: name.trim(),
          description: description?.trim() || null,
          active,
        },
      });
      await createAuditLog(
        {
          teamId: created.id,
          userId,
          action: 'CREATE',
          entity: 'Team',
          entityId: created.id,
          description: `Equipo creado: ${created.name}`,
          metadata: { name, description },
          ipAddress: ip,
        },
        tx
      );
      return created;
    });

    return ApiResponse.created(team);
  } catch (error) {
    logger.error('Error creating team:', error);
    return ApiResponse.internalError('Error al crear el equipo');
  }
}
