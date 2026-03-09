/**
 * Tipo para la función de request inyectada (ej. desde useApi).
 * Permite que los servicios sean testables sin depender de React.
 */
export type RequestFn = <T>(
  endpoint: string,
  options?: { method?: 'GET' | 'POST' | 'PATCH' | 'DELETE'; body?: Record<string, unknown>; disableAutoParams?: boolean }
) => Promise<T | null>;
