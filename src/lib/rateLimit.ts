import { db } from './db';

/**
 * Configuración del rate limiter
 */
const RATE_LIMIT_CONFIG = {
  maxAttempts: 5, // Máximo de intentos fallidos
  windowMinutes: 15, // Ventana de tiempo en minutos
  blockDurationMinutes: 15, // Duración del bloqueo después de exceder el límite
};

/**
 * Verifica si un email/IP está bloqueado por rate limiting
 * @param identifier Email o IP address
 * @returns true si está permitido, false si está bloqueado
 */
export async function checkRateLimit(
  identifier: string,
  ipAddress?: string
): Promise<{ allowed: boolean; remainingAttempts?: number; resetTime?: Date }> {
  const now = new Date();
  const windowStart = new Date(now.getTime() - RATE_LIMIT_CONFIG.windowMinutes * 60 * 1000);

  // Obtener intentos fallidos recientes
  const recentAttempts = await db.loginAttempt.findMany({
    where: {
      email: identifier.toLowerCase().trim(),
      success: false,
      createdAt: {
        gte: windowStart,
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  const failedCount = recentAttempts.length;

  // Si ha excedido el límite
  if (failedCount >= RATE_LIMIT_CONFIG.maxAttempts) {
    const oldestAttempt = recentAttempts[recentAttempts.length - 1];
    const resetTime = new Date(
      oldestAttempt.createdAt.getTime() + RATE_LIMIT_CONFIG.blockDurationMinutes * 60 * 1000
    );

    // Verificar si el bloqueo ya expiró
    if (now < resetTime) {
      return {
        allowed: false,
        remainingAttempts: 0,
        resetTime,
      };
    }
  }

  return {
    allowed: true,
    remainingAttempts: RATE_LIMIT_CONFIG.maxAttempts - failedCount,
  };
}

/**
 * Registra un intento de login
 * @param email Email del usuario
 * @param success Si el login fue exitoso
 * @param ipAddress IP del cliente
 * @param userAgent User agent del cliente
 */
export async function recordLoginAttempt(
  email: string,
  success: boolean,
  ipAddress?: string,
  userAgent?: string
): Promise<void> {
  await db.loginAttempt.create({
    data: {
      email: email.toLowerCase().trim(),
      success,
      ipAddress: ipAddress || null,
      userAgent: userAgent || null,
    },
  });

  // Limpiar intentos antiguos (más de 24 horas)
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  await db.loginAttempt.deleteMany({
    where: {
      createdAt: {
        lt: oneDayAgo,
      },
    },
  });
}

/**
 * Limpia todos los intentos fallidos de un email (útil después de login exitoso)
 * @param email Email del usuario
 */
export async function clearLoginAttempts(email: string): Promise<void> {
  await db.loginAttempt.deleteMany({
    where: {
      email: email.toLowerCase().trim(),
      success: false,
    },
  });
}

/**
 * Obtiene estadísticas de intentos de login (útil para monitoreo)
 */
export async function getLoginAttemptStats(hours: number = 24) {
  const since = new Date(Date.now() - hours * 60 * 60 * 1000);

  const [successful, failed, uniqueEmails, uniqueIPs] = await Promise.all([
    db.loginAttempt.count({
      where: {
        success: true,
        createdAt: { gte: since },
      },
    }),
    db.loginAttempt.count({
      where: {
        success: false,
        createdAt: { gte: since },
      },
    }),
    db.loginAttempt.findMany({
      where: { createdAt: { gte: since } },
      select: { email: true },
      distinct: ['email'],
    }),
    db.loginAttempt.findMany({
      where: { 
        createdAt: { gte: since },
        ipAddress: { not: null },
      },
      select: { ipAddress: true },
      distinct: ['ipAddress'],
    }),
  ]);

  return {
    successful,
    failed,
    uniqueEmails: uniqueEmails.length,
    uniqueIPs: uniqueIPs.length,
    period: `${hours} hours`,
  };
}
