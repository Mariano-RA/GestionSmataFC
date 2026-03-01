'use client';

import { normalizeName } from '@/lib/utils';
import type { Payment } from '@/types';

interface MonthlyHistoryItem {
  month: string;
  paid: number;
  required: number;
  debtMonth: number;
  debtAccumulated: number;
}

interface HistoryModalProps {
  isOpen: boolean;
  participantName: string;
  payments: Payment[];
  monthlyHistory: MonthlyHistoryItem[];
  onClose: () => void;
  onDeletePayment: (paymentId: number) => void;
}

export default function HistoryModal({
  isOpen,
  participantName,
  payments,
  monthlyHistory,
  onClose,
  onDeletePayment
}: HistoryModalProps) {
  if (!isOpen) return null;

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
            <div style={{ maxHeight: '180px', overflowY: 'auto', fontSize: '12px' }}>
              {monthlyHistory.map(item => (
                <div key={item.month} style={{ display: 'grid', gridTemplateColumns: '1.1fr 1fr 1fr 1fr', gap: '6px', padding: '6px 0', borderBottom: '1px solid var(--border)' }}>
                  <span style={{ color: 'var(--text)' }}>{item.month}</span>
                  <span style={{ color: 'var(--text-secondary)' }}>P: ${item.paid.toLocaleString('es-AR')}</span>
                  <span style={{ color: 'var(--text-secondary)' }}>R: ${item.required.toLocaleString('es-AR')}</span>
                  <span style={{ color: item.debtAccumulated > 0 ? 'var(--danger)' : 'var(--success)', fontWeight: 600 }}>
                    Acum: ${item.debtAccumulated.toLocaleString('es-AR')}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
        
        {payments.length === 0 ? (
          <p style={{ textAlign: 'center', color: '#999' }}>Sin pagos</p>
        ) : (
          <div>
            {payments.map(p => (
              <div key={p.id} className="list-item" style={{ marginBottom: '10px' }}>
                <div>
                  <strong>{new Date(p.date).toLocaleDateString('es-AR')}</strong>
                  <p style={{ fontSize: '12px', color: '#999', marginTop: '4px' }}>
                    {p.note || 'Sin notas'}
                  </p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <p style={{ fontWeight: 'bold', marginBottom: '5px' }}>
                    ${p.amount.toLocaleString('es-AR')}
                  </p>
                  <button
                    className="btn btn-danger"
                    onClick={() => onDeletePayment(p.id)}
                    style={{ padding: '2px 8px', fontSize: '11px' }}
                  >
                    Eliminar
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
