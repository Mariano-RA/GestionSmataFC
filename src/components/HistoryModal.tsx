'use client';

import {
  normalizeName,
  parseYMDToLocalDate,
  formatCurrency,
  formatMonthShortLabel,
} from '@/lib/utils';
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

const STATUS_LABELS: Record<ParticipantStatus, string> = {
  activo: 'Activo',
  sin_laburo: 'Sin trabajo',
  lesionado: 'Lesionado',
  media_cuota: 'Media cuota',
};

function estadoJugadorLabel(d: MonthlyDetails | undefined): string {
  if (!d) return '—';
  if (!d.active) return 'Inactivo';
  const s = (d.status ?? 'activo') as ParticipantStatus;
  return STATUS_LABELS[s] ?? s;
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
      <div className="modal-content modal-content--history" onClick={(e) => e.stopPropagation()}>
        <button className="close-btn" onClick={onClose}>×</button>
        <h3>{normalizeName(participantName)}</h3>

        <div style={{ margin: '12px 0 16px', background: 'var(--bg-secondary)', borderRadius: '8px', padding: '10px', border: '1px solid var(--border)' }}>
          <p style={{ fontWeight: 600, marginBottom: '8px', color: 'var(--text)' }}>📊 Histórico de deuda por mes</p>
          {monthlyHistory.length === 0 ? (
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Sin meses para mostrar</p>
          ) : (
            <div className="history-modal-monthly-scroll" style={{ maxHeight: '280px', overflowY: 'auto', fontSize: '12px' }}>
              <table className="history-modal-table">
                <thead>
                  <tr>
                    <th scope="col">Mes</th>
                    <th scope="col">Estado del jugador</th>
                    <th scope="col" className="history-modal-table__num">
                      Pagado
                    </th>
                    <th scope="col" className="history-modal-table__num">
                      Deuda
                    </th>
                    <th scope="col" className="history-modal-table__num">
                      Acumulado
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {monthlyHistory.map((item) => {
                    const d = monthlyDetailsByMonth[item.month];
                    return (
                      <tr key={item.month}>
                        <td>{formatMonthShortLabel(item.month)}</td>
                        <td>{estadoJugadorLabel(d)}</td>
                        <td className="history-modal-table__num">{formatCurrency(item.paid)}</td>
                        <td
                          className="history-modal-table__num history-modal-table__emph"
                          style={{
                            color: item.debtMonth > 0 ? 'var(--danger)' : 'var(--success)',
                          }}
                        >
                          {formatCurrency(item.debtMonth)}
                        </td>
                        <td
                          className="history-modal-table__num history-modal-table__emph"
                          style={{
                            color: item.debtAccumulated > 0 ? 'var(--danger)' : 'var(--success)',
                          }}
                        >
                          {formatCurrency(item.debtAccumulated)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
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
