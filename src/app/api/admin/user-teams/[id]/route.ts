import { db as prisma } from '@/lib/db';
import { validateRequestAuth, validateSuperAdmin } from '@/lib/auth';
import { NextRequest, NextResponse } from 'next/server';

/**
 * PATCH /api/admin/user-teams/[id]
 * Super admin only: Cambiar rol del usuario en equipo
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id } = await params;
    const userTeamId = parseInt(id);
    const { role } = await request.json();

    if (!role || !['admin', 'viewer'].includes(role)) {
      return NextResponse.json(
        { error: 'Rol inválido (admin o viewer)' },
        { status: 400 }
      );
    }

    const userTeam = await prisma.userTeam.findUnique({
      where: { id: userTeamId },
      include: {
        user: true,
        team: true,
      },
    });

    if (!userTeam) {
      return NextResponse.json(
        { error: 'Asignación no encontrada' },
        { status: 404 }
      );
    }

    const updatedUserTeam = await prisma.userTeam.update({
      where: { id: userTeamId },
      data: { role },
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
        teamId: userTeam.teamId,
        action: 'UPDATE',
        entity: 'UserTeam',
        description: `Rol de ${userTeam.user.email} en ${userTeam.team.name} cambió a ${role}`,
        metadata: JSON.stringify({ oldRole: userTeam.role, newRole: role }),
        ipAddress: request.headers.get('x-forwarded-for') || undefined,
      },
    });

    return NextResponse.json({
      success: true,
      data: updatedUserTeam,
      message: 'Rol actualizado',
    });
  } catch (error) {
    console.error('Error updating user-team:', error);
    return NextResponse.json(
      { error: 'Error actualizando rol' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/user-teams/[id]
 * Super admin only: Remover usuario de equipo
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id } = await params;
    const userTeamId = parseInt(id);

    const userTeam = await prisma.userTeam.findUnique({
      where: { id: userTeamId },
      include: {
        user: true,
        team: true,
      },
    });

    if (!userTeam) {
      return NextResponse.json(
        { error: 'Asignación no encontrada' },
        { status: 404 }
      );
    }

    // Eliminar asignación
    await prisma.userTeam.delete({
      where: { id: userTeamId },
    });

    // Auditar
    await prisma.auditLog.create({
      data: {
        userId,
        teamId: userTeam.teamId,
        action: 'DELETE',
        entity: 'UserTeam',
        description: `Usuario ${userTeam.user.email} removido de ${userTeam.team.name}`,
        ipAddress: request.headers.get('x-forwarded-for') || undefined,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Usuario removido del equipo',
    });
  } catch (error) {
    console.error('Error deleting user-team:', error);
    return NextResponse.json(
      { error: 'Error removiendo usuario' },
      { status: 500 }
    );
  }
}
