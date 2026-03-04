import { NextRequest, NextResponse } from 'next/server';
import { validateJWT, getUserIdFromJWT } from './jwt';
import type { PrismaClient } from '@prisma/client';

/**
 * Extrae el userId del contexto del request
 * Primero intenta obtener del JWT, luego de headers/query params (backward compatibility)
 */
export function getUserIdFromRequest(request: NextRequest): number | undefined {
  // PRIMERO: Intentar obtener del JWT (método preferido)
  const userIdFromJWT = getUserIdFromJWT(request);
  if (userIdFromJWT) {
    return userIdFromJWT;
  }

  // FALLBACK: Intentar obtener de header x-user-id (backward compatibility)
  const userIdHeader = request.headers.get('x-user-id');
  if (userIdHeader) {
    const userId = parseInt(userIdHeader);
    if (!isNaN(userId)) return userId;
  }

  // FALLBACK: Intentar obtener de query params (temporal, no recomendado)
  const { searchParams } = new URL(request.url);
  const userIdParam = searchParams.get('userId');
  if (userIdParam) {
    const userId = parseInt(userIdParam);
    if (!isNaN(userId)) return userId;
  }

  return undefined;
}

/**
 * Valida que el usuario tenga acceso a un equipo específico
 * Retorna true si el usuario puede acceder al equipo
 */
export async function validateUserTeamAccess(
  db: PrismaClient,
  userId: number,
  teamId: number
): Promise<boolean> {
  const userTeam = await db.userTeam.findFirst({
    where: {
      userId,
      teamId,
      user: { active: true },
      team: { active: true },
    },
  });

  return !!userTeam;
}

/**
 * Obtiene los equipos a los que un usuario tiene acceso
 */
export async function getUserTeams(db: PrismaClient, userId: number): Promise<number[]> {
  const userTeams = await db.userTeam.findMany({
    where: {
      userId,
      user: { active: true },
      team: { active: true },
    },
    select: {
      teamId: true,
    },
  });

  return userTeams.map((ut) => ut.teamId);
}

/**
 * Extrae la IP del cliente del request
 */
export function getClientIp(request: NextRequest): string | undefined {
  const forwarded = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');
  
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  
  if (realIp) {
    return realIp.trim();
  }
  
  return undefined;
}

/**
 * Obtiene el globalRole del usuario
 */
export async function getUserGlobalRole(
  db: PrismaClient,
  userId: number
): Promise<string | undefined> {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { globalRole: true },
  });

  return user?.globalRole;
}

/**
 * Valida que el usuario sea super admin
 */
export async function validateSuperAdmin(
  db: PrismaClient,
  userId: number
): Promise<boolean> {
  const globalRole = await getUserGlobalRole(db, userId);
  return globalRole === 'super_admin';
}

/**
 * Middleware para validar JWT en rutas protegidas
 * Retorna { authorized: true, userId, error: null } si es válido
 * Retorna { authorized: false, userId: null, error: string } si es inválido
 */
export function validateRequestAuth(
  request: NextRequest
): { authorized: true; userId: number; error: null } | { authorized: false; userId: null; error: string } {
  const payload = validateJWT(request);

  if (!payload) {
    return {
      authorized: false,
      userId: null,
      error: 'Token inválido o expirado',
    };
  }

  return {
    authorized: true,
    userId: payload.userId,
    error: null,
  };
}

/**
 * Middleware para validar acceso a equipo específico
 * Retorna true si el usuario puede acceder al equipo
 */
export async function validateProtectedTeamRoute(
  request: NextRequest,
  db: PrismaClient,
  teamId: number
): Promise<
  | { authorized: true; userId: number; error: null }
  | { authorized: false; userId: null; error: string }
> {
  // 1. Validar JWT
  const auth = validateRequestAuth(request);
  if (!auth.authorized) {
    return auth;
  }

  const userId = auth.userId;

  // 2. Validar acceso del usuario al equipo
  const hasAccess = await validateUserTeamAccess(db, userId, teamId);
  if (!hasAccess) {
    return {
      authorized: false,
      userId: null,
      error: 'No tienes acceso a este equipo',
    };
  }

  return {
    authorized: true,
    userId,
    error: null,
  };
}
