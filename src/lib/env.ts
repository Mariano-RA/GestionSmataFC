import 'server-only';

const requiredEnvVars = ['DATABASE_URL', 'JWT_SECRET', 'JWT_REFRESH_SECRET'] as const;

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

  const missing = requiredEnvVars.filter((name) => {
    const value = process.env[name];
    return !value || !value.trim();
  });

  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }

  validated = true;
}
