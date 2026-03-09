'use client';

import { useState, useEffect } from 'react';
import { addMonths, getMonthName } from '@/lib/utils';
import type { AppConfig } from '@/types';
import { DEFAULT_EXPENSE_CATEGORIES } from '@/types';
import { useUser } from '@/context/UserContext';
import { logger } from '@/lib/logger';

interface SettingsProps {
  config: AppConfig;
  currentMonth: string;
  onSave: (config: AppConfig) => void;
  onReset: () => void;
  onExport: () => void;
  onImport: (file: File) => void;
  addToast: (message: string, type: 'success' | 'error' | 'info') => void;
}

export default function Settings({
  config,
  currentMonth,
  onSave,
  onReset,
  onExport,
  onImport,
  addToast
}: SettingsProps) {
  const { currentTeamId } = useUser();
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  const [monthly, setMonthly] = useState((config?.monthlyTarget || 0).toString());
  const [rental, setRental] = useState((config?.fieldRental || 0).toString());
  const [maxPart, setMaxPart] = useState((config?.maxParticipants || 25).toString());
  const [notes, setNotes] = useState(config?.notes || '');
  const [expenseCategories, setExpenseCategories] = useState<string[]>(
    config?.expenseCategories?.length ? config.expenseCategories : [...DEFAULT_EXPENSE_CATEGORIES]
  );
  const [newCategoryInput, setNewCategoryInput] = useState('');

  const getAuthHeaders = () => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
    return {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  };

  // Generar lista de últimos 12 meses + próximos 3 meses
  const generateMonths = () => {
    const months = [];
    for (let i = -12; i <= 3; i++) {
      months.push(addMonths(currentMonth, i));
    }
    return months.sort();
  };

  const availableMonths = generateMonths();

  // Cargar configuración del mes seleccionado
  const loadMonthConfig = async (month: string) => {
    try {
      if (!currentTeamId) {
        return;
      }

      const res = await fetch(`/api/config?month=${month}&teamId=${currentTeamId}`, {
        method: 'GET',
        headers: getAuthHeaders(),
        credentials: 'include',
      });

      if (res.ok) {
        const raw = await res.json();
        const monthlyConfig = raw?.data ?? raw;

        const fieldRentalValue = monthlyConfig.rent !== undefined ? monthlyConfig.rent : monthlyConfig.fieldRental;
        setMonthly((Number(monthlyConfig.monthlyTarget) || 0).toString());
        setRental((fieldRentalValue || 0).toString());
        setMaxPart((Number(monthlyConfig.maxParticipants) || 25).toString());
        setNotes(monthlyConfig.notes || '');
      }
    } catch (error) {
      logger.error('Error loading month config:', error);
    }
  };

  // Cuando cambia el mes seleccionado
  const handleMonthChange = (month: string) => {
    setSelectedMonth(month);
    loadMonthConfig(month);
  };

  // Actualizar cuando cambia el config global (cambio de mes en la app)
  useEffect(() => {
    setSelectedMonth(currentMonth);
    setMonthly((config?.monthlyTarget || 0).toString());
    setRental((config?.fieldRental || 0).toString());
    setMaxPart((config?.maxParticipants || 25).toString());
    setNotes(config?.notes || '');
    setExpenseCategories(
      config?.expenseCategories?.length ? config.expenseCategories : [...DEFAULT_EXPENSE_CATEGORIES]
    );
  }, [currentMonth, config]);

  const handleSave = async () => {
    if (!currentTeamId) {
      addToast('Seleccioná un equipo antes de guardar configuración', 'error');
      return;
    }

    const newConfig = {
      monthlyTarget: Number(monthly),
      fieldRental: Number(rental),
      maxParticipants: Number(maxPart),
      notes,
      expenseCategories
    };

    if (
      Number.isNaN(newConfig.monthlyTarget) ||
      Number.isNaN(newConfig.fieldRental) ||
      Number.isNaN(newConfig.maxParticipants)
    ) {
      addToast('Completá valores numéricos válidos antes de guardar', 'error');
      return;
    }

    try {
      // Guardar configuración global (API espera keys planas; EXPENSE_CATEGORIES es la key en BD)
      const globalPayload = {
        monthlyTarget: newConfig.monthlyTarget,
        fieldRental: newConfig.fieldRental,
        maxParticipants: newConfig.maxParticipants,
        notes: newConfig.notes,
        EXPENSE_CATEGORIES: newConfig.expenseCategories
      };
      const globalRes = await fetch(`/api/config?teamId=${currentTeamId}`, {
        method: 'POST',
        headers: getAuthHeaders(),
        credentials: 'include',
        body: JSON.stringify(globalPayload)
      });

      if (!globalRes.ok) {
        const err = await globalRes.json().catch(() => ({}));
        throw new Error(err?.error || 'No se pudo guardar la configuración global');
      }

      // Guardar configuración mensual para el mes seleccionado
      const monthRes = await fetch(`/api/config?month=${selectedMonth}&teamId=${currentTeamId}`, {
        method: 'POST',
        headers: getAuthHeaders(),
        credentials: 'include',
        body: JSON.stringify({
          monthlyTarget: Number(monthly),
          rent: Number(rental)
        })
      });

      if (!monthRes.ok) {
        const err = await monthRes.json().catch(() => ({}));
        throw new Error(err?.error || 'No se pudo guardar la configuración mensual');
      }

      onSave({ ...newConfig, expenseCategories });
      addToast(`Configuración guardada para ${getMonthName(selectedMonth)}`, 'success');
    } catch (error) {
      logger.error('Error saving config:', error);
      addToast(error instanceof Error ? error.message : 'Error al guardar configuración', 'error');
    }
  };

  return (
    <div className="tab-content">
      <div className="form-group">
        <label>� Editar Configuración del Mes</label>
        <select
          value={selectedMonth}
          onChange={(e) => handleMonthChange(e.target.value)}
          style={{ padding: '8px 12px', borderRadius: '4px', border: '1px solid var(--border)', backgroundColor: 'var(--bg-primary)', color: 'var(--text)', marginBottom: '20px' }}
        >
          {availableMonths.map(month => (
            <option key={month} value={month}>
              {getMonthName(month)}
            </option>
          ))}
        </select>
      </div>

      <div className="form-group">
        <label>�💰 Objetivo Base Mensual</label>
        <input
          type="number"
          value={monthly}
          onChange={(e) => setMonthly(e.target.value)}
          min="0"
          step="10000"
        />
      </div>

      <div className="form-group">
        <label>🏟️ Alquiler Canchas (se suma al objetivo)</label>
        <input
          type="number"
          value={rental}
          onChange={(e) => setRental(e.target.value)}
          min="0"
          step="10000"
        />
      </div>

      <div className="form-group">
        <label>⚽ Máximo Participantes</label>
        <input
          type="number"
          value={maxPart}
          onChange={(e) => setMaxPart(e.target.value)}
          min="1"
          max="100"
        />
      </div>

      <div className="form-group">
        <label>📝 Notas</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
        />
      </div>

      <div className="form-group" style={{ marginTop: '20px' }}>
        <label>🏷️ Categorías de gastos</label>
        <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '8px' }}>
          Agregá o quitá categorías para usar en Gastos. Al guardar se actualizan en toda la app.
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '8px' }}>
          {expenseCategories.map(cat => (
            <span
              key={cat}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                padding: '4px 10px',
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border)',
                borderRadius: '6px',
                fontSize: '13px'
              }}
            >
              {cat}
              <button
                type="button"
                className="btn btn-sm"
                style={{ padding: '0 4px', minWidth: 'auto', fontSize: '14px', lineHeight: 1 }}
                onClick={() => setExpenseCategories(prev => prev.filter(c => c !== cat))}
                aria-label={`Quitar ${cat}`}
              >
                ×
              </button>
            </span>
          ))}
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', width: '100%' }}>
          <input
            type="text"
            value={newCategoryInput}
            onChange={(e) => setNewCategoryInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                const v = newCategoryInput.trim();
                if (v && !expenseCategories.includes(v)) {
                  setExpenseCategories(prev => [...prev, v]);
                  setNewCategoryInput('');
                }
              }
            }}
            placeholder="Nueva categoría (ej: Comida)"
            style={{
              flex: 1,
              minWidth: '180px',
              padding: '8px 12px',
              borderRadius: '6px',
              border: '1px solid var(--border)',
              background: 'var(--bg-primary)',
              color: 'var(--text)',
              fontSize: '16px',
              boxSizing: 'border-box',
            }}
          />
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => {
              const v = newCategoryInput.trim();
              if (v && !expenseCategories.includes(v)) {
                setExpenseCategories(prev => [...prev, v]);
                setNewCategoryInput('');
              }
            }}
          >
            Agregar
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
        <button type="button" className="btn btn-secondary" onClick={onReset} style={{ flex: 1 }}>
          🔄 Restaurar
        </button>
        <button type="button" className="btn btn-success" onClick={handleSave} style={{ flex: 1 }}>
          💾 Guardar Configuración
        </button>
      </div>

      <hr style={{ margin: '20px 0', borderColor: 'var(--border)' }} />

      <h3 style={{ color: 'var(--heading)', marginBottom: '15px' }}>💾 Copias de Seguridad</h3>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
        <button className="btn btn-secondary" onClick={onExport}>
          📥 Descargar BD
        </button>
        <label className="btn btn-secondary" style={{ margin: 0, cursor: 'pointer' }}>
          📤 Importar BD
          <input
            type="file"
            accept=".json"
            onChange={(e) => {
              if (e.target.files?.[0]) {
                onImport(e.target.files[0]);
              }
            }}
            style={{ display: 'none' }}
          />
        </label>
      </div>
    </div>
  );
}
