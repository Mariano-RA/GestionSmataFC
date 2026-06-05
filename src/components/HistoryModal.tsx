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

        {/* Histórico de deuda mensual — responsivo */}
        <div className="history-debt-card">
          <p className="history-debt-title">📊 Histórico de deuda por mes</p>
          {monthlyHistory.length === 0 ? (
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', textAlign: 'center', padding: '12px' }}>
              Sin meses para mostrar
            </p>
          ) : (
            <div className="history-debt-scroll">
              <table className="history-modal-table">
                <thead>
                  <tr>
                    <th scope="col">Mes</th>
                    <th scope="col" className="hide-mobile">Estado</th>
                    <th scope="col" className="history-modal-table__num">Pagado</th>
                    <th scope="col" className="history-modal-table__num">Deuda</th>
                    <th scope="col" className="history-modal-table__num hide-mobile">Acumulado</th>
                  </tr>
                </thead>
                <tbody>
                  {monthlyHistory.map((item) => {
                    const d = monthlyDetailsByMonth[item.month];
                    return (
                      <tr key={item.month}>
                        <td className="history-month-label">{formatMonthShortLabel(item.month)}</td>
                        <td className="hide-mobile">{estadoJugadorLabel(d)}</td>
                        <td className="history-modal-table__num">{formatCurrency(item.paid)}</td>
                        <td
                          className="history-modal-table__num history-modal-table__emph"
                          style={{ color: item.debtMonth > 0 ? 'var(--danger)' : 'var(--success)' }}
                        >
                          {formatCurrency(item.debtMonth)}
                        </td>
                        <td
                          className="history-modal-table__num history-modal-table__emph hide-mobile"
                          style={{ color: item.debtAccumulated > 0 ? 'var(--danger)' : 'var(--success)' }}
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

        {/* Lista de pagos — optimizada para mobile */}
        {payments.length === 0 ? (
          <p style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '12px' }}>Sin pagos registrados</p>
        ) : (
          <div className="history-payments-list">
            {payments.map(p => (
              <div key={p.id} className="history-payment-item">
                <div className="history-payment-left">
                  <span className="history-payment-date">
                    {parseYMDToLocalDate(p.date).toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })}
                  </span>
                  {getPayMonth(p) !== p.date.slice(0, 7) && (
                    <span className="history-payment-applied">
                      → {getPayMonth(p)}
                    </span>
                  )}
                  {p.note && <span className="history-payment-note">{p.note}</span>}
                </div>
                <div className="history-payment-right">
                  <span className="history-payment-amount">{formatCurrency(p.amount)}</span>
                  <button className="history-payment-delete" onClick={() => onDeletePayment(p.id)} title="Eliminar pago">
                    🗑️
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
