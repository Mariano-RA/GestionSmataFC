import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { verifyRefreshToken, generateTokenPair } from '@/lib/jwt';
import { db as prisma } from '@/lib/db';
import { getClientIp } from '@/lib/auth';
import { checkRefreshRateLimit, recordRefreshAttempt } from '@/lib/rateLimit';
import { ApiResponse } from '@/lib/api-response';
import { logger } from '@/lib/logger';

/**
 * POST /api/auth/refresh
 *
 * Usa el refresh token de las cookies para generar un nuevo access token.
 * Limitado por IP para evitar abuso.
 */
export async function POST(request: NextRequest) {
  try {
    const ip = getClientIp(request);
    const rateLimit = await checkRefreshRateLimit(ip ?? '');
    if (!rateLimit.allowed) {
      return ApiResponse.rateLimited(
        `Demasiadas solicitudes. Reintente después de ${rateLimit.resetTime?.toLocaleTimeString('es-AR') ?? 'unos minutos'}.`
      );
    }

    const refreshToken = request.cookies.get('refreshToken')?.value;

    if (!refreshToken) {
      return NextResponse.json(
        { message: 'No refresh token provided' },
        { status: 401 }
      );
    }

    // Verificar refresh token
    const payload = verifyRefreshToken(refreshToken);

    if (!payload) {
      return NextResponse.json(
        { message: 'Refresh token inválido o expirado' },
        { status: 401 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: {
        id: true,
        email: true,
        globalRole: true,
        active: true,
        refreshTokenHash: true,
        refreshTokenExpiresAt: true,
      },
    });

    if (!user || !user.active || !user.refreshTokenHash || !user.refreshTokenExpiresAt) {
      return NextResponse.json(
        { message: 'Refresh token inválido o revocado' },
        { status: 401 }
      );
    }

    if (user.refreshTokenExpiresAt.getTime() < Date.now()) {
      return NextResponse.json(
        { message: 'Refresh token expirado' },
        { status: 401 }
      );
    }

    const tokenMatches = await bcrypt.compare(refreshToken, user.refreshTokenHash);
    if (!tokenMatches) {
      return NextResponse.json(
        { message: 'Refresh token inválido o revocado' },
        { status: 401 }
      );
    }

    // Rotar tokens
    const { accessToken, refreshToken: newRefreshToken } = generateTokenPair(
      user.id,
      user.email,
      user.globalRole
    );

    const newRefreshTokenHash = await bcrypt.hash(newRefreshToken, 10);
    const newRefreshTokenExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        refreshTokenHash: newRefreshTokenHash,
        refreshTokenExpiresAt: newRefreshTokenExpiresAt,
      },
    });

    await recordRefreshAttempt(ip ?? '');

    const response = NextResponse.json({
      success: true,
      data: { accessToken },
    });

    response.cookies.set('refreshToken', newRefreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60,
      path: '/',
    });

    return response;
  } catch (error) {
    logger.error('Refresh token error:', error);
    return NextResponse.json(
      { message: 'Error al refrescar token' },
      { status: 500 }
    );
  }
}
