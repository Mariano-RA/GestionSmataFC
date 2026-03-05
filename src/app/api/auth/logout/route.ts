import { NextRequest, NextResponse } from 'next/server';
import { verifyRefreshToken } from '@/lib/jwt';
import { db as prisma } from '@/lib/db';
import { logger } from '@/lib/logger';
import { createAuditLog, getClientIp } from '@/lib/audit';

/**
 * POST /api/auth/logout
 * 
 * Limpia el refresh token de las cookies
 */
export async function POST(request: NextRequest) {
  try {
    const refreshToken = request.cookies.get('refreshToken')?.value;
    const ipAddress = getClientIp(request);
    let userId: number | undefined;

    if (refreshToken) {
      const payload = verifyRefreshToken(refreshToken);

      if (payload?.userId) {
        userId = payload.userId;
        
        // Obtener info del usuario para la auditoría
        const user = await prisma.user.findUnique({
          where: { id: payload.userId },
          select: { id: true, name: true, email: true },
        });

        // Limpiar refresh token
        await prisma.user.update({
          where: { id: payload.userId },
          data: {
            refreshTokenHash: null,
            refreshTokenExpiresAt: null,
          },
        });

        // Auditoría de logout
        if (user) {
          await createAuditLog({
            userId: user.id,
            action: 'DELETE',
            entity: 'Logout',
            description: `Usuario cerró sesión: ${user.name} (${user.email})`,
            metadata: { email: user.email },
            ipAddress,
          });

          logger.log('User logged out successfully', { 
            userId: user.id, 
            email: user.email,
            ipAddress,
          });
        }
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
