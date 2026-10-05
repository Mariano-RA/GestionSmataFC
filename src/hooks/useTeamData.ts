'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { logger } from '@/lib/logger';
import { shouldChargeForMonth } from '@/lib/domain/joinDate';
import { getStatusWeight, resolveMonthlyState, type ResolvedMonthlyState } from '@/lib/domain/monthlyStatus';
import type { Participant, ParticipantMonthlyStatus, ParticipantStatus } from '@/types';
import type { RequestFn } from '@/services/types';
import type { SeasonClose } from '@/types';
import * as participantsService from '@/services/participants';
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
    participants: rawParticipants,
    handleUpdateParticipant: updateParticipantData,
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

  const closedMonths = useMemo(
    () => new Set(configHook.monthlyConfigs.map((cfg) => cfg.month)),
    [configHook.monthlyConfigs]
  );
  const isMonthClosed = useCallback((month: string) => closedMonths.has(month), [closedMonths]);

  const snapshotByKey = useMemo(
    () => new Map(participantMonthlyStatuses.map((s) => [`${s.participantId}:${s.month}`, s])),
    [participantMonthlyStatuses]
  );
  const rawParticipantById = useMemo(
    () => new Map(rawParticipants.map((p) => [p.id, p])),
    [rawParticipants]
  );

  /** Estado del jugador en el mes (estado elegido para el mes o el último arrastrado; condonación). */
  const getMonthlyState = useCallback(
    (p: Participant, month: string): ResolvedMonthlyState => {
      const base = rawParticipantById.get(p.id) ?? p;
      return resolveMonthlyState(base, snapshotByKey.get(`${p.id}:${month}`), closedMonths.has(month));
    },
    [rawParticipantById, snapshotByKey, closedMonths]
  );

  /** Jugadores con el estado del mes seleccionado (habilitado/deshabilitado sigue siendo global). */
  const participants = useMemo(
    () => rawParticipants.map((p) => ({ ...p, status: getMonthlyState(p, currentMonth).status })),
    [rawParticipants, getMonthlyState, currentMonth]
  );

  const paidByParticipantMonth = useMemo(() => {
    const map = new Map<string, number>();
    for (const pay of paymentsHook.payments) {
      const key = `${pay.participantId}:${pay.appliedMonth ?? pay.date.slice(0, 7)}`;
      map.set(key, (map.get(key) ?? 0) + pay.amount);
    }
    return map;
  }, [paymentsHook.payments]);

  const monthIncludedExpenses = expensesHook.expenses
    .filter((e) => e.date.startsWith(currentMonth) && Boolean(e.includeInMonthlyShare))
    .reduce((sum, e) => sum + e.amount, 0);
  const monthlyObjective = (config.monthlyTarget || 0) + (config.fieldRental || 0) + monthIncludedExpenses;
  const baseMonthlyObjective = (config.monthlyTarget || 0) + (config.fieldRental || 0);

  const effectiveParticipants =
    participants.filter(p => p.active).reduce(
      (sum, p) => sum + getStatusWeight(p.status),
      0
    ) || 1;
  const monthlyShare = monthlyObjective / effectiveParticipants;
  const activeParticipants = participants.filter(p => p.active).length || 1;
  const monthlyConfigsSorted = [...configHook.monthlyConfigs].sort((a, b) => a.month.localeCompare(b.month));

  const getObjectiveForMonth = useCallback(
    (month: string): number => {
      if (month === currentMonth) {
        return monthlyObjective;
      }
      const exact = monthlyConfigsSorted.find(cfg => cfg.month === month);
      if (exact) return (exact.monthlyTarget || 0) + (exact.rent || 0) + (exact.includedExpenses || 0);
      const previous = monthlyConfigsSorted.filter(cfg => cfg.month < month);
      if (previous.length > 0) {
        const last = previous[previous.length - 1];
        return (last.monthlyTarget || 0) + (last.rent || 0) + (last.includedExpenses || 0);
      }
      return monthlyObjective;
    },
    [monthlyConfigsSorted, monthlyObjective, currentMonth]
  );

  /** Objetivo base + alquiler del mes (sin gastos incluidos en cuota), mismo criterio que `computeMonthlySummary.baseObjective`. */
  const getBaseObjectiveForMonth = useCallback(
    (month: string): number => {
      const exact = monthlyConfigsSorted.find(cfg => cfg.month === month);
      if (exact) return (exact.monthlyTarget || 0) + (exact.rent || 0);
      const previous = monthlyConfigsSorted.filter(cfg => cfg.month < month);
      if (previous.length > 0) {
        const last = previous[previous.length - 1];
        return (last.monthlyTarget || 0) + (last.rent || 0);
      }
      return (config.monthlyTarget || 0) + (config.fieldRental || 0);
    },
    [monthlyConfigsSorted, config.monthlyTarget, config.fieldRental]
  );

  const getEffectiveParticipantsForMonth = useCallback(
    (month: string): number => {
      // Mes seleccionado en la app: siempre usar suma ponderada actual (activo 1, media/lesión 0.5, sin_laburo 0).
      // MonthlyConfig.effectiveParticipants puede quedar entero viejo (p. ej. solo “cantidad activos”) y romper el cociente.
      if (month === currentMonth) {
        return effectiveParticipants;
      }
      const exact = monthlyConfigsSorted.find(cfg => cfg.month === month);
      if (exact?.effectiveParticipants && exact.effectiveParticipants > 0) {
        return exact.effectiveParticipants;
      }
      return effectiveParticipants;
    },
    [monthlyConfigsSorted, effectiveParticipants, currentMonth]
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
      // joinDate manda sobre snapshots: meses previos al alta nunca generan cuota.
      if (p.joinDate && !shouldChargeForMonth(p.joinDate, month)) return 0;

      const { active, status, debtWaived } = getMonthlyState(p, month);
      if (!active) return 0;
      const objective = getObjectiveForMonth(month);
      const participantsForMonth = getEffectiveParticipantsForMonth(month);
      const share = participantsForMonth > 0 ? objective / participantsForMonth : 0;
      const required = share * getStatusWeight(status);
      // Deuda condonada al cerrar: lo exigido queda en lo pagado (no suma pagos ni genera deuda).
      if (debtWaived) return Math.min(required, paidByParticipantMonth.get(`${p.id}:${month}`) ?? 0);
      return required;
    },
    [getObjectiveForMonth, getEffectiveParticipantsForMonth, getMonthlyState, paidByParticipantMonth]
  );

  const handleSetMonthlyStatuses = useCallback(
    async (
      statuses: { participantId: number; status: ParticipantStatus }[],
      month: string = currentMonth
    ): Promise<boolean> => {
      if (!currentTeamId || statuses.length === 0) return false;
      if (closedMonths.has(month)) {
        addToast('El mes está cerrado: no se pueden cambiar los estados', 'error');
        return false;
      }
      const res = await participantsService.setMonthlyStatuses(request, month, statuses);
      if (res == null) {
        addToast('Error guardando los estados del mes', 'error');
        return false;
      }
      await Promise.all([loadParticipantMonthlyStatuses(), loadParticipants()]);
      return true;
    },
    [request, currentTeamId, currentMonth, closedMonths, loadParticipantMonthlyStatuses, loadParticipants, addToast]
  );

  /** Edición del jugador: el estado se guarda para el mes seleccionado, el resto de los datos es global. */
  const handleUpdateParticipant = useCallback(
    async (
      id: number,
      name: string,
      phone: string,
      notes: string,
      status?: string | null,
      joinDateIso?: string
    ) => {
      await updateParticipantData(id, name, phone, notes, undefined, joinDateIso);
      const p = rawParticipantById.get(id);
      if (!p || !status || status === getMonthlyState(p, currentMonth).status) return;
      const ok = await handleSetMonthlyStatuses([{ participantId: id, status: status as ParticipantStatus }]);
      if (ok) addToast(`Estado actualizado para ${currentMonth}`, 'success');
    },
    [updateParticipantData, rawParticipantById, getMonthlyState, currentMonth, handleSetMonthlyStatuses, addToast]
  );

  const handleCloseMonth = useCallback(async (
    waivedParticipantIds: number[] = [],
    seasonClose?: SeasonClose
  ): Promise<boolean> => {
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
          ...(waivedParticipantIds.length > 0 ? { waivedParticipantIds } : {}),
          ...(seasonClose ? { seasonClose } : {}),
        },
        disableAutoParams: true,
      });
      if (res == null) return false;
      await loadMonthlyConfig();
      await loadMonthlyConfigs();
      await loadParticipantMonthlyStatuses();
      if (seasonClose) await loadParticipants();
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
    loadParticipants,
    addToast,
  ]);

  return {
    participants,
    payments: paymentsHook.payments,
    expenses: expensesHook.expenses,
    participantMonthlyStatuses,
    isMonthClosed,
    getMonthlyState,
    handleSetMonthlyStatuses,
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
    getBaseObjectiveForMonth,
    effectiveParticipants,
    baseMonthlyObjective,
    monthIncludedExpenses,
    handleAddParticipant: participantsHook.handleAddParticipant,
    handleRemoveParticipant: participantsHook.handleRemoveParticipant,
    handleUpdateParticipant,
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
