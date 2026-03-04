import { NextRequest, NextResponse } from 'next/server';
import { db as prisma } from '@/lib/db';
import { validateRequestAuth, getUserTeams } from '@/lib/auth';
import { logger } from '@/lib/logger';

// GET /api/auth/me - Obtener información del usuario actual
export async function GET(request: NextRequest) {
  try {
    const auth = validateRequestAuth(request);

    if (!auth.authorized) {
      return NextResponse.json(
        { error: 'No autenticado' },
        { status: 401 }
      );
    }

    const userId = auth.userId;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        active: true,
        createdAt: true,
        globalRole: true,
        userTeams: {
          where: {
            team: { active: true },
          },
          include: {
            team: {
              select: {
                id: true,
                name: true,
                description: true,
                active: true,
              },
            },
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'Usuario no encontrado' },
        { status: 404 }
      );
    }

    if (!user.active) {
      return NextResponse.json(
        { error: 'Usuario desactivado' },
        { status: 403 }
      );
    }

    // Obtener estadísticas de acciones del usuario
    const actionsCount = await prisma.auditLog.count({
      where: { userId },
    });

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        globalRole: user.globalRole,
        active: user.active,
        createdAt: user.createdAt,
      },
      teams: user.userTeams.map((ut) => ({
        id: ut.team.id,
        name: ut.team.name,
        description: ut.team.description,
        role: ut.role,
      })),
      stats: {
        totalActions: actionsCount,
        teamsCount: user.userTeams.length,
      },
    });
  } catch (error) {
    logger.error('Error fetching current user:', error);
    return NextResponse.json(
      { error: 'Error al obtener información del usuario' },
      { status: 500 }
    );
  }
}
