import { db as prisma } from '@/lib/db';
import { validateRequestAuth, validateSuperAdmin } from '@/lib/auth';
import bcrypt from 'bcryptjs';
import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/admin/users
 * Super admin only: Listar todos los usuarios con sus equipos
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
        { error: 'Acceso denegado - Solo super admins' },
        { status: 403 }
      );
    }

    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        globalRole: true,
        active: true,
        createdAt: true,
        _count: {
          select: {
            userTeams: true,
          },
        },
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
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({
      success: true,
      data: users,
      total: users.length,
    });
  } catch (error) {
    console.error('Error listing users:', error);
    return NextResponse.json(
      { error: 'Error listando usuarios' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/users
 * Super admin only: Crear nuevo usuario
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
        { error: 'Acceso denegado - Solo super admins' },
        { status: 403 }
      );
    }

    const { email, name, password, globalRole = 'user' } = await request.json();

    if (!email || !name || !password) {
      return NextResponse.json(
        { error: 'Email, nombre y contraseña requeridos' },
        { status: 400 }
      );
    }

    // Validar email único
    const normalizedEmail = email.toLowerCase().trim();
    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: 'Email ya existe' },
        { status: 400 }
      );
    }

    // Hash contraseña
    const passwordHash = await bcrypt.hash(password, 10);

    // Crear usuario
    const newUser = await prisma.user.create({
      data: {
        email: normalizedEmail,
        name,
        passwordHash,
        globalRole,
        active: true,
      },
      select: {
        id: true,
        email: true,
        name: true,
        globalRole: true,
        active: true,
        createdAt: true,
      },
    });

    // Auditar
    await prisma.auditLog.create({
      data: {
        userId,
        action: 'CREATE',
        entity: 'User',
        entityId: newUser.id,
        description: `Usuario creado: ${email}`,
        metadata: JSON.stringify({ email, name, globalRole }),
        ipAddress: request.headers.get('x-forwarded-for') || undefined,
      },
    });

    return NextResponse.json({
      success: true,
      data: newUser,
      message: 'Usuario creado exitosamente',
    });
  } catch (error) {
    console.error('Error creating user:', error);
    return NextResponse.json(
      { error: 'Error creando usuario' },
      { status: 500 }
    );
  }
}
