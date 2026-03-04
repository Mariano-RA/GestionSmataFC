import jwt from 'jsonwebtoken';
import { NextRequest } from 'next/server';
import { getRequiredEnv } from './env';

// Tipos
export interface JWTPayload {
  userId: number;
  email: string;
  globalRole: string;
  iat?: number;
  exp?: number;
  type?: 'access' | 'refresh';
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

// Configuración
const JWT_SECRET = getRequiredEnv('JWT_SECRET');
const JWT_REFRESH_SECRET = getRequiredEnv('JWT_REFRESH_SECRET');
const ACCESS_TOKEN_EXPIRY = '15m'; // 15 minutos
const REFRESH_TOKEN_EXPIRY = '7d'; // 7 días

/**
 * Genera un token de acceso JWT
 */
export function generateAccessToken(payload: Omit<JWTPayload, 'iat' | 'exp'>): string {
  return jwt.sign(
    { ...payload, type: 'access' },
    JWT_SECRET,
    { expiresIn: ACCESS_TOKEN_EXPIRY }
  );
}

/**
 * Genera un token de refresh JWT
 */
export function generateRefreshToken(payload: Omit<JWTPayload, 'iat' | 'exp'>): string {
  return jwt.sign(
    { ...payload, type: 'refresh' },
    JWT_REFRESH_SECRET,
    { expiresIn: REFRESH_TOKEN_EXPIRY }
  );
}

/**
 * Genera ambos tokens (acceso + refresh)
 */
export function generateTokenPair(
  userId: number,
  email: string,
  globalRole: string
): TokenPair {
  const payload = { userId, email, globalRole };

  return {
    accessToken: generateAccessToken(payload),
    refreshToken: generateRefreshToken(payload),
  };
}

/**
 * Verifica y decodifica un token de acceso
 */
export function verifyAccessToken(token: string): JWTPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as unknown as JWTPayload;
    
    // Validar que sea un token de acceso
    if (decoded.type !== 'access') {
      return null;
    }
    
    return decoded;
  } catch (error) {
    return null;
  }
}

/**
 * Verifica y decodifica un token de refresh
 */
export function verifyRefreshToken(token: string): JWTPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_REFRESH_SECRET) as unknown as JWTPayload;
    
    // Validar que sea un token de refresh
    if (decoded.type !== 'refresh') {
      return null;
    }
    
    return decoded;
  } catch (error) {
    return null;
  }
}

/**
 * Extrae el token del header Authorization
 * Espera formato: "Bearer <token>"
 */
export function getTokenFromRequest(request: NextRequest): string | null {
  const authHeader = request.headers.get('authorization');
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  return authHeader.slice(7); // Remover "Bearer "
}

/**
 * Valida el JWT en el request y retorna el payload
 * Retorna null si el token es inválido o no existe
 */
export function validateJWT(request: NextRequest): JWTPayload | null {
  const token = getTokenFromRequest(request);
  
  if (!token) {
    return null;
  }

  return verifyAccessToken(token);
}

/**
 * Extrae el userId del JWT en el request
 */
export function getUserIdFromJWT(request: NextRequest): number | undefined {
  const payload = validateJWT(request);
  return payload?.userId;
}

/**
 * Extrae el token de refresh de las cookies
 */
export function getRefreshTokenFromRequest(request: NextRequest): string | null {
  const cookies = request.cookies.getAll();
  const refreshTokenCookie = cookies.find((c) => c.name === 'refreshToken');
  
  if (!refreshTokenCookie) {
    return null;
  }

  return refreshTokenCookie.value;
}
