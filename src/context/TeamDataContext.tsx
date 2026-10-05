'use client';

import React, { createContext, useContext, useMemo, type ReactNode } from 'react';
import type { RequestFn } from '@/services/types';
import { useTeamData } from '@/hooks/useTeamData';
import type { Participant, Payment, Expense, AppConfig, MonthlyConfig, ParticipantMonthlyStatus, ParticipantStatus, SeasonClose } from '@/types';
import type { ResolvedMonthlyState } from '@/lib/domain/monthlyStatus';

type AddToast = (message: string, type?: 'success' | 'error' | 'info') => void;

export interface TeamDataContextValue {
  participants: Participant[];
  payments: Payment[];
  expenses: Expense[];
  participantMonthlyStatuses: ParticipantMonthlyStatus[];
  isMonthClosed: (month: string) => boolean;
  getMonthlyState: (p: Participant, month: string) => ResolvedMonthlyState;
  handleSetMonthlyStatuses: (
    statuses: { participantId: number; status: ParticipantStatus }[],
    month?: string
  ) => Promise<boolean>;
  config: AppConfig;
  globalConfig: AppConfig;
  monthlyConfigs: MonthlyConfig[];
  dataLoading: boolean;
  loadAllData: () => Promise<void>;
  loadMonthlyConfig: () => Promise<void>;
  loadMonthlyConfigs: () => Promise<void>;
  activeParticipants: number;
  monthlyObjective: number;
  monthlyShare: number;
  getRequiredAmount: (p: Participant) => number;
  getRequiredAmountForMonth: (p: Participant, month: string) => number;
  getBaseObjectiveForMonth: (month: string) => number;
  effectiveParticipants: number;
  baseMonthlyObjective: number;
  monthIncludedExpenses: number;
  handleAddParticipant: (name: string, phone: string, notes: string, status?: string, joinDateIso?: string) => Promise<void>;
  handleRemoveParticipant: (id: number) => Promise<void>;
  handleUpdateParticipant: (id: number, name: string, phone: string, notes: string, status?: string | null, joinDateIso?: string) => Promise<void>;
  handleToggleParticipant: (id: number) => Promise<void>;
  handleAddPayment: (participantId: number, date: string, amount: number, method: string, note: string, appliedMonth?: string) => Promise<void>;
  handleDeletePayment: (id: number) => Promise<void>;
  handleUpdatePayment: (id: number, participantId: number, date: string, amount: number, method: string, note: string, appliedMonth?: string | null) => Promise<void>;
  handleAddExpense: (name: string, amount: number, date: string, category: string, includeInMonthlyShare?: boolean) => Promise<void>;
  handleUpdateExpense: (id: number, name: string, amount: number, date: string, category: string, includeInMonthlyShare?: boolean) => Promise<void>;
  handleDeleteExpense: (id: number) => Promise<void>;
  handleSaveConfig: (newConfig: AppConfig) => Promise<void>;
  handleResetConfig: () => Promise<void>;
  handleCloseMonth: (waivedParticipantIds?: number[], seasonClose?: SeasonClose) => Promise<boolean>;
  request: RequestFn;
  currentTeamId: number | null;
  currentMonth: string;
  setCurrentMonth: React.Dispatch<React.SetStateAction<string>>;
  addToast: AddToast;
}

const TeamDataContext = createContext<TeamDataContextValue | null>(null);

interface TeamDataProviderProps {
  children: ReactNode;
  request: RequestFn;
  currentTeamId: number | null;
  currentMonth: string;
  setCurrentMonth: React.Dispatch<React.SetStateAction<string>>;
  addToast: AddToast;
}

export function TeamDataProvider({
  children,
  request,
  currentTeamId,
  currentMonth,
  setCurrentMonth,
  addToast,
}: TeamDataProviderProps) {
  const teamData = useTeamData(request, currentTeamId, currentMonth, addToast);

  const value = useMemo<TeamDataContextValue>(
    () => ({
      ...teamData,
      request,
      currentTeamId,
      currentMonth,
      setCurrentMonth,
      addToast,
    }),
    [teamData, request, currentTeamId, currentMonth, setCurrentMonth, addToast]
  );

  return (
    <TeamDataContext.Provider value={value}>
      {children}
    </TeamDataContext.Provider>
  );
}

export function useTeamDataContext(): TeamDataContextValue {
  const ctx = useContext(TeamDataContext);
  if (ctx == null) {
    throw new Error('useTeamDataContext must be used within TeamDataProvider');
  }
  return ctx;
}
