import { db as prisma } from '@/lib/db';
import bcrypt from 'bcryptjs';
import { NextRequest, NextResponse } from 'next/server';
import { generateTokenPair } from '@/lib/jwt';
import { loginSchema } from '@/lib/schemas';
import { ApiResponse } from '@/lib/api-response';
import { logger } from '@/lib/logger';
import { checkRateLimit, recordLoginAttempt, clearLoginAttempts } from '@/lib/rateLimit';
import { createAuditLog, getClientIp } from '@/lib/audit';

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
    
    // Normalizar email a minúsculas
    const normalizedEmail = email.toLowerCase().trim();
    const ipAddress = getClientIp(request);
    const userAgent = request.headers.get('user-agent') || undefined;

    // Rate limiting persistente
    const rateLimitCheck = await checkRateLimit(normalizedEmail, ipAddress);
    if (!rateLimitCheck.allowed) {
      logger.warn('Rate limit exceeded', { 
        email: normalizedEmail, 
        ipAddress,
        resetTime: rateLimitCheck.resetTime,
      });

      // Registrar auditoría del intento bloqueado
      await createAuditLog({
        action: 'CREATE',
        entity: 'LoginAttempt',
        description: `Login bloqueado por rate limit: ${normalizedEmail}`,
        metadata: { 
          email: normalizedEmail, 
          reason: 'rate_limit_exceeded',
          resetTime: rateLimitCheck.resetTime,
        },
        ipAddress,
      });

      return ApiResponse.rateLimited(
        'Demasiados intentos fallidos. Intenta de nuevo más tarde'
      );
    }

    // Buscar usuario por email
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      include: {
        userTeams: {
          include: { team: true },
        },
      },
    });

    if (!user) {
      logger.warn('Login attempt with non-existent email', { email: normalizedEmail, ipAddress });
      
      // Registrar intento fallido
      await recordLoginAttempt(normalizedEmail, false, ipAddress, userAgent);
      
      // Auditoría
      await createAuditLog({
        action: 'CREATE',
        entity: 'LoginAttempt',
        description: `Login fallido: email no existe - ${normalizedEmail}`,
        metadata: { email: normalizedEmail, reason: 'user_not_found' },
        ipAddress,
      });

      return ApiResponse.unauthorized('Usuario o contraseña incorrectos');
    }

    if (!user.active) {
      logger.warn('Login attempt with inactive user', { email: normalizedEmail, ipAddress });
      
      // Registrar intento fallido
      await recordLoginAttempt(normalizedEmail, false, ipAddress, userAgent);
      
      // Auditoría
      await createAuditLog({
        userId: user.id,
        action: 'CREATE',
        entity: 'LoginAttempt',
        description: `Login fallido: usuario inactivo - ${normalizedEmail}`,
        metadata: { email: normalizedEmail, reason: 'user_inactive' },
        ipAddress,
      });

      return ApiResponse.unauthorized('Usuario inactivo');
    }

    // Verificar contraseña
    const passwordMatch = await bcrypt.compare(password, user.passwordHash);

    if (!passwordMatch) {
      logger.warn('Login attempt with incorrect password', { email: normalizedEmail, ipAddress });
      
      // Registrar intento fallido
      await recordLoginAttempt(normalizedEmail, false, ipAddress, userAgent);
      
      // Auditoría
      await createAuditLog({
        userId: user.id,
        action: 'CREATE',
        entity: 'LoginAttempt',
        description: `Login fallido: contraseña incorrecta - ${normalizedEmail}`,
        metadata: { email: normalizedEmail, reason: 'wrong_password' },
        ipAddress,
      });

      return ApiResponse.unauthorized('Usuario o contraseña incorrectos');
    }

    // Generar tokens JWT
    const { accessToken, refreshToken } = generateTokenPair(
      user.id,
      user.email,
      user.globalRole
    );

    const refreshTokenHash = await bcrypt.hash(refreshToken, 10);
    const refreshTokenExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        refreshTokenHash,
        refreshTokenExpiresAt,
      },
    });

    // Registrar intento exitoso
    await recordLoginAttempt(normalizedEmail, true, ipAddress, userAgent);
    
    // Limpiar intentos fallidos previos
    await clearLoginAttempts(normalizedEmail);

    // Auditoría de login exitoso
    await createAuditLog({
      userId: user.id,
      action: 'CREATE',
      entity: 'Login',
      description: `Usuario autenticado exitosamente: ${user.name} (${normalizedEmail})`,
      metadata: { 
        email: normalizedEmail,
        globalRole: user.globalRole,
        userAgent,
      },
      ipAddress,
    });

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

    logger.log('User logged in successfully', { userId: user.id, email: normalizedEmail, ipAddress });

    return response;
  } catch (error) {
    logger.error('Login error:', error);
    return ApiResponse.internalError('Error al procesar login');
  }
}

