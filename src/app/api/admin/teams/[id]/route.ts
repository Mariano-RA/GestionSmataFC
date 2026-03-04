import { db as prisma } from '@/lib/db';
import { validateRequestAuth, validateSuperAdmin } from '@/lib/auth';
import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/admin/teams/[id]
 * Super admin only: Obtener datos de un equipo
 */
export async function GET(
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
    const teamId = parseInt(id);

    const team = await prisma.team.findUnique({
      where: { id: teamId },
      select: {
        id: true,
        name: true,
        description: true,
        active: true,
        createdAt: true,
        updatedAt: true,
        userTeams: {
          select: {
            id: true,
            userId: true,
            role: true,
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
        _count: {
          select: {
            participants: true,
            payments: true,
            expenses: true,
          },
        },
      },
    });

    if (!team) {
      return NextResponse.json(
        { error: 'Equipo no encontrado' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: team,
    });
  } catch (error) {
    console.error('Error fetching team:', error);
    return NextResponse.json(
      { error: 'Error obteniendo equipo' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/admin/teams/[id]
 * Super admin only: Actualizar equipo
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
    const teamId = parseInt(id);
    const { name, description, active } = await request.json();

    const team = await prisma.team.findUnique({
      where: { id: teamId },
    });

    if (!team) {
      return NextResponse.json(
        { error: 'Equipo no encontrado' },
        { status: 404 }
      );
    }

    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (active !== undefined) updateData.active = active;

    const updatedTeam = await prisma.team.update({
      where: { id: teamId },
      data: updateData,
      select: {
        id: true,
        name: true,
        description: true,
        active: true,
      },
    });

    // Auditar
    await prisma.auditLog.create({
      data: {
        userId,
        teamId,
        action: 'UPDATE',
        entity: 'Team',
        entityId: teamId,
        description: `Equipo actualizado: ${team.name}`,
        metadata: JSON.stringify({ changes: Object.keys(updateData) }),
        ipAddress: request.headers.get('x-forwarded-for') || undefined,
      },
    });

    return NextResponse.json({
      success: true,
      data: updatedTeam,
      message: 'Equipo actualizado',
    });
  } catch (error) {
    console.error('Error updating team:', error);
    return NextResponse.json(
      { error: 'Error actualizando equipo' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/teams/[id]
 * Super admin only: Desactivar equipo
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
    const teamId = parseInt(id);

    const team = await prisma.team.findUnique({
      where: { id: teamId },
    });

    if (!team) {
      return NextResponse.json(
        { error: 'Equipo no encontrado' },
        { status: 404 }
      );
    }

    // Desactivar en lugar de eliminar
    const deactivatedTeam = await prisma.team.update({
      where: { id: teamId },
      data: { active: false },
      select: {
        id: true,
        name: true,
        active: true,
      },
    });

    // Auditar
    await prisma.auditLog.create({
      data: {
        userId,
        teamId,
        action: 'DELETE',
        entity: 'Team',
        entityId: teamId,
        description: `Equipo desactivado: ${team.name}`,
        ipAddress: request.headers.get('x-forwarded-for') || undefined,
      },
    });

    return NextResponse.json({
      success: true,
      data: deactivatedTeam,
      message: 'Equipo desactivado',
    });
  } catch (error) {
    console.error('Error deleting team:', error);
    return NextResponse.json(
      { error: 'Error desactivando equipo' },
      { status: 500 }
    );
  }
}
