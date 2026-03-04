import { NextRequest, NextResponse } from 'next/server';
import { verifyRefreshToken, generateAccessToken } from '@/lib/jwt';

/**
 * POST /api/auth/refresh
 * 
 * Usa el refresh token de las cookies para generar un nuevo access token
 * El refresh token se envía automáticamente en las cookies del header
 */
export async function POST(request: NextRequest) {
  try {
    // Obtener refresh token de las cookies
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

    // Generar nuevo access token
    const newAccessToken = generateAccessToken({
      userId: payload.userId,
      email: payload.email,
      globalRole: payload.globalRole,
    });

    return NextResponse.json({
      success: true,
      accessToken: newAccessToken,
    });
  } catch (error) {
    console.error('Refresh token error:', error);
    return NextResponse.json(
      { message: 'Error al refrescar token' },
      { status: 500 }
    );
  }
}
