import { useState, useCallback } from 'react';
import { useUser } from '@/context/UserContext';
import { logger } from '@/lib/logger';

export interface ApiOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE' | 'PUT';
  body?: Record<string, unknown>;
  headers?: HeadersInit;
  disableAutoParams?: boolean;
}

export interface ApiResponse<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

/**
 * Hook para hacer fetch API calls con JWT y teamId automáticamente
 * Incluye interceptor para:
 * - Agregar token de acceso en Authorization header
 * - Refrescar token si expira
 * - Agregar teamId automáticamente
 * 
 * Uso:
 * const { data, loading, error, request } = useApi();
 * 
 * await request('/api/participants', {
 *   method: 'POST',
 *   body: { name: 'Juan' }
 * });
 */
export function useApi() {
  const { user, currentTeamId } = useUser();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const request = useCallback(
    async <T,>(endpoint: string, options: ApiOptions = {}): Promise<T | null> => {
      setLoading(true);
      setError(null);

      try {
        // Agregar params automáticamente
        let url = endpoint;
        const params = new URLSearchParams();

        if (!options.disableAutoParams && currentTeamId) {
          // Si no es GET, agregar teamId al body
          if ((options.method || 'GET') !== 'GET' && options.body) {
            options.body.teamId = currentTeamId;
          } else if ((options.method || 'GET') === 'GET') {
            params.append('teamId', currentTeamId.toString());
          }
        }

        if (params.toString()) {
          url += (endpoint.includes('?') ? '&' : '?') + params.toString();
        }

        // Preparar headers CON SOPORTE JWT
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
          ...(typeof options.headers === 'object' && options.headers !== null
            ? Object.fromEntries(Object.entries(options.headers).map(([k, v]) => [k, String(v)]))
            : {}),
        };

        // Agregar JWT access token si existe
        const accessToken = localStorage.getItem('accessToken');
        if (accessToken) {
          headers['Authorization'] = `Bearer ${accessToken}`;
        }

        let response = await fetch(url, {
          method: options.method || 'GET',
          headers,
          credentials: 'include', // Incluir cookies (comentario: para refresh token)
          body: options.body ? JSON.stringify(options.body) : undefined,
        });

        // Si recibimos 401, intentar refrescar token
        if (response.status === 401 && accessToken) {
          try {
            const refreshResponse = await fetch('/api/auth/refresh', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              credentials: 'include',
            });

            if (refreshResponse.ok) {
              const refreshData = await refreshResponse.json();
              const newAccessToken = refreshData.accessToken;

              // Guardar nuevo token
              localStorage.setItem('accessToken', newAccessToken);

              // Reintentar request con token nuevo
              const headersWithNewToken = {
                ...headers,
                ['Authorization']: `Bearer ${newAccessToken}`,
              };

              response = await fetch(url, {
                method: options.method || 'GET',
                headers: headersWithNewToken,
                credentials: 'include',
                body: options.body ? JSON.stringify(options.body) : undefined,
              });
            } else {
              // Token expirado, ir a login
              localStorage.removeItem('accessToken');
              localStorage.removeItem('userId');
              window.location.href = '/login';
              return null;
            }
          } catch (refreshError) {
            logger.error('Error refrescando token:', refreshError);
            localStorage.removeItem('accessToken');
            localStorage.removeItem('userId');
            window.location.href = '/login';
            return null;
          }
        }

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ message: 'Error desconocido' }));
          throw new Error(errorData.message || `HTTP ${response.status}`);
        }

        const data = await response.json();
        setLoading(false);
        return data;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Error desconocido';
        setError(message);
        setLoading(false);
        return null;
      }
    },
    [user?.id, currentTeamId]
  );

  return { request, loading, error };
}
