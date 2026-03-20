/**
 * Zod schemas for request validation
 * Use these to validate POST/PATCH request bodies before processing
 */

import { z } from 'zod';

// ==================== AUTH SCHEMAS ====================

export const loginSchema = z.object({
  email: z.string('Email requerido').email('Email inválido'),
  password: z.string('Contraseña requerida').min(1, 'Contraseña requerida'),
});

export type LoginRequest = z.infer<typeof loginSchema>;

// ==================== USER SCHEMAS ====================

export const createUserSchema = z.object({
  email: z.string('Email requerido').email('Email inválido'),
  password: z.string('Contraseña requerida').min(8, 'Mínimo 8 caracteres'),
  name: z.string('Nombre requerido').min(2, 'Nombre muy corto'),
});

export type CreateUserRequest = z.infer<typeof createUserSchema>;

export const updateUserSchema = z.object({
  email: z.string('Email requerido').email('Email inválido').optional(),
  password: z.string().min(8, 'Mínimo 8 caracteres').optional(),
  name: z.string('Nombre requerido').min(2, 'Nombre muy corto').optional(),
  active: z.boolean().optional(),
});

export type UpdateUserRequest = z.infer<typeof updateUserSchema>;

// ==================== TEAM SCHEMAS ====================

export const createTeamSchema = z.object({
  name: z.string('Nombre requerido').min(2, 'Nombre muy corto'),
  description: z.string().optional(),
  active: z.boolean().optional(),
});

export type CreateTeamRequest = z.infer<typeof createTeamSchema>;

export const updateTeamSchema = z.object({
  name: z.string('Nombre requerido').min(2, 'Nombre muy corto').optional(),
  description: z.string().optional(),
  active: z.boolean().optional(),
});

export type UpdateTeamRequest = z.infer<typeof updateTeamSchema>;

// ==================== PARTICIPANT SCHEMAS ====================

const participantStatusSchema = z.enum(['activo', 'sin_laburo', 'lesionado']).optional().default('activo');

export const createParticipantSchema = z.object({
  teamId: z.coerce.number().int().positive('Team ID requerido'),
  name: z.string('Nombre requerido').min(2, 'Nombre muy corto'),
  phone: z.string().optional(),
  notes: z.string().optional(),
  status: participantStatusSchema,
});

export type CreateParticipantRequest = z.infer<typeof createParticipantSchema>;

export const updateParticipantSchema = z.object({
  name: z.string('Nombre requerido').min(2, 'Nombre muy corto').optional(),
  phone: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  active: z.boolean().optional(),
  status: z.enum(['activo', 'sin_laburo', 'lesionado']).nullable().optional(),
});

export type UpdateParticipantRequest = z.infer<typeof updateParticipantSchema>;

// ==================== EXPENSE SCHEMAS ====================

export const createExpenseSchema = z.object({
  teamId: z.coerce.number().int().positive('Team ID requerido'),
  name: z.string('Nombre requerido').min(2, 'Nombre muy corto'),
  amount: z.coerce.number('Monto requerido').positive('Debe ser positivo'),
  date: z.string('Fecha requerida').min(1, 'Fecha requerida'),
  category: z.string().optional(),
});

export type CreateExpenseRequest = z.infer<typeof createExpenseSchema>;

export const updateExpenseSchema = z.object({
  name: z.string('Nombre requerido').min(2, 'Nombre muy corto').optional(),
  amount: z.coerce.number('Monto requerido').positive('Debe ser positivo').optional(),
  date: z.string('Fecha requerida').min(1, 'Fecha requerida').optional(),
  category: z.string().nullable().optional(),
});

export type UpdateExpenseRequest = z.infer<typeof updateExpenseSchema>;

// ==================== PAYMENT SCHEMAS ====================

export const createPaymentSchema = z.object({
  teamId: z.coerce.number().int().positive('Team ID requerido'),
  participantId: z.coerce.number().int().positive('Participant ID requerido'),
  date: z.string('Fecha requerida').min(1, 'Fecha requerida'),
  amount: z.coerce.number('Monto requerido').positive('Debe ser positivo'),
  method: z.string().optional(),
  note: z.string().optional(),
});

