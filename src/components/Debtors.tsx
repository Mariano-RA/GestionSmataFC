'use client';

import { useState } from 'react';
import { formatCurrency, normalizeName } from '@/lib/utils';
import type { Participant, Payment } from '@/types';

interface DebtorsProps {
  participants: Participant[];
  payments: Payment[];
  monthlyShare: number;
  currentMonth: string;
  addToast: (message: string, type: 'success' | 'error' | 'info') => void;
}

export default function Debtors({
  participants,
  payments,
  monthlyShare,
  currentMonth,
  addToast
}: DebtorsProps) {
  const [filterType, setFilterType] = useState('all');
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const allParticipantsStatus = participants
    .filter(p => p.active)
    .map(p => {
      const paid = payments
        .filter(pay => pay.participantId === p.id && pay.date.startsWith(currentMonth))
        .reduce((sum, pay) => sum + pay.amount, 0);
      
      const monthPayments = payments.filter(
        pay => pay.participantId === p.id && pay.date.startsWith(currentMonth)
      ).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      
      return {
        ...p,
        paid,
        debt: Math.max(0, monthlyShare - paid),
        paymentHistory: monthPayments
      };
    })
    .sort((a, b) => b.debt - a.debt);

  const debtors = allParticipantsStatus.filter(p => p.debt > 0);

  let filtered = debtors;
  if (filterType === 'high') {
    filtered = debtors.filter(p => p.debt > monthlyShare * 0.5);
  } else if (filterType === 'medium') {
    filtered = debtors.filter(p => p.debt > 0 && p.debt <= monthlyShare * 0.5);
  } else if (filterType === 'completed') {
    filtered = allParticipantsStatus.filter(p => p.debt === 0);
  }

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
            style={{
              marginBottom: '12px',
              padding: '8px 12px',
              background: '#FFD700',
              color: '#000',
              border: 'none',
              borderRadius: '5px',
              cursor: 'pointer',
              fontWeight: '500',
              width: '100%'
            }}
            onClick={() => {
              const msg =
                '📋 Estado de cuentas (' + currentMonth + '):\n' +
                allParticipantsStatus
                  .map(p => {
                    if (p.debt > 0) {
                      return `💸 ${normalizeName(p.name)}: ${formatCurrency(p.debt)} (pagó ${formatCurrency(p.paid)}/${formatCurrency(monthlyShare)})`;
                    } else {
                      return `✅ ${normalizeName(p.name)}: COMPLETO`;
                    }
                  })
                  .join('\n');
              navigator.clipboard.writeText(msg);
              addToast('Mensaje copiado al portapapeles', 'success');
            }}
          >
            📋 Copiar estado para WhatsApp
          </button>
        )}
        {filtered.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">{filterType === 'completed' ? '✅' : '🎉'}</div>
            <p>{filterType === 'completed' ? 'Todos completaron el pago' : '¡Sin deudas!'}</p>
          </div>
        ) : (
          filtered.map(p => {
            const percentage = (p.paid / monthlyShare) * 100;
            const debtClass = p.debt > monthlyShare * 0.5 ? 'high-debt' : 'partial-debt';
            
            return (
              <div key={p.id}>
                <div 
                  className={`list-item ${debtClass}`}
                  style={{ cursor: 'pointer' }}
                  onClick={() => setExpandedId(expandedId === p.id ? null : p.id)}
                >
                  <div>
                    <strong>{normalizeName(p.name)}</strong>
                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                      <span>{formatCurrency(p.paid)}</span>
                      <span style={{ margin: '0 6px' }}>/</span>
                      <span>{formatCurrency(monthlyShare)}</span>
                      <span style={{ marginLeft: '8px', color: 'var(--text)' }}>({Math.round(percentage)}%)</span>
                    </div>
                  </div>
                  <span className="debtors-amount" style={{ fontSize: '14px' }}>{formatCurrency(p.debt)}</span>
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
