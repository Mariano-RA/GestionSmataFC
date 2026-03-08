'use client';

import { useState, useEffect, useCallback } from 'react';
import { logger } from '@/lib/logger';
import { getCurrentMonth, addMonths, DEFAULT_CONFIG } from '@/lib/utils';
import type { Participant, Payment, Expense, AppConfig, MonthlyConfig } from '@/types';

type RequestFn = <T>(
  endpoint: string,
  options?: { method?: 'GET' | 'POST' | 'PATCH' | 'DELETE'; body?: Record<string, unknown> }
) => Promise<T | null>;

type AddToast = (message: string, type?: 'success' | 'error' | 'info') => void;

export function useTeamData(
  request: RequestFn,
  currentTeamId: number | null,
  currentMonth: string,
  addToast: AddToast
) {
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [config, setConfig] = useState<AppConfig>(DEFAULT_CONFIG);
  const [globalConfig, setGlobalConfig] = useState<AppConfig>(DEFAULT_CONFIG);
  const [monthlyConfigs, setMonthlyConfigs] = useState<MonthlyConfig[]>([]);
  const [dataLoading, setDataLoading] = useState(true);

  const loadAllData = useCallback(async () => {
    if (!currentTeamId) {
      setDataLoading(false);
      return;
    }
    try {
      const [parts, pays, exps, cfg] = await Promise.all([
        request<Participant[]>('/api/participants'),
        request<Payment[]>('/api/payments'),
        request<Expense[]>('/api/expenses'),
        request<AppConfig>('/api/config'),
      ]);
      if (parts === null || pays === null || exps === null || cfg === null) {
        setDataLoading(false);
        return;
      }
      setParticipants(Array.isArray(parts) ? parts : []);
      setPayments(Array.isArray(pays) ? pays : []);
      setExpenses(Array.isArray(exps) ? exps : []);
      const configObj = cfg && typeof cfg === 'object' ? (cfg as AppConfig) : DEFAULT_CONFIG;
      setConfig(configObj);
      setGlobalConfig(configObj);
    } catch (error) {
      logger.error('Error loading data:', error);
      addToast('Error cargando datos: ' + (error instanceof Error ? error.message : 'Error desconocido'), 'error');
    } finally {
      setDataLoading(false);
    }
  }, [request, currentTeamId, addToast]);

  const loadMonthlyConfig = useCallback(async () => {
    if (!currentTeamId) return;
    try {
      const monthlyConfig = await request<{ monthlyTarget?: number; fieldRental?: number }>(
        `/api/config?month=${currentMonth}`
      );
      if (monthlyConfig == null) return;
      setConfig(prev => ({
        ...globalConfig,
        monthlyTarget: monthlyConfig.monthlyTarget ?? globalConfig.monthlyTarget,
        fieldRental: monthlyConfig.fieldRental ?? globalConfig.fieldRental,
      }));
    } catch {
      setConfig(globalConfig);
    }
  }, [request, currentTeamId, currentMonth, globalConfig]);

  const loadMonthlyConfigs = useCallback(async () => {
    if (!currentTeamId) return;
    try {
      const data = await request<MonthlyConfig[]>('/api/config?allMonths=true');
      setMonthlyConfigs(Array.isArray(data) ? data : []);
    } catch {
      // fallback silencioso
    }
  }, [request, currentTeamId]);

  useEffect(() => {
    if (currentTeamId) {
      loadAllData();
    }
  }, [currentTeamId]);

  useEffect(() => {
    if (currentTeamId) {
      loadMonthlyConfig();
      loadMonthlyConfigs();
    }
  }, [currentMonth, currentTeamId, globalConfig]);

  const monthlyObjective = (config.monthlyTarget || 0) + (config.fieldRental || 0);
  const effectiveParticipants = participants
    .filter(p => p.active)
    .reduce((sum, p) => sum + (p.status === 'sin_laburo' ? 0 : p.status === 'lesionado' ? 0.5 : 1), 0) || 1;
  const monthlyShare = monthlyObjective / effectiveParticipants;
  const activeParticipants = participants.filter(p => p.active).length || 1;

  const getRequiredAmount = useCallback(
    (p: Participant): number => {
      if (!p.active) return 0;
      if (p.status === 'sin_laburo') return 0;
      if (p.status === 'lesionado') return monthlyShare / 2;
      return monthlyShare;
    },
    [monthlyShare]
  );

  const handleAddParticipant = useCallback(
    async (name: string, phone: string, notes: string, status?: string) => {
      try {
        const res = await request<Participant>('/api/participants', {
          method: 'POST',
          body: { name, phone, notes, status: status || 'activo' },
        });
        if (res != null) {
          addToast('Participante agregado', 'success');
          await loadAllData();
        }
      } catch (error) {
        const msg = error instanceof Error ? error.message : 'Error agregando participante';
        addToast(msg, 'error');
        throw error;
      }
    },
    [request, loadAllData, addToast]
  );

  const handleRemoveParticipant = useCallback(
    async (id: number) => {
      if (!confirm('¿Eliminar?')) return;
      try {
        const res = await request<unknown>(`/api/participants/${id}`, { method: 'DELETE' });
        if (res !== null) {
          addToast('Participante eliminado', 'success');
          await loadAllData();
        }
      } catch (error) {
        addToast(error instanceof Error ? error.message : 'Error eliminando participante', 'error');
      }
    },
    [request, loadAllData, addToast]
  );

  const handleUpdateParticipant = useCallback(
    async (id: number, name: string, phone: string, notes: string, status?: string | null) => {
      try {
        const res = await request<Participant>(`/api/participants/${id}`, {
          method: 'PATCH',
          body: { name, phone, notes, status: status ?? undefined },
        });
        if (res != null) {
          addToast('Participante actualizado', 'success');
          await loadAllData();
        }
      } catch (error) {
        addToast(error instanceof Error ? error.message : 'Error actualizando participante', 'error');
      }
    },
    [request, loadAllData, addToast]
  );

  const handleToggleParticipant = useCallback(
    async (id: number) => {
      const p = participants.find(x => x.id === id);
      if (!p) return;
      try {
        const res = await request<Participant>(`/api/participants/${id}`, {
          method: 'PATCH',
          body: { active: !p.active },
        });
        if (res != null) await loadAllData();
      } catch (error) {
        addToast(error instanceof Error ? error.message : 'Error actualizando participante', 'error');
      }
    },
    [request, participants, loadAllData, addToast]
  );

  const handleAddPayment = useCallback(
    async (participantId: number, date: string, amount: number, method: string, note: string) => {
      try {
        const res = await request<Payment>('/api/payments', {
          method: 'POST',
          body: { participantId, date, amount, method, note },
        });
        if (res != null) {
          addToast('Pago registrado', 'success');
          await loadAllData();
        }
      } catch (error) {
        const msg = error instanceof Error ? error.message : 'Error registrando pago';
        addToast(msg, 'error');
        throw error;
      }
    },
    [request, loadAllData, addToast]
  );

  const handleDeletePayment = useCallback(
    async (id: number) => {
      if (!confirm('¿Eliminar?')) return;
      try {
        const res = await request<unknown>(`/api/payments/${id}`, { method: 'DELETE' });
        if (res !== null) {
          addToast('Pago eliminado', 'success');
          await loadAllData();
        }
      } catch (error) {
        addToast(error instanceof Error ? error.message : 'Error eliminando pago', 'error');
      }
    },
    [request, loadAllData, addToast]
  );

  const handleUpdatePayment = useCallback(
    async (id: number, participantId: number, date: string, amount: number, method: string, note: string) => {
      try {
        const res = await request<Payment>(`/api/payments/${id}`, {
          method: 'PATCH',
          body: { participantId, date, amount, method, note },
        });
        if (res != null) {
          addToast('Pago actualizado', 'success');
          await loadAllData();
        }
      } catch (error) {
        addToast(error instanceof Error ? error.message : 'Error actualizando pago', 'error');
      }
    },
    [request, loadAllData, addToast]
  );

  const handleAddExpense = useCallback(
    async (name: string, amount: number, date: string, category: string) => {
      try {
        const res = await request<Expense>('/api/expenses', {
          method: 'POST',
          body: { name, amount, date, category },
        });
        if (res != null) {
          addToast('Gasto registrado', 'success');
          await loadAllData();
        }
      } catch (error) {
        const msg = error instanceof Error ? error.message : 'Error registrando gasto';
        addToast(msg, 'error');
        throw error;
      }
    },
    [request, loadAllData, addToast]
  );

  const handleUpdateExpense = useCallback(
    async (id: number, name: string, amount: number, date: string, category: string) => {
      try {
        const res = await request<Expense>(`/api/expenses/${id}`, {
          method: 'PATCH',
          body: { name, amount, date, category },
        });
        if (res != null) {
          addToast('Gasto actualizado', 'success');
          await loadAllData();
        }
      } catch (error) {
        addToast(error instanceof Error ? error.message : 'Error actualizando gasto', 'error');
      }
    },
    [request, loadAllData, addToast]
  );

  const handleDeleteExpense = useCallback(
    async (id: number) => {
      if (!confirm('¿Eliminar?')) return;
      try {
        const res = await request<unknown>(`/api/expenses/${id}`, { method: 'DELETE' });
        if (res !== null) {
          addToast('Gasto eliminado', 'success');
          await loadAllData();
        }
      } catch (error) {
        addToast(error instanceof Error ? error.message : 'Error eliminando gasto', 'error');
      }
    },
    [request, loadAllData, addToast]
  );

  const handleSaveConfig = useCallback(
    async (newConfig: AppConfig) => {
      if (!currentTeamId) return;
      try {
        const url = `/api/config?teamId=${currentTeamId}`;
        const res = await request<unknown>(url, {
          method: 'POST',
          body: newConfig as unknown as Record<string, unknown>,
        });
        if (res !== null) {
          addToast('Configuración guardada', 'success');
          await loadAllData();
        }
      } catch (error) {
        addToast(error instanceof Error ? error.message : 'Error guardando configuración', 'error');
      }
    },
    [request, currentTeamId, loadAllData, addToast]
  );

  const handleResetConfig = useCallback(async () => {
    if (!confirm('¿Restaurar configuración por defecto?')) return;
    await handleSaveConfig(DEFAULT_CONFIG);
  }, [handleSaveConfig]);

  return {
    participants,
    payments,
    expenses,
    config,
    globalConfig,
    monthlyConfigs,
    dataLoading,
    loadAllData,
    loadMonthlyConfig,
    loadMonthlyConfigs,
    activeParticipants,
    monthlyObjective,
    monthlyShare,
    getRequiredAmount,
    effectiveParticipants,
    handleAddParticipant,
    handleRemoveParticipant,
    handleUpdateParticipant,
    handleToggleParticipant,
    handleAddPayment,
    handleDeletePayment,
    handleUpdatePayment,
    handleAddExpense,
    handleUpdateExpense,
    handleDeleteExpense,
    handleSaveConfig,
    handleResetConfig,
  };
}