export type CreatePaymentRequest = z.infer<typeof createPaymentSchema>;

export const updatePaymentSchema = z.object({
  participantId: z.coerce.number().int().positive('Participant ID requerido').optional(),
  date: z.string('Fecha requerida').min(1, 'Fecha requerida').optional(),
  amount: z.coerce.number('Monto requerido').positive('Debe ser positivo').optional(),
  method: z.string().nullable().optional(),
  note: z.string().nullable().optional(),
});

export const monthlyConfigSchema = z.object({
  monthlyTarget: z.coerce.number().positive('monthlyTarget debe ser positivo'),
  rent: z.coerce.number().nonnegative('rent no puede ser negativo'),
  activeParticipants: z.coerce.number().int().positive().optional(),
  effectiveParticipants: z.coerce.number().positive().optional(),
  monthlyShare: z.coerce.number().nonnegative().optional(),
});

export type MonthlyConfigRequest = z.infer<typeof monthlyConfigSchema>;

export type UpdatePaymentRequest = z.infer<typeof updatePaymentSchema>;

// ==================== CONFIG SCHEMAS ====================

export const updateConfigSchema = z.object({
  splitType: z.enum(['equal', 'custom']).optional(),
  autoCalculate: z.boolean().optional(),
  currency: z.string().optional(),
});

export type UpdateConfigRequest = z.infer<typeof updateConfigSchema>;

// ==================== USER-TEAM SCHEMAS ====================

export const createUserTeamSchema = z.object({
  userId: z.coerce.number().int().positive('User ID requerido'),
  teamId: z.coerce.number().int().positive('Team ID requerido'),
  role: z.enum(['admin', 'viewer']).optional().default('admin'),
});

export type CreateUserTeamRequest = z.infer<typeof createUserTeamSchema>;

export const updateUserTeamSchema = z.object({
  role: z.enum(['admin', 'viewer']),
});

export type UpdateUserTeamRequest = z.infer<typeof updateUserTeamSchema>;

// ==================== VALIDATION HELPER ====================

// ==================== IMPORT (BACKUP) SCHEMAS ====================

const importParticipantSchema = z.object({
  id: z.number().optional(),
  name: z.string().min(1, 'Nombre requerido'),
  phone: z.string().optional(),
  notes: z.string().optional(),
  active: z.boolean().optional(),
  status: z.enum(['activo', 'sin_laburo', 'lesionado']).optional(),
});

const importPaymentSchema = z.object({
  participantId: z.number().int().nonnegative(),
  date: z.string().min(1),
  amount: z.coerce.number().int().nonnegative(),
  method: z.string().optional(),
  note: z.string().optional(),
});

const importExpenseSchema = z.object({
  name: z.string().min(1),
  amount: z.coerce.number().int().nonnegative(),
  date: z.string().min(1),
  category: z.string().optional(),
});

const importConfigSchema = z.object({
  monthlyTarget: z.coerce.number().nonnegative().optional(),
  fieldRental: z.coerce.number().nonnegative().optional(),
  maxParticipants: z.coerce.number().int().positive().optional(),
  notes: z.string().optional(),
});

export const importBackupSchema = z.object({
  teamId: z.coerce.number().int().positive(),
  participants: z.array(importParticipantSchema).optional().default([]),
  payments: z.array(importPaymentSchema).optional().default([]),
  expenses: z.array(importExpenseSchema).optional().default([]),
  config: importConfigSchema.optional(),
});

export type ImportBackupRequest = z.infer<typeof importBackupSchema>;

// ==================== VALIDATION HELPER ====================

/**
 * Validate request body against schema
 * Returns { isValid: true, data } or { isValid: false, errors }
 */
export function validateRequest<T>(schema: z.ZodSchema, data: unknown):
  | { isValid: true; data: T }
  | { isValid: false; errors: z.ZodIssue[] } {
  const result = schema.safeParse(data);
  if (result.success) {
    return { isValid: true, data: result.data as T };
  }
  return { isValid: false, errors: result.error.issues };
}
