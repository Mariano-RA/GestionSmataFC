import { NextRequest, NextResponse } from 'next/server';
import { verifyRefreshToken } from '@/lib/jwt';
import { db as prisma } from '@/lib/db';
import { logger } from '@/lib/logger';

/**
 * POST /api/auth/logout
 * 
 * Limpia el refresh token de las cookies
 */
export async function POST(request: NextRequest) {
  try {
    const refreshToken = request.cookies.get('refreshToken')?.value;

    if (refreshToken) {
      const payload = verifyRefreshToken(refreshToken);

      if (payload?.userId) {
        await prisma.user.update({
          where: { id: payload.userId },
          data: {
            refreshTokenHash: null,
            refreshTokenExpiresAt: null,
          },
        });
      }
    }

    const response = NextResponse.json({
      success: true,
      message: 'Logged out successfully',
    });

    // Limpiar la cookie del refresh token
    response.cookies.set('refreshToken', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 0, // Expira inmediatamente
      path: '/',
    });

    return response;
  } catch (error) {
    logger.error('Logout error:', error);
    return NextResponse.json(
      { message: 'Error al logout' },
      { status: 500 }
    );
  }
}
