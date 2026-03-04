import { db as prisma } from '@/lib/db';
import { validateRequestAuth, validateSuperAdmin } from '@/lib/auth';
import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/admin/user-teams
 * Super admin only: Ver matriz usuario-equipo
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

    const userTeams = await prisma.userTeam.findMany({
      select: {
        id: true,
        userId: true,
        teamId: true,
        role: true,
        createdAt: true,
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
      orderBy: [{ user: { name: 'asc' } }, { team: { name: 'asc' } }],
    });

    return NextResponse.json({
      success: true,
      data: userTeams,
      total: userTeams.length,
    });
  } catch (error) {
    console.error('Error listing user-teams:', error);
    return NextResponse.json(
      { error: 'Error listando asignaciones' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/user-teams
 * Super admin only: Asignar usuario a equipo
 */
export async function POST(request: NextRequest) {
  try {
    const auth = validateRequestAuth(request);

    if (!auth.authorized) {
      return NextResponse.json(
        { error: 'No autenticado' },
        { status: 401 }
      );
    }

    const userId = auth.userId;
    const isSuperAdmin = await validateSuperAdmin(prisma, userId);

    if (!isSuperAdmin) {
      return NextResponse.json(
        { error: 'Acceso denegado' },
        { status: 403 }
      );
    }

    const { userId: assignUserId, teamId, role = 'admin' } = await request.json();

    if (!assignUserId || !teamId) {
      return NextResponse.json(
        { error: 'userId y teamId requeridos' },
        { status: 400 }
      );
    }

    if (!['admin', 'viewer'].includes(role)) {
      return NextResponse.json(
        { error: 'Rol inválido (admin o viewer)' },
        { status: 400 }
      );
    }

    // Verificar que el usuario existe
    const userExists = await prisma.user.findUnique({
      where: { id: assignUserId },
    });

    if (!userExists) {
      return NextResponse.json(
        { error: 'Usuario no encontrado' },
        { status: 404 }
      );
    }

    // Verificar que el equipo existe
    const teamExists = await prisma.team.findUnique({
      where: { id: teamId },
    });

    if (!teamExists) {
      return NextResponse.json(
        { error: 'Equipo no encontrado' },
        { status: 404 }
      );
    }

    // Verificar si ya está asignado
    const existingAssignment = await prisma.userTeam.findFirst({
      where: {
        userId: assignUserId,
        teamId,
      },
    });

    if (existingAssignment) {
      return NextResponse.json(
        { error: 'Usuario ya asignado a este equipo' },
        { status: 400 }
      );
    }

    // Crear asignación
    const newUserTeam = await prisma.userTeam.create({
      data: {
        userId: assignUserId,
        teamId,
        role,
      },
      select: {
        id: true,
        userId: true,
        teamId: true,
        role: true,
        user: {
          select: {
            name: true,
            email: true,
          },
        },
        team: {
          select: {
            name: true,
          },
        },
      },
    });

    // Auditar
    await prisma.auditLog.create({
      data: {
        userId,
        teamId,
        action: 'CREATE',
        entity: 'UserTeam',
        description: `Usuario ${userExists.email} asignado a ${teamExists.name} como ${role}`,
        metadata: JSON.stringify({ userId: assignUserId, teamId, role }),
        ipAddress: request.headers.get('x-forwarded-for') || undefined,
      },
    });

    return NextResponse.json({
      success: true,
      data: newUserTeam,
      message: 'Usuario asignado al equipo',
    });
  } catch (error) {
    console.error('Error assigning user to team:', error);
    return NextResponse.json(
      { error: 'Error asignando usuario' },
      { status: 500 }
    );
  }
}
