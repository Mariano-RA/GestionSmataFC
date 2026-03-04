/**
 * Logger utility with NODE_ENV awareness
 * - Development: Logs to console
 * - Production: No console output (prevent info leaks)
 * 
 * Usage:
 * import { logger } from '@/lib/logger';
 * logger.error('User not found', error);
 * logger.warn('Timeout occurred', data);
 * logger.info('Request started', { url, method });
 */

const isProduction = process.env.NODE_ENV === 'production';
const isDevelopment = !isProduction;

export const logger = {
  /**
   * Log info messages (only in dev)
   */
  log: (message: string, data?: unknown) => {
    if (isDevelopment) {
      console.log(`[INFO] ${message}`, data ?? '');
    }
  },

  /**
   * Log error messages (only in dev, but could send to monitoring in prod)
   */
  error: (message: string, error?: Error | unknown) => {
    if (isDevelopment) {
      console.error(`[ERROR] ${message}`, error ?? '');
    }
    // In production, you could send to Sentry, DataDog, etc
    // Example: if (isProduction) { Sentry.captureException(error); }
  },

  /**
   * Log warnings (only in dev)
   */
  warn: (message: string, data?: unknown) => {
    if (isDevelopment) {
      console.warn(`[WARN] ${message}`, data ?? '');
    }
  },

  /**
   * Log debug messages (only in dev)
   */
  debug: (message: string, data?: unknown) => {
    if (isDevelopment) {
      console.debug(`[DEBUG] ${message}`, data ?? '');
    }
  },

  /**
   * Log info messages (alias for log)
   */
  info: (message: string, data?: unknown) => {
    if (isDevelopment) {
      console.log(`[INFO] ${message}`, data ?? '');
    }
  },
};

/**
 * HTTP Request logging for debugging
 */
export const logHttpRequest = (
  method: string,
  path: string,
  statusCode?: number,
  duration?: number
) => {
  if (isDevelopment) {
    const durationStr = duration ? ` (${duration}ms)` : '';
    const statusStr = statusCode ? ` → ${statusCode}` : '';
    console.log(`[HTTP] ${method} ${path}${statusStr}${durationStr}`);
  }
};

/**
 * API Request logging for debugging
 */
export const logApiCall = (
  endpoint: string,
  method: string = 'GET',
  data?: unknown
) => {
  if (isDevelopment) {
    console.log(`[API] ${method} ${endpoint}`, data ?? '');
  }
};
