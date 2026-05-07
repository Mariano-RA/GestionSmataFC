'use client';

import { normalizeName, parseYMDToLocalDate, formatCurrency } from '@/lib/utils';
import type { Payment, ParticipantStatus } from '@/types';

interface MonthlyHistoryItem {
  month: string;
  paid: number;
  required: number;
  debtMonth: number;
  debtAccumulated: number;
}

interface MonthlyDetails {
  active: boolean;
  status: ParticipantStatus | null;
  objective: number;
  effectiveParticipants: number;
  share: number;
}

interface HistoryModalProps {
  isOpen: boolean;
  participantName: string;
  payments: Payment[];
  monthlyHistory: MonthlyHistoryItem[];
  monthlyDetailsByMonth: Record<string, MonthlyDetails>;
  onClose: () => void;
  onDeletePayment: (paymentId: number) => void;
}

export default function HistoryModal({
  isOpen,
  participantName,
  payments,
  monthlyHistory,
  monthlyDetailsByMonth,
  onClose,
  onDeletePayment
}: HistoryModalProps) {
  if (!isOpen) return null;

  const getPayMonth = (p: Payment) => p.appliedMonth ?? p.date.slice(0, 7);

  return (
    <div className={`modal ${isOpen ? 'active' : ''}`} onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <button className="close-btn" onClick={onClose}>×</button>
        <h3>{normalizeName(participantName)}</h3>

        <div style={{ margin: '12px 0 16px', background: 'var(--bg-secondary)', borderRadius: '8px', padding: '10px', border: '1px solid var(--border)' }}>
          <p style={{ fontWeight: 600, marginBottom: '8px', color: 'var(--text)' }}>📊 Histórico de deuda por mes</p>
          {monthlyHistory.length === 0 ? (
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Sin meses para mostrar</p>
          ) : (
            <div style={{ maxHeight: '240px', overflowY: 'auto', fontSize: '12px' }}>
              {monthlyHistory.map(item => (
                <div key={item.month} style={{ padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 1fr 1fr 1fr 1fr', gap: '6px' }}>
                    <span style={{ color: 'var(--text)', fontWeight: 600 }}>{item.month}</span>
                    <span style={{ color: 'var(--text-secondary)' }}>P: {formatCurrency(item.paid)}</span>
                    <span style={{ color: 'var(--text-secondary)' }}>R: {formatCurrency(item.required)}</span>
                    <span style={{ color: item.debtMonth > 0 ? 'var(--danger)' : 'var(--success)', fontWeight: 600 }}>
                      Mes: {formatCurrency(item.debtMonth)}
                    </span>
                    <span style={{ color: item.debtAccumulated > 0 ? 'var(--danger)' : 'var(--success)', fontWeight: 600 }}>
                      Acum: {formatCurrency(item.debtAccumulated)}
                    </span>
                  </div>
                  {(() => {
                    const d = monthlyDetailsByMonth[item.month];
                    if (!d) return null;
                    return (
                      <div style={{ marginTop: '6px', color: 'var(--text-secondary)' }}>
                        <span>Estado: <strong style={{ color: 'var(--text)' }}>{d.active ? (d.status ?? 'activo') : 'inactivo'}</strong></span>
                        <span style={{ margin: '0 8px' }}>•</span>
                        <span>Objetivo: <strong style={{ color: 'var(--text)' }}>{formatCurrency(d.objective)}</strong></span>
                        <span style={{ margin: '0 8px' }}>•</span>
                        <span>Efec.: <strong style={{ color: 'var(--text)' }}>{d.effectiveParticipants.toLocaleString('es-AR')}</strong></span>
                        <span style={{ margin: '0 8px' }}>•</span>
                        <span>Cuota base: <strong style={{ color: 'var(--text)' }}>{formatCurrency(d.share)}</strong></span>
                      </div>
                    );
                  })()}
                </div>
              ))}
            </div>
          )}
        </div>
        
        {payments.length === 0 ? (
          <p style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>Sin pagos</p>
        ) : (
          <div>
            {payments.map(p => (
              <div key={p.id} className="list-item" style={{ marginBottom: '10px' }}>
                <div>
                  <strong>{parseYMDToLocalDate(p.date).toLocaleDateString('es-AR')}</strong>
                  {getPayMonth(p) !== p.date.slice(0, 7) && (
                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                      Imputado a: <strong style={{ color: 'var(--text)' }}>{getPayMonth(p)}</strong>
                    </div>
                  )}
                  <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                    {p.note || 'Sin notas'}
                  </p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <p style={{ fontWeight: 'bold', marginBottom: '5px' }}>
                    {formatCurrency(p.amount)}
                  </p>
                  <button
                    className="btn btn-danger btn-sm"
                    onClick={() => onDeletePayment(p.id)}
                  >
                    🗑️ Eliminar
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
