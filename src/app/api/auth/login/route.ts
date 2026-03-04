import { db as prisma } from '@/lib/db';
import bcrypt from 'bcryptjs';
import { NextRequest, NextResponse } from 'next/server';
import { generateTokenPair } from '@/lib/jwt';
import { loginSchema } from '@/lib/schemas';
import { ApiResponse } from '@/lib/api-response';
import { logger } from '@/lib/logger';

// Rate limiting simple (en producción usar algo más robusto)
const loginAttempts = new Map<string, { count: number; resetTime: number }>();

function checkRateLimit(email: string): boolean {
  const now = Date.now();
  const attempt = loginAttempts.get(email);

  if (!attempt || now > attempt.resetTime) {
    // Resetear si pasó el tiempo o no existe
    loginAttempts.set(email, { count: 1, resetTime: now + 15 * 60 * 1000 }); // 15 min
    return true;
  }

  if (attempt.count >= 5) {
    // Máximo 5 intentos en 15 minutos
    return false;
  }

  attempt.count++;
  return true;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validar con Zod
    const validation = loginSchema.safeParse(body);
    if (!validation.success) {
      return ApiResponse.validationError(
        'Validación fallida',
        validation.error.issues.map((issue) => ({
          path: issue.path.join('.'),
          message: issue.message,
        }))
      );
    }

    const { email, password } = validation.data;

    // Rate limiting
    if (!checkRateLimit(email)) {
      return ApiResponse.rateLimited(
        'Demasiados intentos fallidos. Intenta de nuevo más tarde'
      );
    }

    // Buscar usuario por email
    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        userTeams: {
          include: { team: true },
        },
      },
    });

    if (!user) {
      logger.warn('Login attempt with non-existent email', { email });
      return ApiResponse.unauthorized('Usuario o contraseña incorrectos');
    }

    if (!user.active) {
      logger.warn('Login attempt with inactive user', { email });
      return ApiResponse.unauthorized('Usuario inactivo');
    }

    // Verificar contraseña
    const passwordMatch = await bcrypt.compare(password, user.passwordHash);

    if (!passwordMatch) {
      logger.warn('Login attempt with incorrect password', { email });
      return ApiResponse.unauthorized('Usuario o contraseña incorrectos');
    }

    // Generar tokens JWT
    const { accessToken, refreshToken } = generateTokenPair(
      user.id,
      user.email,
      user.globalRole
    );

    // Crear respuesta
    const response = ApiResponse.ok({
      userId: user.id,
      email: user.email,
      name: user.name,
      globalRole: user.globalRole,
      teams: user.userTeams.map((ut: any) => ({
        id: ut.team.id,
        name: ut.team.name,
        role: ut.role,
      })),
      accessToken, // Token de acceso (corta duración)
    });

    // Guardar refresh token en cookie HTTP-only (seguro contra XSS)
    response.cookies.set('refreshToken', refreshToken, {
      httpOnly: true, // No accesible desde JavaScript
      secure: process.env.NODE_ENV === 'production', // HTTPS solo en producción
      sameSite: 'strict', // CSRF protection
      maxAge: 7 * 24 * 60 * 60, // 7 días
      path: '/',
    });

    // Limpiar contador de intentos fallidos
    loginAttempts.delete(email);

    logger.log('User logged in successfully', { userId: user.id, email });

    return response;
  } catch (error) {
    logger.error('Login error:', error);
    return ApiResponse.internalError('Error al procesar login');
  }
}
