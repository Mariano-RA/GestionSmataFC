import 'server-only';

const requiredEnvVars = [
  'DATABASE_URL',
  'JWT_SECRET',
  'JWT_REFRESH_SECRET',
] as const;

const productionEnvVars = [
  'NODE_ENV',
  'NEXT_PUBLIC_API_URL',
  'ALLOWED_ORIGINS',
] as const;

let validated = false;

export function getRequiredEnv(name: (typeof requiredEnvVars)[number]): string {
  const value = process.env[name];

  if (!value || !value.trim()) {
    throw new Error(`${name} is required`);
  }

  return value;
}

export function validateCriticalEnv(): void {
  if (validated) {
    return;
  }

  // Validar variables críticas siempre
  const missing = requiredEnvVars.filter((name) => {
    const value = process.env[name];
    return !value || !value.trim();
  });

  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }

  const isProduction = process.env.NODE_ENV === 'production';
  const isVercelBuild = process.env.VERCEL_ENV === 'production';
  const isActiveProdRuntime = isProduction && !process.env.NEXT_PHASE;

  // Solo validar estrictamente en runtime de producción activo
  if (isActiveProdRuntime || isVercelBuild) {
    const missingProd = productionEnvVars.filter((name) => {
      const value = process.env[name];
      return !value || !value.trim();
    });

    if (missingProd.length > 0) {
      throw new Error(
        `Missing required production environment variables: ${missingProd.join(', ')}`
      );
    }

    // Validar que los secrets no sean los de ejemplo
    const jwtSecret = process.env.JWT_SECRET || '';
    const refreshSecret = process.env.JWT_REFRESH_SECRET || '';

    if (
      jwtSecret.includes('GENERATE') ||
      jwtSecret.includes('CHANGE') ||
      jwtSecret.length < 32
    ) {
      throw new Error('JWT_SECRET must be changed to a secure value in production');
    }

    if (
      refreshSecret.includes('GENERATE') ||
      refreshSecret.includes('CHANGE') ||
      refreshSecret.length < 32
    ) {
      throw new Error('JWT_REFRESH_SECRET must be changed to a secure value in production');
    }

    // Validar que la DATABASE_URL use SSL en producción
    const dbUrl = process.env.DATABASE_URL || '';
    if (!dbUrl.includes('sslmode=require') && !dbUrl.includes('ssl=true')) {
      console.warn(
        '⚠️  WARNING: DATABASE_URL should use SSL in production (add ?sslmode=require)'
      );
    }
  } else {
    // En desarrollo o build, solo advertir sobre variables de producción faltantes
    const missingProd = productionEnvVars.filter((name) => {
      const value = process.env[name];
      return !value || !value.trim();
    });

    if (missingProd.length > 0 && !process.env.NEXT_PHASE) {
      console.warn(
        `⚠️  Optional production environment variables not set: ${missingProd.join(', ')}`
      );
    }
  }

  validated = true;
}

/**
 * Obtener configuración de CORS
 */
export function getCorsOrigins(): string[] {
  const origins = process.env.ALLOWED_ORIGINS;
  if (!origins) {
    // En desarrollo, permitir localhost
    if (process.env.NODE_ENV !== 'production') {
      return ['http://localhost:3000', 'http://localhost:3001'];
    }
    return [];
  }
  return origins.split(',').map((o) => o.trim());
}

/**
 * Obtener dominio de cookies
 */
export function getCookieDomain(): string | undefined {
  return process.env.COOKIE_DOMAIN;
}

