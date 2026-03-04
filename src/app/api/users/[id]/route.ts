import { NextRequest, NextResponse } from 'next/server';
import { db as prisma } from '@/lib/db';
import bcrypt from 'bcryptjs';
import { validateRequestAuth, getClientIp } from '@/lib/auth';
import type { Prisma } from '@prisma/client';

// GET /api/users/[id] - Obtener un usuario específico
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
    const userId = parseInt(id);

    if (isNaN(userId)) {
      return NextResponse.json(
        { error: 'ID de usuario inválido' },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        active: true,
        createdAt: true,
        updatedAt: true,
        userTeams: {
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

    return NextResponse.json(user);
  } catch (error) {
    console.error('Error fetching user:', error);
    return NextResponse.json(
      { error: 'Error al obtener el usuario' },
      { status: 500 }
    );
  }
}

// PUT /api/users/[id] - Actualizar un usuario
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

    const currentUserId = auth.userId;
    const { id } = await params;
    const userId = parseInt(id);

    if (isNaN(userId)) {
      return NextResponse.json(
        { error: 'ID de usuario inválido' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { email, name, password, active, teamIds } = body;

    const currentUser = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!currentUser) {
      return NextResponse.json(
        { error: 'Usuario no encontrado' },
        { status: 404 }
      );
    }

    // Preparar datos de actualización
    const updateData: Prisma.UserUpdateInput = {};

    if (email !== undefined) {
      updateData.email = email.toLowerCase().trim();
    }
    if (name !== undefined) {
      updateData.name = name.trim();
    }
    if (active !== undefined) {
      updateData.active = active;
    }
    if (password) {
      updateData.passwordHash = await bcrypt.hash(password, 10);
    }

    // Actualizar equipos si se proporcionan
    if (teamIds !== undefined) {
      // Eliminar relaciones existentes
      await prisma.userTeam.deleteMany({
        where: { userId },
      });

      // Crear nuevas relaciones
      updateData.userTeams = {
        create: teamIds.map((teamId: number) => ({
          teamId,
          role: 'admin',
        })),
      };
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        email: true,
        name: true,
        active: true,
        createdAt: true,
        updatedAt: true,
        userTeams: {
          include: {
            team: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });

    // Crear log de auditoría
    await prisma.auditLog.create({
      data: {
        userId: currentUserId || null,
        action: 'UPDATE',
        entity: 'User',
        entityId: user.id,
        description: `Usuario actualizado: ${user.name} (${user.email})`,
        metadata: JSON.stringify({ 
          before: { email: currentUser.email, name: currentUser.name },
          after: { email: user.email, name: user.name }
        }),
        ipAddress: getClientIp(request) || null,
      },
    });

    return NextResponse.json(user);
  } catch (error) {
    console.error('Error updating user:', error);
    return NextResponse.json(
      { error: 'Error al actualizar el usuario' },
      { status: 500 }
    );
  }
}

// DELETE /api/users/[id] - Eliminar un usuario
export async function DELETE(
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
    const targetUserId = parseInt(id);

    if (isNaN(targetUserId)) {
      return NextResponse.json(
        { error: 'ID de usuario inválido' },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: targetUserId },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'Usuario no encontrado' },
        { status: 404 }
      );
    }

    // Crear log antes de eliminar
    await prisma.auditLog.create({
      data: {
        userId: userId || null,
        action: 'DELETE',
        entity: 'User',
        entityId: user.id,
        description: `Usuario eliminado: ${user.name} (${user.email})`,
        metadata: JSON.stringify({ email: user.email, name: user.name }),
        ipAddress: getClientIp(request) || null,
      },
    });

    // Eliminar el usuario (cascade eliminará relaciones)
    await prisma.user.delete({
      where: { id: targetUserId },
    });

    return NextResponse.json({ message: 'Usuario eliminado exitosamente' });
  } catch (error) {
    console.error('Error deleting user:', error);
    return NextResponse.json(
      { error: 'Error al eliminar el usuario' },
      { status: 500 }
    );
  }
}
