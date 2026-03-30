'use client';

import { useState, useEffect, useCallback } from 'react';
import { logger } from '@/lib/logger';
import { DEFAULT_CONFIG } from '@/lib/utils';
import type { Participant, ParticipantMonthlyStatus, ParticipantStatus } from '@/types';
import type { RequestFn } from '@/services/types';
import { useParticipants } from '@/hooks/useParticipants';
import { usePayments } from '@/hooks/usePayments';
import { useExpenses } from '@/hooks/useExpenses';
import { useConfig } from '@/hooks/useConfig';

type AddToast = (message: string, type?: 'success' | 'error' | 'info') => void;

/**
 * Compositor que une useParticipants, usePayments, useExpenses y useConfig.
 * Mantiene la misma API que antes para no romper page.tsx.
 * Calcula valores derivados (monthlyShare, getRequiredAmount, etc.).
 */
export function useTeamData(
  request: RequestFn,
  currentTeamId: number | null,
  currentMonth: string,
  addToast: AddToast
) {
  const [dataLoading, setDataLoading] = useState(true);
  const [participantMonthlyStatuses, setParticipantMonthlyStatuses] = useState<ParticipantMonthlyStatus[]>([]);

  const participantsHook = useParticipants(request, currentTeamId, addToast);
  const paymentsHook = usePayments(request, currentTeamId, addToast);
  const expensesHook = useExpenses(request, currentTeamId, addToast);
  const configHook = useConfig(request, currentTeamId, currentMonth, addToast);

  const {
    participants,
    loadParticipants,
  } = participantsHook;
  const { loadPayments } = paymentsHook;
  const { loadExpenses } = expensesHook;
  const { loadConfig, loadMonthlyConfig, loadMonthlyConfigs } = configHook;
  const loadParticipantMonthlyStatuses = useCallback(async () => {
    if (!currentTeamId) return;
    const data = await request<ParticipantMonthlyStatus[]>('/api/participant-monthly-status?allMonths=true');
    setParticipantMonthlyStatuses(Array.isArray(data) ? data : []);
  }, [request, currentTeamId]);

  const loadAllData = useCallback(async () => {
    if (!currentTeamId) {
      setDataLoading(false);
      return;
    }
    setDataLoading(true);
    try {
      await Promise.all([
        loadParticipants(),
        loadPayments(),
        loadExpenses(),
        loadConfig(),
        loadParticipantMonthlyStatuses(),
      ]);
      await loadMonthlyConfig();
      await loadMonthlyConfigs();
    } catch (error) {
      logger.error('Error loading data:', error);
      addToast(
        'Error cargando datos: ' + (error instanceof Error ? error.message : 'Error desconocido'),
        'error'
      );
    } finally {
      setDataLoading(false);
    }
  }, [
    currentTeamId,
    loadParticipants,
    loadPayments,
    loadExpenses,
    loadConfig,
    loadParticipantMonthlyStatuses,
    loadMonthlyConfig,
    loadMonthlyConfigs,
    addToast,
  ]);

  useEffect(() => {
    if (!currentTeamId) {
      setDataLoading(false);
      return;
    }
    loadAllData();
  }, [currentTeamId]); // eslint-disable-line react-hooks/exhaustive-deps -- solo recargar al cambiar equipo

  const { config } = configHook;
  const monthIncludedExpenses = expensesHook.expenses
    .filter((e) => e.date.startsWith(currentMonth) && Boolean(e.includeInMonthlyShare))
    .reduce((sum, e) => sum + e.amount, 0);
  const monthlyObjective = (config.monthlyTarget || 0) + (config.fieldRental || 0) + monthIncludedExpenses;
  const baseMonthlyObjective = (config.monthlyTarget || 0) + (config.fieldRental || 0);

  const getStatusWeight = (status?: ParticipantStatus | null) => {
    if (status === 'sin_laburo') return 0;
    if (status === 'lesionado') return 0.5;
    if (status === 'media_cuota') return 0.5;
    return 1;
  };
  const effectiveParticipants =
    participants.filter(p => p.active).reduce(
      (sum, p) => sum + getStatusWeight(p.status as ParticipantStatus),
      0
    ) || 1;
  const monthlyShare = monthlyObjective / effectiveParticipants;
  const activeParticipants = participants.filter(p => p.active).length || 1;
  const monthlyConfigsSorted = [...configHook.monthlyConfigs].sort((a, b) => a.month.localeCompare(b.month));

  const getObjectiveForMonth = useCallback(
    (month: string): number => {
      const exact = monthlyConfigsSorted.find(cfg => cfg.month === month);
      if (exact) return (exact.monthlyTarget || 0) + (exact.rent || 0) + (exact.includedExpenses || 0);
      const previous = monthlyConfigsSorted.filter(cfg => cfg.month < month);
      if (previous.length > 0) {
        const last = previous[previous.length - 1];
        return (last.monthlyTarget || 0) + (last.rent || 0) + (last.includedExpenses || 0);
      }
      return monthlyObjective;
    },
    [monthlyConfigsSorted, monthlyObjective]
  );

  const getEffectiveParticipantsForMonth = useCallback(
    (month: string): number => {
      const exact = monthlyConfigsSorted.find(cfg => cfg.month === month);
      if (exact?.effectiveParticipants && exact.effectiveParticipants > 0) {
        return exact.effectiveParticipants;
      }
      return effectiveParticipants;
    },
    [monthlyConfigsSorted, effectiveParticipants]
  );

  const getRequiredAmount = useCallback(
    (p: Participant): number => {
      if (!p.active) return 0;
      if (p.status === 'sin_laburo') return 0;
      if (p.status === 'lesionado') return monthlyShare / 2;
      if (p.status === 'media_cuota') return monthlyShare / 2;
      return monthlyShare;
    },
    [monthlyShare]
  );

  const getRequiredAmountForMonth = useCallback(
    (p: Participant, month: string): number => {
      const monthSnapshot = participantMonthlyStatuses.find(
        (s) => s.participantId === p.id && s.month === month
      );
      const isActiveForMonth = monthSnapshot?.active ?? p.active;
      const statusForMonth = monthSnapshot?.status ?? p.status;
      if (!isActiveForMonth) return 0;
      if (statusForMonth === 'sin_laburo') return 0;
      const objective = getObjectiveForMonth(month);
      const participantsForMonth = getEffectiveParticipantsForMonth(month);
      const share = participantsForMonth > 0 ? objective / participantsForMonth : 0;
      if (statusForMonth === 'lesionado') return share / 2;
      if (statusForMonth === 'media_cuota') return share / 2;
      return share;
    },
    [getObjectiveForMonth, getEffectiveParticipantsForMonth, participantMonthlyStatuses]
  );

  const handleCloseMonth = useCallback(async (): Promise<boolean> => {
    if (!currentTeamId) return false;
    try {
      const res = await request(`/api/config?month=${currentMonth}&teamId=${currentTeamId}`, {
        method: 'POST',
        body: {
          monthlyTarget: config.monthlyTarget,
          rent: config.fieldRental,
          includedExpenses: monthIncludedExpenses,
          activeParticipants,
          effectiveParticipants,
          monthlyShare,
        },
        disableAutoParams: true,
      });
      if (res == null) return false;
      await loadMonthlyConfig();
      await loadMonthlyConfigs();
      await loadParticipantMonthlyStatuses();
      return true;
    } catch (error) {
      addToast(error instanceof Error ? error.message : 'Error al cerrar el mes', 'error');
      return false;
    }
  }, [
    request,
    currentTeamId,
    currentMonth,
    config.monthlyTarget,
    config.fieldRental,
    monthIncludedExpenses,
    activeParticipants,
    effectiveParticipants,
    monthlyShare,
    loadMonthlyConfig,
    loadMonthlyConfigs,
    loadParticipantMonthlyStatuses,
    addToast,
  ]);

  return {
    participants,
    payments: paymentsHook.payments,
    expenses: expensesHook.expenses,
    config: configHook.config,
    globalConfig: configHook.globalConfig,
    monthlyConfigs: configHook.monthlyConfigs,
    dataLoading,
    loadAllData,
    loadMonthlyConfig: configHook.loadMonthlyConfig,
    loadMonthlyConfigs: configHook.loadMonthlyConfigs,
    activeParticipants,
    monthlyObjective,
    monthlyShare,
    getRequiredAmount,
    getRequiredAmountForMonth,
    effectiveParticipants,
    baseMonthlyObjective,
    monthIncludedExpenses,
    handleAddParticipant: participantsHook.handleAddParticipant,
    handleRemoveParticipant: participantsHook.handleRemoveParticipant,
    handleUpdateParticipant: participantsHook.handleUpdateParticipant,
    handleToggleParticipant: participantsHook.handleToggleParticipant,
    handleAddPayment: paymentsHook.handleAddPayment,
    handleDeletePayment: paymentsHook.handleDeletePayment,
    handleUpdatePayment: paymentsHook.handleUpdatePayment,
    handleAddExpense: expensesHook.handleAddExpense,
    handleUpdateExpense: expensesHook.handleUpdateExpense,
    handleDeleteExpense: expensesHook.handleDeleteExpense,
    handleSaveConfig: configHook.handleSaveConfig,
    handleResetConfig: configHook.handleResetConfig,
    handleCloseMonth,
  };
}
