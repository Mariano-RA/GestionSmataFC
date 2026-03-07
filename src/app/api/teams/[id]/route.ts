import { NextRequest, NextResponse } from 'next/server';
import { db as prisma } from '@/lib/db';
import { validateRequestAuth, getClientIp } from '@/lib/auth';
import { createAuditLog } from '@/lib/audit';
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

    const ip = getClientIp(request) ?? undefined;

    const team = await prisma.$transaction(async (tx) => {
      const updated = await tx.team.update({
        where: { id: teamId },
        data: {
          ...(name !== undefined && { name: name.trim() }),
          ...(description !== undefined && { description: description?.trim() || null }),
          ...(active !== undefined && { active }),
        },
      });
      await createAuditLog(
        {
          teamId: updated.id,
          userId,
          action: 'UPDATE',
          entity: 'Team',
          entityId: updated.id,
          description: `Equipo actualizado: ${updated.name}`,
          metadata: { before: currentTeam, after: updated },
          ipAddress: ip,
        },
        tx
      );
      return updated;
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

    const auth = validateRequestAuth(request);
    const userId = auth.authorized ? auth.userId : undefined;
    const ip = getClientIp(request) ?? undefined;

    await prisma.$transaction(async (tx) => {
      await createAuditLog(
        {
          teamId: team.id,
          userId,
          action: 'DELETE',
          entity: 'Team',
          entityId: team.id,
          description: `Equipo eliminado: ${team.name}`,
          metadata: team,
          ipAddress: ip,
        },
        tx
      );
      await tx.team.delete({
        where: { id: teamId },
      });
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
