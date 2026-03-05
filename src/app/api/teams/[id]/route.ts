import { NextRequest, NextResponse } from 'next/server';
import { db as prisma } from '@/lib/db';
import { validateRequestAuth, getClientIp } from '@/lib/auth';
import { updateTeamSchema } from '@/lib/schemas';
import { ApiResponse } from '@/lib/api-response';

// GET /api/teams/[id] - Obtener un equipo específico
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Validar JWT
    const auth = validateRequestAuth(request);
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error }, { status: 401 });
    }

    const { id } = await params;
    const teamId = parseInt(id);

    if (isNaN(teamId)) {
      return NextResponse.json(
        { error: 'ID de equipo inválido' },
        { status: 400 }
      );
    }

    const team = await prisma.team.findUnique({
      where: { id: teamId },
      include: {
        userTeams: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                active: true,
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

    return NextResponse.json(team);
  } catch (error) {
    console.error('Error fetching team:', error);
    return NextResponse.json(
      { error: 'Error al obtener el equipo' },
      { status: 500 }
    );
  }
}

// PUT /api/teams/[id] - Actualizar un equipo
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Validar JWT
    const auth = validateRequestAuth(request);
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error }, { status: 401 });
    }

    const userId = auth.userId;
    const { id } = await params;
    const teamId = parseInt(id);

    if (isNaN(teamId)) {
      return NextResponse.json(
        { error: 'ID de equipo inválido' },
        { status: 400 }
      );
    }

    const body = await request.json();
    
    // Validar con Zod
    const validation = updateTeamSchema.safeParse(body);
    if (!validation.success) {
      return ApiResponse.fromZodError(validation.error);
    }

    const { name, description, active } = validation.data;

    const currentTeam = await prisma.team.findUnique({
      where: { id: teamId },
    });

    if (!currentTeam) {
      return NextResponse.json(
        { error: 'Equipo no encontrado' },
        { status: 404 }
      );
    }

    const team = await prisma.team.update({
      where: { id: teamId },
      data: {
        ...(name !== undefined && { name: name.trim() }),
        ...(description !== undefined && { description: description?.trim() || null }),
        ...(active !== undefined && { active }),
      },
    });

    // Crear log de auditoría
    await prisma.auditLog.create({
      data: {
        teamId: team.id,
        userId: userId || null,
        action: 'UPDATE',
        entity: 'Team',
        entityId: team.id,
        description: `Equipo actualizado: ${team.name}`,
        metadata: JSON.stringify({ before: currentTeam, after: team }),
        ipAddress: getClientIp(request) || null,
      },
    });

    return NextResponse.json(team);
  } catch (error) {
    console.error('Error updating team:', error);
    return NextResponse.json(
      { error: 'Error al actualizar el equipo' },
      { status: 500 }
    );
  }
}

// DELETE /api/teams/[id] - Eliminar un equipo
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const teamId = parseInt(id);

    if (isNaN(teamId)) {
      return NextResponse.json(
        { error: 'ID de equipo inválido' },
        { status: 400 }
      );
    }

    const team = await prisma.team.findUnique({
      where: { id: teamId },
    });

    if (!team) {
      return NextResponse.json(
        { error: 'Equipo no encontrado' },
        { status: 404 }
      );
    }

    // Crear log antes de eliminar
    const auth = validateRequestAuth(request);
    const userId = auth.authorized ? auth.userId : null;
    await prisma.auditLog.create({
      data: {
        teamId: team.id,
        userId: userId || null,
        action: 'DELETE',
        entity: 'Team',
        entityId: team.id,
        description: `Equipo eliminado: ${team.name}`,
        metadata: JSON.stringify(team),
        ipAddress: getClientIp(request) || null,
      },
    });

    // Eliminar el equipo (cascade eliminará todo lo relacionado)
    await prisma.team.delete({
      where: { id: teamId },
    });

    return NextResponse.json({ message: 'Equipo eliminado exitosamente' });
  } catch (error) {
    console.error('Error deleting team:', error);
    return NextResponse.json(
      { error: 'Error al eliminar el equipo' },
      { status: 500 }
    );
  }
}
