'use client';

import { useState } from 'react';
import {
  formatCurrency,
  formatMonthShortLabel,
  getMonthName,
  normalizeName,
  parseYMDToLocalDate,
} from '@/lib/utils';
import { buildDebtReminderMessage, openWhatsAppForDebtor as openWhatsApp } from '@/lib/utils/whatsapp';
import {
  buildDebtMatrixMonths,
  computeParticipantDebtMatrixRow,
  computeParticipantsWithDebtStatus,
  filterDebtorsByType,
  type DebtFilterType,
} from '@/lib/domain/debt';
import type { Participant, Payment, ParticipantStatus } from '@/types';

const STATUS_SORT_ORDER: Record<ParticipantStatus, number> = {
  sin_laburo: 0,
  lesionado: 1,
  media_cuota: 2,
  activo: 3,
};

interface DebtorsProps {
  participants: Participant[];
  payments: Payment[];
  getRequiredAmount: (p: Participant) => number;
  getRequiredAmountForMonth: (p: Participant, month: string) => number;
  historyMonths: string[];
  monthlyShare: number;
  currentMonth: string;
  addToast: (message: string, type: 'success' | 'error' | 'info') => void;
  onShowHistory: (id: number, name: string) => void;
}

export default function Debtors({
  participants,
  payments,
  getRequiredAmount,
  getRequiredAmountForMonth,
  historyMonths,
  monthlyShare,
  currentMonth,
  addToast,
  onShowHistory,
}: DebtorsProps) {
  const [filterType, setFilterType] = useState<DebtFilterType>('all');
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'matrix'>('list');

  const computed = computeParticipantsWithDebtStatus(
    participants,
    payments,
    currentMonth,
    getRequiredAmount,
    { getRequiredAmountForMonth, historyMonths }
  );
  const allParticipantsStatus = [...computed].sort((a, b) => {
    const aSinPagar = a.paid === 0 ? 0 : 1;
    const bSinPagar = b.paid === 0 ? 0 : 1;
    if (aSinPagar !== bSinPagar) return aSinPagar - bSinPagar;
    const orderA = STATUS_SORT_ORDER[(a.status as ParticipantStatus) ?? 'activo'];
    const orderB = STATUS_SORT_ORDER[(b.status as ParticipantStatus) ?? 'activo'];
    if (orderA !== orderB) return orderA - orderB;
    return normalizeName(a.name).localeCompare(normalizeName(b.name));
  });
  const debtors = allParticipantsStatus.filter(p => p.debt > 0);
  const filtered = filterDebtorsByType(allParticipantsStatus, filterType);

  const matrixMonths = buildDebtMatrixMonths(currentMonth);

  const handleOpenWhatsApp = (p: typeof allParticipantsStatus[0]) => {
    const message = buildDebtReminderMessage(
      p.name,
      currentMonth,
      p.debt,
      p.previousDebt
    );
    openWhatsApp(p.phone, message, () =>
      addToast('Este jugador no tiene número cargado. Agregalo en Participantes.', 'error')
    );
  };

  return (
    <div className="tab-content debtors-tab">
      {/* View mode + filters row */}
      <div className="debtors-toolbar">
        <div className="debtors-segment-group">
          <button
            type="button"
            className={`debtors-segment-btn ${viewMode === 'list' ? 'active' : ''}`}
            onClick={() => setViewMode('list')}
          >
            📋 Lista
          </button>
          <button
            type="button"
            className={`debtors-segment-btn ${viewMode === 'matrix' ? 'active' : ''}`}
            onClick={() => setViewMode('matrix')}
          >
            📅 Mensual
          </button>
        </div>
      </div>

      <div className="debtors-filter-row">
        <button
          className={`debtors-filter-btn ${filterType === 'all' ? 'active' : ''}`}
          onClick={() => setFilterType('all')}
        >
          Pendientes <span className="debtors-filter-count">{debtors.length}</span>
        </button>
        <button
          className={`debtors-filter-btn ${filterType === 'high' ? 'active' : ''}`}
          onClick={() => setFilterType('high')}
        >
          Crítico
        </button>
        <button
          className={`debtors-filter-btn ${filterType === 'medium' ? 'active' : ''}`}
          onClick={() => setFilterType('medium')}
        >
          Parcial
        </button>
        <button
          className={`debtors-filter-btn ${filterType === 'completed' ? 'active' : ''}`}
          onClick={() => setFilterType('completed')}
        >
          Completos ✅
        </button>
      </div>

      {/* Copy to clipboard button */}
      {viewMode === 'list' && participants.length > 0 && (
        <button
          className="debtors-copy-btn"
          onClick={() => {
            const header = `Mes: ${getMonthName(currentMonth)} - Cuota: ${formatCurrency(monthlyShare)}`;
            const listado = allParticipantsStatus
              .map(p => {
                if ((p.status as ParticipantStatus) === 'sin_laburo') {
                  return `${normalizeName(p.name)} (sin trabajo)`;
                }
                if (p.required > 0) {
                  return p.paid === 0 ? normalizeName(p.name) : `${normalizeName(p.name)}: ${formatCurrency(p.paid)}`;
                }
                return normalizeName(p.name);
              })
              .join('\n');
            const msg = `${header}\n${listado}`;
            navigator.clipboard.writeText(msg);
            addToast('Mensaje copiado al portapapeles', 'success');
          }}
        >
          📋 Copiar Estado para WhatsApp
        </button>
      )}

      {viewMode === 'matrix' && (
        <p className="debt-matrix-hint">
          En pantallas chicas podés desplazar la tabla horizontalmente. La lectura prioriza escritorio.
        </p>
      )}

      <div id="debtorsList" className={viewMode === 'list' ? 'debtors-list' : ''}>
        {filtered.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">{filterType === 'completed' ? '✅' : '🎉'}</div>
            <p>{filterType === 'completed' ? 'Todos completaron el pago' : '¡Sin deudas!'}</p>
          </div>
        ) : viewMode === 'matrix' ? (
          <div className="debt-matrix-wrap">
            <table className="debt-matrix-table" aria-label="Deuda por jugador y por mes (misma lógica que el historial individual)">
              <thead>
                <tr>
                  <th scope="col">Jugador</th>
                  {matrixMonths.map((m) => (
                    <th
                      key={m}
                      scope="col"
                      className={m === currentMonth ? 'col-current-month' : undefined}
                    >
                      {formatMonthShortLabel(m)}
                      {m === currentMonth ? (
                        <span className="debt-matrix-current-badge" title="Mes de trabajo del equipo">
                          {' '}
                          · actual
                        </span>
                      ) : null}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((p) => {
                  const cells = computeParticipantDebtMatrixRow(
                    p,
                    payments,
                    matrixMonths,
                    getRequiredAmountForMonth
                  );
                  return (
                    <tr key={p.id}>
                      <th scope="row">
                        <button
                          type="button"
                          className="debt-matrix-name-btn"
                          onClick={() => onShowHistory(p.id, p.name)}
                          aria-label={`Ver historial y detalle de ${normalizeName(p.name)}`}
                        >
                          {normalizeName(p.name)}
                        </button>
                      </th>
                      {cells.map((cell) => {
                        const noQuota = cell.required <= 0;
                        const ok = !noQuota && cell.debtMonth <= 0;
                        const label =
                          noQuota ? 'Sin cuota' : ok ? 'Al día' : `Debe ${formatCurrency(cell.debtMonth)}`;
                        return (
                          <td
                            key={cell.month}
                            className={cell.month === currentMonth ? 'col-current-month' : undefined}
                            aria-label={`${formatMonthShortLabel(cell.month)}: ${label}`}
                          >
                            <span
                              className={
                                noQuota
                                  ? 'debt-matrix-cell debt-matrix-cell--muted'
                                  : ok
                                    ? 'debt-matrix-cell debt-matrix-cell--ok'
                                    : 'debt-matrix-cell debt-matrix-cell--debt'
                              }
                              title={`Pagado ${formatCurrency(cell.paid)}, requerido ${formatCurrency(cell.required)}, faltante del mes ${formatCurrency(cell.debtMonth)}`}
                            >
                              {noQuota ? '—' : ok ? '✓' : formatCurrency(cell.debtMonth)}
                            </span>
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          filtered.map(p => {
            const percentage = p.required > 0 ? (p.paid / p.required) * 100 : 100;
            const debtCritical = p.required > 0 && p.debt > p.required * 0.5;
            
            return (
              <div key={p.id} className="debtor-card" onClick={() => setExpandedId(expandedId === p.id ? null : p.id)}>
                {/* Header: avatar + name + debt amount */}
                <div className="debtor-card-header">
                  <div className="debtor-card-user">
                    <span className={`debtor-card-avatar ${debtCritical ? 'critical' : ''}`}>
                      {normalizeName(p.name).charAt(0).toUpperCase()}
                    </span>
                    <div className="debtor-card-user-info">
                      <button
                        type="button"
                        className="debtor-card-name-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          onShowHistory(p.id, p.name);
                        }}
                      >
                        {normalizeName(p.name)}
                      </button>
                      <div className="debtor-card-progress-text">
                        {formatCurrency(p.paid)} / {formatCurrency(p.required)} · {Math.round(percentage)}%
                      </div>
                    </div>
                  </div>
                  <div className="debtor-card-amount-section">
                    <span className={`debtor-card-debt ${debtCritical ? 'critical' : ''}`}>
                      {formatCurrency(p.debt)}
                    </span>
                    {p.phone && p.debt > 0 && (
                      <button
                        className="debtor-card-whatsapp"
                        title="Avisar por WhatsApp"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenWhatsApp(p);
                        }}
                      >
                        <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                          <path d="M11.999 0a12 12 0 0 0-10.27 18.23l-1.63 5.56 5.68-1.49a12 12 0 1 0 6.22-22.3zM12 21.8c-1.61 0-3.19-.43-4.57-1.25l-.33-.2-3.4.89.9-3.32-.21-.34A9.85 9.85 0 0 1 12 2.18a9.85 9.85 0 0 1 0 19.62zm5.4-7.36c-.3-.15-1.76-.87-2.03-.97-.28-.1-.48-.15-.68.15-.2.3-.77.97-.94 1.17-.18.2-.35.23-.65.08-.3-.15-1.26-.46-2.4-1.48-.88-.79-1.48-1.78-1.65-2.08-.18-.3-.02-.46.12-.61.14-.14.3-.35.45-.52.15-.18.2-.3.3-.5.1-.2.05-.38-.03-.52-.08-.15-.68-1.65-.94-2.26-.25-.6-.5-.52-.68-.53h-.58c-.2 0-.53.08-.8.38-.28.3-1.05 1.03-1.05 2.5 0 1.48 1.08 2.92 1.23 3.12.15.2 2.13 3.25 5.15 4.55 2.05.88 2.65.95 3.5.9.82-.05 2.03-.82 2.33-1.62.3-.8.3-1.48.2-1.62-.1-.15-.4-.23-.7-.38z"/>
                        </svg>
                      </button>
                    )}
                  </div>
                </div>

                {/* Progress bar */}
                <div className="debtor-card-progress-bar">
                  <div
                    className={`debtor-card-progress-fill ${debtCritical ? 'critical' : percentage >= 100 ? 'complete' : ''}`}
                    style={{ width: `${Math.min(percentage, 100)}%` }}
                  />
                </div>

                {/* Expandable payment history */}
                {expandedId === p.id && p.paymentHistory.length > 0 && (
                  <div className="debtor-card-history">
                    <p className="debtor-card-history-title">📜 Historial de pagos:</p>
                    {p.paymentHistory.map(pay => (
                      <div key={pay.id} className="debtor-card-history-row">
                        <span>{parseYMDToLocalDate(pay.date).toLocaleDateString('es-AR')}</span>
                        <span className="debtor-card-history-amount">{formatCurrency(pay.amount)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {viewMode === 'list' && debtors.length > 0 && (
        <div className="debtors-total-row">
          <span>Deuda Total {filterType !== 'all' && `(${filterType})`}</span>
          <span className="debtors-total-amount">{formatCurrency(
            filterType === 'all' 
              ? debtors.reduce((sum, p) => sum + p.debt, 0)
              : filtered.reduce((sum, p) => sum + p.debt, 0)
          )}</span>
        </div>
      )}
    </div>
  );
}
