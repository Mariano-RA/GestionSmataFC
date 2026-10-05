'use client';

import { useState } from 'react';
import { getMonthName, normalizeName } from '@/lib/utils';
import type { ParticipantStatus } from '@/types';

const STATUS_LABELS: Record<ParticipantStatus, string> = {
  activo: 'Activo',
  sin_laburo: 'Sin trabajo',
  lesionado: 'Lesionado',
  media_cuota: 'Media cuota',
};

interface ReviewParticipant {
  id: number;
  name: string;
  status?: ParticipantStatus | null;
}

interface MonthStatusReviewModalProps {
  month: string;
  participants: ReviewParticipant[];
  saving: boolean;
  onConfirm: (statuses: { participantId: number; status: ParticipantStatus }[]) => void;
  onClose: () => void;
}

/**
 * Revisión al comenzar el mes: jugadores habilitados que no están activos (sin trabajo, lesionado,
 * media cuota). Se confirma o cambia su estado para el mes.
 */
export default function MonthStatusReviewModal({
  month,
  participants,
  saving,
  onConfirm,
  onClose,
}: MonthStatusReviewModalProps) {
  const [drafts, setDrafts] = useState<Record<number, ParticipantStatus>>(() =>
    Object.fromEntries(participants.map((p) => [p.id, p.status ?? 'activo']))
  );

  const handleConfirm = () => {
    onConfirm(participants.map((p) => ({ participantId: p.id, status: drafts[p.id] })));
  };

  return (
    <div className="modal active" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <button className="close-btn" onClick={onClose}>&times;</button>
        <h2>Estados de {getMonthName(month)}</h2>
        <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
          Estos jugadores no estaban activos. Confirmá o cambiá su estado para este mes.
        </p>
        {participants.map((p) => (
          <div
            key={p.id}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', marginBottom: '10px' }}
          >
            <span style={{ fontWeight: 600 }}>{normalizeName(p.name)}</span>
            <select
              value={drafts[p.id]}
              onChange={(e) => setDrafts((prev) => ({ ...prev, [p.id]: e.target.value as ParticipantStatus }))}
              style={{ width: 'auto', minWidth: '140px', background: 'var(--bg-primary)', color: 'var(--text)' }}
              disabled={saving}
            >
              {(Object.keys(STATUS_LABELS) as ParticipantStatus[]).map((s) => (
                <option key={s} value={s}>{STATUS_LABELS[s]}</option>
              ))}
            </select>
          </div>
        ))}
        <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
          <button type="button" className="btn btn-secondary" onClick={onClose} disabled={saving}>
            Más tarde
          </button>
          <button type="button" className="btn btn-success" onClick={handleConfirm} disabled={saving}>
            {saving ? 'Guardando...' : '✅ Confirmar estados'}
          </button>
        </div>
      </div>
    </div>
  );
}
