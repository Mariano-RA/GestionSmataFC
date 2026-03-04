/**
 * Standardized API Response Helper
 * Ensures consistent error and success response formats
 */

import { NextResponse } from 'next/server';
import { ZodError } from 'zod';

// ==================== RESPONSE TYPES ====================

export interface ApiSuccessResponse<T = unknown> {
  success: true;
  data: T;
  status: number;
  timestamp: string;
}

export interface ApiErrorResponse {
  success: false;
  error: string;
  status: number;
  timestamp: string;
  details?: unknown;
}

// ==================== SUCCESS RESPONSES ====================

/**
 * 200 OK - Successful GET/UPDATE request
 */
export const ApiResponse = {
  ok: <T = unknown>(data: T, customStatus = 200) =>
    NextResponse.json(
      {
        success: true,
        data,
        status: customStatus,
        timestamp: new Date().toISOString(),
      } as ApiSuccessResponse<T>,
      { status: customStatus }
    ),

  /**
   * 201 Created - Successful POST request
   */
  created: <T = unknown>(data: T) =>
    NextResponse.json(
      {
        success: true,
        data,
        status: 201,
        timestamp: new Date().toISOString(),
      } as ApiSuccessResponse<T>,
      { status: 201 }
    ),

  /**
   * 204 No Content - Successful DELETE request
   */
  noContent: () => new NextResponse(null, { status: 204 }),

  // ==================== ERROR RESPONSES ====================

  /**
   * 400 Bad Request - Invalid request data
   */
  badRequest: (error: string, details?: unknown) =>
    NextResponse.json(
      {
        success: false,
        error,
        status: 400,
        timestamp: new Date().toISOString(),
        ...(details !== undefined ? { details } : {}),
      } as ApiErrorResponse,
      { status: 400 }
    ),

  /**
   * 401 Unauthorized - Missing or invalid JWT
   */
  unauthorized: (error?: string | null) =>
    NextResponse.json(
      {
        success: false,
        error: error || 'No autenticado',
        status: 401,
        timestamp: new Date().toISOString(),
      } as ApiErrorResponse,
      { status: 401 }
    ),

  /**
   * 403 Forbidden - User doesn't have permission
   */
  forbidden: (error = 'Acceso denegado') =>
    NextResponse.json(
      {
        success: false,
        error,
        status: 403,
        timestamp: new Date().toISOString(),
      } as ApiErrorResponse,
      { status: 403 }
    ),

  /**
   * 404 Not Found - Resource doesn't exist
   */
  notFound: (error = 'Recurso no encontrado') =>
    NextResponse.json(
      {
        success: false,
        error,
        status: 404,
        timestamp: new Date().toISOString(),
      } as ApiErrorResponse,
      { status: 404 }
    ),

  /**
   * 409 Conflict - Resource already exists or conflict
   */
  conflict: (error = 'Conflicto') =>
    NextResponse.json(
      {
        success: false,
        error,
        status: 409,
        timestamp: new Date().toISOString(),
      } as ApiErrorResponse,
      { status: 409 }
    ),

  /**
   * 422 Unprocessable Entity - Validation error
   */
  validationError: (error: string, details?: unknown) =>
    NextResponse.json(
      {
        success: false,
        error,
        status: 422,
        timestamp: new Date().toISOString(),
        ...(details !== undefined ? { details } : {}),
      } as ApiErrorResponse,
      { status: 422 }
    ),

  /**
   * 429 Too Many Requests - Rate limited
   */
  rateLimited: (error = 'Demasiadas solicitudes') =>
    NextResponse.json(
      {
        success: false,
        error,
        status: 429,
        timestamp: new Date().toISOString(),
      } as ApiErrorResponse,
      { status: 429 }
    ),

  /**
   * 500 Internal Server Error
   */
  internalError: (error = 'Error interno del servidor', details?: unknown) =>
    NextResponse.json(
      {
        success: false,
        error,
        status: 500,
        timestamp: new Date().toISOString(),
        ...(details !== undefined ? { details } : {}),
      } as ApiErrorResponse,
      { status: 500 }
    ),

  /**
   * Handle Zod validation errors
   */
  fromZodError: (zodError: ZodError) => {
    const errors = zodError.issues.map((issue) => ({
      path: issue.path.join('.'),
      message: issue.message,
    }));
    return ApiResponse.validationError('Validación fallida', errors);
  },
};

// ==================== SHORTHAND USAGE ====================

/**
 * Usage examples:
 * 
 * // Success responses
 * return ApiResponse.ok(userData);
 * return ApiResponse.created(newUser);
 * return ApiResponse.noContent();
 * 
 * // Error responses
 * return ApiResponse.unauthorized('Token inválido');
 * return ApiResponse.notFound('Usuario no encontrado');
 * return ApiResponse.badRequest('Campo email es requerido');
 * 
 * // Validation errors
 * if (!result.success) {
 *   return ApiResponse.fromZodError(result.error);
 * }
 * 
 * // Custom errors
 * return ApiResponse.internalError('Database connection failed', error.message);
 */
