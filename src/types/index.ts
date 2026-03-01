export interface Participant {
  id: number;
  name: string;
  phone?: string;
  notes?: string;
  active: boolean;
  joinDate: string;
  createdAt: string;
}

export interface Payment {
  id: number;
  participantId: number;
  date: string;
  amount: number;
  method?: string;
  note?: string;
  recordedAt: string;
}

export interface Expense {
  id: number;
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