/**
 * Tipos de dominio para el frontend.
 * Deben mantenerse alineados con prisma/schema.prisma: mismos campos y relaciones.
 * Las fechas se usan como string (ISO) por serialización JSON; en Prisma son DateTime.
 */

export interface Team {
  id: number;
  name: string;
  description?: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface User {
  id: number;
  email: string;
  name: string;
  active: boolean;
  preferredTeamId?: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface UserTeam {
  id: number;
  userId: number;
  teamId: number;
  role: string;
  user?: User;
  team?: Team;
  createdAt: string;
  updatedAt: string;
}

export interface AuditLog {
  id: number;
  teamId?: number;
  userId?: number;
  action: string;
  entity: string;
  entityId?: number;
  description: string;
  metadata?: string;
  ipAddress?: string;
  createdAt: string;
  user?: User;
  team?: Team;
}

export type ParticipantStatus = 'activo' | 'sin_laburo' | 'lesionado';

export interface Participant {
  id: number;
  teamId: number;
  name: string;
  phone?: string;
  notes?: string;
  active: boolean;
  status?: ParticipantStatus | null;
  joinDate: string;
  createdAt: string;
}

export interface Payment {
  id: number;
  teamId: number;
  participantId: number;
  date: string;
  amount: number;
  method?: string;
  note?: string;
  recordedAt: string;
}

export interface Expense {
  id: number;
  teamId: number;
  name: string;
  amount: number;
  date: string;
  category: string;
  recordedAt: string;
}

const DEFAULT_EXPENSE_CATEGORIES = ['Alquiler', 'Arbitraje', 'Equipamiento', 'Otros'];

/** Contrato de configuración global (GET /api/config sin month). */
export interface AppConfig {
  monthlyTarget: number;
  fieldRental: number;
  maxParticipants: number;
  notes: string;
  /** Categorías de gastos personalizadas (guardadas en Config key EXPENSE_CATEGORIES). */
  expenseCategories?: string[];
}

export { DEFAULT_EXPENSE_CATEGORIES };

/** Config mensual en BD (rent). La API puede devolver fieldRental como alias. */
export interface MonthlyConfig {
  teamId: number;
  month: string;
  monthlyTarget: number;
  rent: number;
}

/** Respuesta de GET /api/config?month=YYYY-MM: siempre incluye fieldRental para unificar con AppConfig. */
export interface MonthlyConfigResponse extends Omit<MonthlyConfig, 'rent'> {
  fieldRental: number;
  rent?: number;
}

export interface ParticipantStats {
  id: number;
  name: string;
  paid: number;
  required: number;
  balance: number;
  debt: number;
}