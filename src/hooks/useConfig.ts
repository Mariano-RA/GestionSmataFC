'use client';

import { useState, useEffect, useCallback } from 'react';
import { DEFAULT_CONFIG } from '@/lib/utils';
import type { AppConfig, MonthlyConfig } from '@/types';
import type { RequestFn } from '@/services/types';
import * as configService from '@/services/config';

type AddToast = (message: string, type?: 'success' | 'error' | 'info') => void;

export function useConfig(
  request: RequestFn,
  currentTeamId: number | null,
  currentMonth: string,
  addToast: AddToast
) {
  const [config, setConfig] = useState<AppConfig>(DEFAULT_CONFIG);
  const [globalConfig, setGlobalConfig] = useState<AppConfig>(DEFAULT_CONFIG);
  const [monthlyConfigs, setMonthlyConfigs] = useState<MonthlyConfig[]>([]);

  const loadConfig = useCallback(async () => {
    if (!currentTeamId) return;
    const cfg = await configService.getConfig(request);
    if (cfg != null && typeof cfg === 'object') {
      setConfig(cfg);
      setGlobalConfig(cfg);
    }
  }, [request, currentTeamId]);

  const loadMonthlyConfig = useCallback(async () => {
    if (!currentTeamId) return;
    try {
      const monthlyConfig = await configService.getConfigForMonth(request, currentMonth);
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
      const data = await configService.getAllMonthlyConfigs(request);
      setMonthlyConfigs(data);
    } catch {
      // fallback silencioso
    }
  }, [request, currentTeamId]);

  useEffect(() => {
    if (currentTeamId) {
      loadMonthlyConfig();
      loadMonthlyConfigs();
    }
  }, [currentMonth, currentTeamId, globalConfig, loadMonthlyConfig, loadMonthlyConfigs]);

  const handleSaveConfig = useCallback(
    async (newConfig: AppConfig) => {
      if (!currentTeamId) return;
      try {
        const res = await configService.saveConfig(request, currentTeamId, newConfig);
        if (res !== null) {
          addToast('Configuración guardada', 'success');
          await loadConfig();
          await loadMonthlyConfig();
          await loadMonthlyConfigs();
        }
      } catch (error) {
        addToast(error instanceof Error ? error.message : 'Error guardando configuración', 'error');
      }
    },
    [request, currentTeamId, loadConfig, loadMonthlyConfig, loadMonthlyConfigs, addToast]
  );

  const handleResetConfig = useCallback(async () => {
    if (!confirm('¿Restaurar configuración por defecto?')) return;
    await handleSaveConfig(DEFAULT_CONFIG);
  }, [handleSaveConfig]);

  return {
    config,
    globalConfig,
    monthlyConfigs,
    loadConfig,
    loadMonthlyConfig,
    loadMonthlyConfigs,
    handleSaveConfig,
    handleResetConfig,
  };
}
