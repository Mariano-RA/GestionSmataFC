import { NextRequest, NextResponse } from 'next/server';
import { db as prisma } from '@/lib/db';
import { validateRequestAuth } from '@/lib/auth';
import { logger } from '@/lib/logger';

// PUT /api/auth/preferred-team - Actualizar equipo preferido
export async function PUT(request: NextRequest) {
  try {
    const auth = validateRequestAuth(request);

    if (!auth.authorized) {
      return NextResponse.json(
        { error: 'No autenticado' },
        { status: 401 }
      );
    }

    const userId = auth.userId;
    const { teamId } = await request.json();

    if (!teamId) {
      return NextResponse.json(
        { error: 'El ID del equipo es requerido' },
        { status: 400 }
      );
    }

    // Verificar que el usuario tiene acceso a este equipo
    const userTeam = await prisma.userTeam.findUnique({
      where: {
        userId_teamId: {
          userId,
          teamId,
        },
      },
    });

    if (!userTeam) {
      return NextResponse.json(
        { error: 'No tienes acceso a este equipo' },
        { status: 403 }
      );
    }

    // Actualizar equipo preferido
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { preferredTeamId: teamId },
      select: {
        id: true,
        preferredTeamId: true,
      },
    });

    logger.log(`User ${userId} set preferred team to ${teamId}`);

    return NextResponse.json({
      success: true,
      preferredTeamId: updatedUser.preferredTeamId,
    });
  } catch (error) {
    logger.error('Error updating preferred team:', error);
    return NextResponse.json(
      { error: 'Error al actualizar el equipo preferido' },
      { status: 500 }
    );
  }
}
