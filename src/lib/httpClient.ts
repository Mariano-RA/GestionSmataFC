/**
 * Cliente HTTP con interceptor JWT
 * Maneja automáticamente:
 * - Agregar token de acceso a headers
 * - Refrescar token si expira (401)
 * - Reintentar request con nuevo token
 */

export interface RequestOptions extends RequestInit {
  disableRefreshRetry?: boolean;
}

type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue };

let isRefreshing = false;
let refreshSubscribers: Array<(token: string) => void> = [];

function subscribeToRefresh(cb: (token: string) => void) {
  refreshSubscribers.push(cb);
}

function onRefreshed(token: string) {
  refreshSubscribers.forEach((cb) => cb(token));
  refreshSubscribers = [];
}

/**
 * Realizar un HTTP request con manejo automático de JWT
 */
export async function httpClient<T = unknown>(
  url: string,
  options: RequestOptions = {}
): Promise<T> {
  // 1. Obtener access token
  const accessToken = typeof window !== 'undefined' 
    ? localStorage.getItem('accessToken')
    : null;

  // 2. Preparar headers
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(typeof options.headers === 'object' && options.headers !== null 
      ? Object.fromEntries(Object.entries(options.headers).map(([k, v]) => [k, String(v)])) 
      : {}),
  };

  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`;
  }

  // 3. Hacer request
  let response = await fetch(url, {
    ...options,
    headers,
  });

  // 4. Si recibimos 401 (token expirado) y no estamos ya refrescando
  if (response.status === 401 && !options.disableRefreshRetry) {
    if (!isRefreshing) {
      isRefreshing = true;

      try {
        // Intentar refrescar token
        const refreshResponse = await fetch('/api/auth/refresh', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include', // Incluir cookies (refreshToken)
        });

        if (refreshResponse.ok) {
          const data = (await refreshResponse.json()) as { accessToken?: string };
          const newAccessToken = data.accessToken;

          if (!newAccessToken) {
            throw new Error('No se recibió accessToken en refresh');
          }

          // Guardar nuevo token
          if (typeof window !== 'undefined') {
            localStorage.setItem('accessToken', newAccessToken);
          }

          // Notificar a otros requests que el token fue refrescado
          onRefreshed(newAccessToken);
          isRefreshing = false;

          // Reintentar el request original con el nuevo token
          headers['Authorization'] = `Bearer ${newAccessToken}`;
          const { disableRefreshRetry: _, ...fetchOptions } = options;
          response = await fetch(url, {
            ...fetchOptions,
            headers,
          });
        } else {
          // El refresh token también expiró, redirigir a login
          isRefreshing = false;
          if (typeof window !== 'undefined') {
            localStorage.removeItem('accessToken');
            localStorage.removeItem('userId');
            window.location.href = '/login';
          }
        }
      } catch (error) {
        isRefreshing = false;
        console.error('Error refrescando token:', error);
        if (typeof window !== 'undefined') {
          localStorage.removeItem('accessToken');
          localStorage.removeItem('userId');
          window.location.href = '/login';
        }
      }
    } else {
      // Ya estamos refrescando, esperar a que termine
      return new Promise((resolve, reject) => {
        subscribeToRefresh((token: string) => {
          headers['Authorization'] = `Bearer ${token}`;
          const { disableRefreshRetry: _, ...fetchOptions } = options;
          fetch(url, { ...fetchOptions, headers })
            .then((r) => r.json())
            .then(resolve)
            .catch(reject);
        });
      });
    }
  }

  // 5. Parsear respuesta
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || `HTTP ${response.status}`);
  }

  return response.json();
}

/**
 * GET request
 */
export function httpGet<T = unknown>(url: string, options?: RequestOptions): Promise<T> {
  return httpClient<T>(url, { ...options, method: 'GET' });
}

/**
 * POST request
 */
export function httpPost<T = unknown>(
  url: string,
  body?: JsonValue,
  options?: RequestOptions
): Promise<T> {
  return httpClient<T>(url, {
    ...options,
    method: 'POST',
    body: body ? JSON.stringify(body) : undefined,
  });
}

/**
 * PATCH request
 */
export function httpPatch<T = unknown>(
  url: string,
  body?: JsonValue,
  options?: RequestOptions
): Promise<T> {
  return httpClient<T>(url, {
    ...options,
    method: 'PATCH',
    body: body ? JSON.stringify(body) : undefined,
  });
}

/**
 * DELETE request
 */
export function httpDelete<T = unknown>(
  url: string,
  options?: RequestOptions
): Promise<T> {
  return httpClient<T>(url, { ...options, method: 'DELETE' });
}
