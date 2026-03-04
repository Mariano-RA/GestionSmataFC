import { db as prisma } from '@/lib/db';
import { validateRequestAuth, validateSuperAdmin } from '@/lib/auth';
import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/admin/logs
 * Super admin only: Obtener logs de auditoría con filtros
 * Query params:
 *  - userId?: string - Filtrar por usuario
 *  - teamId?: string - Filtrar por equipo
 *  - entity?: string - Filtrar por entidad (User, Team, UserTeam, etc)
 *  - action?: string - Filtrar por acción (CREATE, UPDATE, DELETE)
 *  - startDate?: ISO string - Fecha inicio
 *  - endDate?: ISO string - Fecha fin
 *  - page?: number - Página (default 1)
 *  - limit?: number - Registros por página (default 50, max 500)
 */
export async function GET(request: NextRequest) {
  try {
    // Validar JWT
    const auth = validateRequestAuth(request);
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error }, { status: 401 });
    }

    const userId = auth.userId;

    // Validar que sea super admin
    const isSuperAdmin = await validateSuperAdmin(prisma, userId);

    if (!isSuperAdmin) {
      return NextResponse.json(
        { error: 'Acceso denegado' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);

    // Parsear parámetros
    const filterUserId = searchParams.get('userId');
    const filterTeamId = searchParams.get('teamId');
    const filterEntity = searchParams.get('entity');
    const filterAction = searchParams.get('action');
    const filterStartDate = searchParams.get('startDate');
    const filterEndDate = searchParams.get('endDate');
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const limit = Math.min(500, Math.max(1, parseInt(searchParams.get('limit') || '50')));

    // Construir where clause
    const where: any = {};

    if (filterUserId) {
      where.userId = filterUserId;
    }

    if (filterTeamId) {
      where.teamId = parseInt(filterTeamId);
    }

    if (filterEntity) {
      where.entity = filterEntity;
    }

    if (filterAction) {
      where.action = filterAction;
    }

    if (filterStartDate || filterEndDate) {
      where.createdAt = {};
      if (filterStartDate) {
        where.createdAt.gte = new Date(filterStartDate);
      }
      if (filterEndDate) {
        where.createdAt.lte = new Date(filterEndDate);
      }
    }

    // Obtener total de registros
    const total = await prisma.auditLog.count({ where });

    // Obtener logs paginados
    const logs = await prisma.auditLog.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            globalRole: true,
          },
        },
        team: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    });

    // Calcular totales de paginación
    const totalPages = Math.ceil(total / limit);

    return NextResponse.json({
      success: true,
      data: {
        logs: logs.map((log: any) => ({
          id: log.id,
          action: log.action,
          entity: log.entity,
          description: log.description,
          metadata: log.metadata ? JSON.parse(log.metadata) : null,
          user: log.user
            ? {
                id: log.user.id,
                name: log.user.name,
                email: log.user.email,
                globalRole: log.user.globalRole,
              }
            : null,
          team: log.team
            ? {
                id: log.team.id,
                name: log.team.name,
              }
            : null,
          ipAddress: log.ipAddress,
          createdAt: log.createdAt,
        })),
        pagination: {
          page,
          limit,
          total,
          totalPages,
          hasMore: page < totalPages,
        },
        filters: {
          userId: filterUserId || undefined,
          teamId: filterTeamId || undefined,
          entity: filterEntity || undefined,
          action: filterAction || undefined,
          startDate: filterStartDate || undefined,
          endDate: filterEndDate || undefined,
        },
      },
    });
  } catch (error) {
    console.error('Error fetching logs:', error);
    return NextResponse.json(
      { error: 'Error obteniendo logs' },
      { status: 500 }
    );
  }
}
