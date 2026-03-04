import { db as prisma } from '@/lib/db';
import { validateRequestAuth, validateSuperAdmin } from '@/lib/auth';
import bcrypt from 'bcryptjs';
import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/admin/users/[id]
 * Super admin only: Obtener datos de un usuario específico
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
    const targetUserId = parseInt(id);

    const user = await prisma.user.findUnique({
      where: { id: targetUserId },
      select: {
        id: true,
        email: true,
        name: true,
        globalRole: true,
        active: true,
        createdAt: true,
        updatedAt: true,
        userTeams: {
          select: {
            id: true,
            teamId: true,
            role: true,
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

    if (!user) {
      return NextResponse.json(
        { error: 'Usuario no encontrado' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: user,
    });
  } catch (error) {
    console.error('Error fetching user:', error);
    return NextResponse.json(
      { error: 'Error obteniendo usuario' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/admin/users/[id]
 * Super admin only: Actualizar usuario (nombre, email, rol global, estado)
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
    const targetUserId = parseInt(id);
    const { name, email, globalRole, active, password } = await request.json();

    // Validar que el usuario existe
    const user = await prisma.user.findUnique({
      where: { id: targetUserId },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'Usuario no encontrado' },
        { status: 404 }
      );
    }

    // Preparar datos para actualizar
    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (email !== undefined) {
      // Validar email único (excepto el actual)
      const existingEmail = await prisma.user.findFirst({
        where: {
          email,
          NOT: { id: targetUserId },
        },
      });
      if (existingEmail) {
        return NextResponse.json(
          { error: 'Email ya existe' },
          { status: 400 }
        );
      }
      updateData.email = email;
    }
    if (globalRole !== undefined) updateData.globalRole = globalRole;
    if (active !== undefined) updateData.active = active;
    if (password !== undefined) {
      updateData.passwordHash = await bcrypt.hash(password, 10);
    }

    const updatedUser = await prisma.user.update({
      where: { id: targetUserId },
      data: updateData,
      select: {
        id: true,
        email: true,
        name: true,
        globalRole: true,
        active: true,
      },
    });

    // Auditar
    await prisma.auditLog.create({
      data: {
        userId,
        action: 'UPDATE',
        entity: 'User',
        entityId: targetUserId,
        description: `Usuario actualizado: ${user.email}`,
        metadata: JSON.stringify({ changes: Object.keys(updateData) }),
        ipAddress: request.headers.get('x-forwarded-for') || undefined,
      },
    });

    return NextResponse.json({
      success: true,
      data: updatedUser,
      message: 'Usuario actualizado',
    });
  } catch (error) {
    console.error('Error updating user:', error);
    return NextResponse.json(
      { error: 'Error actualizando usuario' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/users/[id]
 * Super admin only: Desactivar usuario (no se puede eliminar, solo desactivar)
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
    const targetUserId = parseInt(id);

    // No permitir eliminar al mismo super admin
    if (userId === targetUserId) {
      return NextResponse.json(
        { error: 'No puedes desactivar tu propia cuenta' },
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

    // Desactivar en lugar de eliminar
    const deactivatedUser = await prisma.user.update({
      where: { id: targetUserId },
      data: { active: false },
      select: {
        id: true,
        email: true,
        name: true,
        active: true,
      },
    });

    // Auditar
    await prisma.auditLog.create({
      data: {
        userId,
        action: 'DELETE',
        entity: 'User',
        entityId: targetUserId,
        description: `Usuario desactivado: ${user.email}`,
        ipAddress: request.headers.get('x-forwarded-for') || undefined,
      },
    });

    return NextResponse.json({
      success: true,
      data: deactivatedUser,
      message: 'Usuario desactivado',
    });
  } catch (error) {
    console.error('Error deleting user:', error);
    return NextResponse.json(
      { error: 'Error desactivando usuario' },
      { status: 500 }
    );
  }
}
