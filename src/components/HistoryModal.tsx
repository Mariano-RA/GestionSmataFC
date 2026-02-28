'use client';

import { normalizeName } from '@/lib/utils';
import type { Payment } from '@/types';

interface HistoryModalProps {
  isOpen: boolean;
  participantName: string;
  payments: Payment[];
  onClose: () => void;
  onDeletePayment: (paymentId: number) => void;
}

export default function HistoryModal({
  isOpen,
  participantName,
  payments,
  onClose,
  onDeletePayment
}: HistoryModalProps) {
  if (!isOpen) return null;

  return (
    <div className={`modal ${isOpen ? 'active' : ''}`} onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <button className="close-btn" onClick={onClose}>×</button>
        <h3>{normalizeName(participantName)}</h3>
        
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
