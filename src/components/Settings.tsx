'use client';

import { useState, useEffect } from 'react';
import type { AppConfig } from '@/types';

interface SettingsProps {
  config: AppConfig;
  onSave: (config: AppConfig) => void;
  onReset: () => void;
  onExport: () => void;
  onImport: (file: File) => void;
}

export default function Settings({
  config,
  onSave,
  onReset,
  onExport,
  onImport
}: SettingsProps) {
  const [monthly, setMonthly] = useState(config.monthlyTarget.toString());
  const [rental, setRental] = useState(config.fieldRental.toString());
  const [maxPart, setMaxPart] = useState(config.maxParticipants.toString());
  const [notes, setNotes] = useState(config.notes);
  const today = new Date().toISOString().split('T')[0];
  const maxMonth = today.slice(0, 7);

  const handleSave = () => {
    onSave({
      monthlyTarget: Number(monthly),
      fieldRental: Number(rental),
      maxParticipants: Number(maxPart),
      notes
    });
    alert('Configuración guardada');
  };

  return (
    <div className="tab-content">
      <div className="form-group">
        <label>💰 Monto Mensual a Recaudar</label>
        <input
          type="number"
          value={monthly}
          onChange={(e) => setMonthly(e.target.value)}
          min="0"
          step="10000"
        />
      </div>

      <div className="form-group">
        <label>🏟️ Alquiler Canchas</label>
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

      <button className="btn btn-primary" onClick={handleSave}>
        Guardar Config
      </button>
      <button className="btn btn-secondary" onClick={onReset} style={{ marginTop: '10px' }}>
        Restaurar
      </button>

      <hr style={{ margin: '20px 0' }} />

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
