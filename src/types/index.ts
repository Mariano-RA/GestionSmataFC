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

export interface Participant {
  id: number;
  teamId: number;
  name: string;
  phone?: string;
  notes?: string;
  active: boolean;
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

export interface AppConfig {
  monthlyTarget: number;
  fieldRental: number;
  maxParticipants: number;
  notes: string;
}

export interface MonthlyConfig {
  teamId: number;
  month: string;
  monthlyTarget: number;
  rent: number;
}

export interface ParticipantStats {
  id: number;
  name: string;
  paid: number;
  required: number;
  balance: number;
  debt: number;
}