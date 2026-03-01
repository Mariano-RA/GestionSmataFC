'use client';

import { useState, useEffect } from 'react';
import { addMonths, getMonthName } from '@/lib/utils';
import type { AppConfig } from '@/types';

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
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  const [monthly, setMonthly] = useState((config?.monthlyTarget || 0).toString());
  const [rental, setRental] = useState((config?.fieldRental || 0).toString());
  const [maxPart, setMaxPart] = useState((config?.maxParticipants || 25).toString());
  const [notes, setNotes] = useState(config?.notes || '');

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
      const res = await fetch(`/api/config?month=${month}`);
      if (res.ok) {
        const monthlyConfig = await res.json();
        const fieldRentalValue = monthlyConfig.rent !== undefined ? monthlyConfig.rent : monthlyConfig.fieldRental;
        setMonthly((monthlyConfig.monthlyTarget || 0).toString());
        setRental((fieldRentalValue || 0).toString());
        setMaxPart((monthlyConfig.maxParticipants || 25).toString());
        setNotes(monthlyConfig.notes || '');
      }
    } catch (error) {
      console.log('Error loading month config:', error);
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
  }, [currentMonth, config]);

  const handleSave = async () => {
    const newConfig = {
      monthlyTarget: Number(monthly),
      fieldRental: Number(rental),
      maxParticipants: Number(maxPart),
      notes
    };

    try {
      // Guardar configuración global
      await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newConfig)
      });

      // Guardar configuración mensual para el mes seleccionado
      await fetch(`/api/config?month=${selectedMonth}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          monthlyTarget: Number(monthly),
          rent: Number(rental)
        })
      });

      onSave(newConfig);
      addToast(`Configuración guardada para ${getMonthName(selectedMonth)}`, 'success');
    } catch (error) {
      console.error('Error saving config:', error);
      addToast('Error al guardar configuración', 'error');
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

      <button className="btn btn-success" onClick={handleSave}>
        Guardar Config
      </button>
      <button className="btn btn-secondary" onClick={onReset} style={{ marginTop: '10px' }}>
        Restaurar
      </button>

      <hr style={{ margin: '20px 0', borderColor: 'var(--border)' }} />

      <h3 style={{ color: 'var(--primary)', marginBottom: '15px' }}>💾 Copias de Seguridad</h3>
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
