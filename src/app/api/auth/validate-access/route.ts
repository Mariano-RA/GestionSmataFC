import { NextRequest, NextResponse } from 'next/server';
import { db as prisma } from '@/lib/db';
import { validateRequestAuth, validateUserTeamAccess } from '@/lib/auth';

// GET /api/auth/validate-access?teamId=1
// Valida que el usuario actual tenga acceso al equipo especificado
export async function GET(request: NextRequest) {
  try {
    const auth = validateRequestAuth(request);
    const { searchParams } = new URL(request.url);
    const teamIdParam = searchParams.get('teamId');

    if (!auth.authorized) {
      return NextResponse.json(
        { hasAccess: false, error: 'No autenticado' },
        { status: 401 }
      );
    }

    const userId = auth.userId;

    if (!teamIdParam) {
      return NextResponse.json(
        { hasAccess: false, error: 'teamId es requerido' },
        { status: 400 }
      );
    }

    const teamId = parseInt(teamIdParam);
    if (isNaN(teamId)) {
      return NextResponse.json(
        { hasAccess: false, error: 'teamId inválido' },
        { status: 400 }
      );
    }

    // Validar acceso
    const hasAccess = await validateUserTeamAccess(prisma, userId, teamId);

    if (!hasAccess) {
      return NextResponse.json(
        { 
          hasAccess: false, 
          error: 'No tienes acceso a este equipo' 
        },
        { status: 403 }
      );
    }

    // Obtener información del rol
    const userTeam = await prisma.userTeam.findFirst({
      where: {
        userId,
        teamId,
      },
      include: {
        team: {
          select: {
            id: true,
            name: true,
            description: true,
          },
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    return NextResponse.json({
      hasAccess: true,
      role: userTeam?.role,
      team: userTeam?.team,
      user: userTeam?.user,
    });
  } catch (error) {
    console.error('Error validating access:', error);
    return NextResponse.json(
      { hasAccess: false, error: 'Error al validar acceso' },
      { status: 500 }
    );
  }
}
