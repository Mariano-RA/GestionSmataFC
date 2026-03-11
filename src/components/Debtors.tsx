'use client';

import { useState } from 'react';
import { formatCurrency, getMonthName, normalizeName } from '@/lib/utils';
import { buildDebtReminderMessage, openWhatsAppForDebtor as openWhatsApp } from '@/lib/utils/whatsapp';
import {
  computeParticipantsWithDebtStatus,
  filterDebtorsByType,
  type DebtFilterType,
} from '@/lib/domain/debt';
import type { Participant, Payment, ParticipantStatus } from '@/types';

const STATUS_SORT_ORDER: Record<ParticipantStatus, number> = {
  sin_laburo: 0,
  lesionado: 1,
  activo: 2,
};

interface DebtorsProps {
  participants: Participant[];
  payments: Payment[];
  getRequiredAmount: (p: Participant) => number;
  monthlyShare: number;
  currentMonth: string;
  addToast: (message: string, type: 'success' | 'error' | 'info') => void;
}

export default function Debtors({
  participants,
  payments,
  getRequiredAmount,
  monthlyShare,
  currentMonth,
  addToast
}: DebtorsProps) {
  const [filterType, setFilterType] = useState<DebtFilterType>('all');
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const computed = computeParticipantsWithDebtStatus(
    participants,
    payments,
    currentMonth,
    getRequiredAmount
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
    <div className="tab-content">
      <div style={{ marginBottom: '10px', display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
        <button
          className={`filter-btn ${filterType === 'all' ? 'active' : ''}`}
          onClick={() => setFilterType('all')}
        >
          Pendientes ({debtors.length})
        </button>
        <button
          className={`filter-btn ${filterType === 'high' ? 'active' : ''}`}
          onClick={() => setFilterType('high')}
        >
          Crítico ({'>'} 50%)
        </button>
        <button
          className={`filter-btn ${filterType === 'medium' ? 'active' : ''}`}
          onClick={() => setFilterType('medium')}
        >
          Parcial ({'<'} 50%)
        </button>
        <button
          className={`filter-btn ${filterType === 'completed' ? 'active' : ''}`}
          onClick={() => setFilterType('completed')}
        >
          Completos ✅
        </button>
      </div>

      <div id="debtorsList">
        {participants.length > 0 && (
          <button
            className="btn btn-warning"
            style={{ width: '100%', marginBottom: '12px', background: '#FFD700', color: '#000' }}
            onClick={() => {
              const header = `Mes: ${getMonthName(currentMonth)} - Cuota: ${formatCurrency(monthlyShare)}`;
              const listado = allParticipantsStatus
                .map(p => {
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
        {filtered.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">{filterType === 'completed' ? '✅' : '🎉'}</div>
            <p>{filterType === 'completed' ? 'Todos completaron el pago' : '¡Sin deudas!'}</p>
          </div>
        ) : (
          filtered.map(p => {
            const percentage = p.required > 0 ? (p.paid / p.required) * 100 : 100;
            const debtClass = p.required > 0 && p.debt > p.required * 0.5 ? 'high-debt' : 'partial-debt';
            
            return (
              <div key={p.id}>
                <div 
                  className={`list-item ${debtClass}`}
                  style={{ cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                  onClick={() => setExpandedId(expandedId === p.id ? null : p.id)}
                >
                  <div style={{ flex: 1 }}>
                    <strong>{normalizeName(p.name)}</strong>
                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                      <span>{formatCurrency(p.paid)}</span>
                      <span style={{ margin: '0 6px' }}>/</span>
                      <span>{formatCurrency(p.required)}</span>
                      <span style={{ marginLeft: '8px', color: 'var(--text)' }}>({Math.round(percentage)}%)</span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span className="debtors-amount" style={{ fontSize: '14px' }}>{formatCurrency(p.debt)}</span>
                    {p.phone && p.debt > 0 && (
                      <button
                        title="Avisar por WhatsApp"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenWhatsApp(p);
                        }}
                        style={{
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          padding: '4px',
                          color: '#25D366'
                        }}
                      >
                        <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor">
                          <path d="M11.999 0a12 12 0 0 0-10.27 18.23l-1.63 5.56 5.68-1.49a12 12 0 1 0 6.22-22.3zM12 21.8c-1.61 0-3.19-.43-4.57-1.25l-.33-.2-3.4.89.9-3.32-.21-.34A9.85 9.85 0 0 1 12 2.18a9.85 9.85 0 0 1 0 19.62zm5.4-7.36c-.3-.15-1.76-.87-2.03-.97-.28-.1-.48-.15-.68.15-.2.3-.77.97-.94 1.17-.18.2-.35.23-.65.08-.3-.15-1.26-.46-2.4-1.48-.88-.79-1.48-1.78-1.65-2.08-.18-.3-.02-.46.12-.61.14-.14.3-.35.45-.52.15-.18.2-.3.3-.5.1-.2.05-.38-.03-.52-.08-.15-.68-1.65-.94-2.26-.25-.6-.5-.52-.68-.53h-.58c-.2 0-.53.08-.8.38-.28.3-1.05 1.03-1.05 2.5 0 1.48 1.08 2.92 1.23 3.12.15.2 2.13 3.25 5.15 4.55 2.05.88 2.65.95 3.5.9.82-.05 2.03-.82 2.33-1.62.3-.8.3-1.48.2-1.62-.1-.15-.4-.23-.7-.38z"/>
                        </svg>
                      </button>
                    )}
                  </div>
                </div>
                {/* Historial expandible */}
                {expandedId === p.id && p.paymentHistory.length > 0 && (
                  <div style={{ padding: '10px 12px', background: 'var(--bg-secondary)', marginBottom: '8px', borderRadius: '4px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                    <p style={{ fontWeight: '600', marginBottom: '6px', color: 'var(--text)' }}>📜 Historial de pagos:</p>
                    {p.paymentHistory.map(pay => (
                      <div key={pay.id} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                        <span>{new Date(pay.date).toLocaleDateString('es-AR')}</span>
                        <span style={{ color: 'var(--success)', fontWeight: '600' }}>{formatCurrency(pay.amount)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {debtors.length > 0 && (
        <div className="total-row" style={{ marginTop: '15px' }}>
          <span>Deuda Total {filterType !== 'all' && `(${filterType}):`}</span>
          <span>{formatCurrency(
            filterType === 'all' 
              ? debtors.reduce((sum, p) => sum + p.debt, 0)
              : filtered.reduce((sum, p) => sum + p.debt, 0)
          )}</span>
        </div>
      )}
    </div>
  );
}
