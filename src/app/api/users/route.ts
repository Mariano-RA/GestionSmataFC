import { NextRequest, NextResponse } from 'next/server';
import { db as prisma } from '@/lib/db';
import bcrypt from 'bcryptjs';
import { validateRequestAuth, getClientIp } from '@/lib/auth';
import { createUserSchema } from '@/lib/schemas';
import { ApiResponse } from '@/lib/api-response';
import { logger } from '@/lib/logger';
import type { Prisma } from '@prisma/client';

// GET /api/users - Lista todos los usuarios
export async function GET(request: NextRequest) {
  try {
    // Validar JWT
    const auth = validateRequestAuth(request);
    if (!auth.authorized) {
      return ApiResponse.unauthorized(auth.error);
    }

    const { searchParams } = new URL(request.url);
    const teamId = searchParams.get('teamId');
    const active = searchParams.get('active');

    const where: Prisma.UserWhereInput = {};

    if (active !== null) {
      where.active = active === 'true';
    }

    if (teamId) {
      where.userTeams = {
        some: {
          teamId: parseInt(teamId),
        },
      };
    }

    const users = await prisma.user.findMany({
      where,
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
      orderBy: { createdAt: 'desc' },
    });

    return ApiResponse.ok(users);
  } catch (error) {
    logger.error('Error fetching users:', error);
    return ApiResponse.internalError('Error al obtener los usuarios');
  }
}

// POST /api/users - Crear un nuevo usuario
export async function POST(request: NextRequest) {
  try {
    // Validar JWT
    const auth = validateRequestAuth(request);
    if (!auth.authorized) {
      return ApiResponse.unauthorized(auth.error || '');
    }

    const currentUserId = auth.userId;
    const body = await request.json();

    // Validar con Zod
    const validation = createUserSchema.safeParse(body);
    if (!validation.success) {
      return ApiResponse.fromZodError(validation.error);
    }

    const { email, name, password } = validation.data;
    const teamIds = Array.isArray(body.teamIds) ? body.teamIds : [];

    // Verificar si el email ya existe
    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    });

    if (existingUser) {
      logger.warn('Attempt to create user with existing email', { email });
      return ApiResponse.conflict('El email ya está registrado');
    }

    // Hashear la contraseña
    const passwordHash = await bcrypt.hash(password, 10);

    // Crear el usuario con sus equipos
    const user = await prisma.user.create({
      data: {
        email: email.toLowerCase().trim(),
        name: name.trim(),
        passwordHash,
        userTeams: {
          create: teamIds.map((teamId: number) => ({
            teamId,
            role: 'admin',
          })),
        },
      },
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
        action: 'CREATE',
        entity: 'User',
        entityId: user.id,
        description: `Usuario creado: ${user.name} (${user.email})`,
        metadata: JSON.stringify({ email, name, teamIds }),
        ipAddress: getClientIp(request) || null,
      },
    });

    logger.log('User created successfully', { userId: user.id, email });

    return ApiResponse.created(user);
  } catch (error) {
    logger.error('Error creating user:', error);
    return ApiResponse.internalError('Error al crear el usuario');
  }
}
