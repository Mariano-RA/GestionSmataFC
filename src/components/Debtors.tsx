'use client';

import { useState } from 'react';
import { formatCurrency, normalizeName } from '@/lib/utils';
import type { Participant, Payment } from '@/types';

interface DebtorsProps {
  participants: Participant[];
  payments: Payment[];
  monthlyShare: number;
  currentMonth: string;
}

export default function Debtors({
  participants,
  payments,
  monthlyShare,
  currentMonth
}: DebtorsProps) {
  const [filterType, setFilterType] = useState('all');

  const debtors = participants
    .filter(p => p.active)
    .map(p => {
      const paid = payments
        .filter(pay => pay.participantId === p.id && pay.date.startsWith(currentMonth))
        .reduce((sum, pay) => sum + pay.amount, 0);
      return {
        ...p,
        debt: Math.max(0, monthlyShare - paid)
      };
    })
    .filter(p => p.debt > 0)
    .sort((a, b) => b.debt - a.debt);

  let filtered = debtors;
  if (filterType === 'high') {
    filtered = debtors.filter(p => p.debt > monthlyShare * 0.5);
  } else if (filterType === 'medium') {
    filtered = debtors.filter(p => p.debt > 0 && p.debt <= monthlyShare * 0.5);
  }

  return (
    <div className="tab-content">
      <div style={{ marginBottom: '10px' }}>
        <button
          className={`filter-btn ${filterType === 'all' ? 'active' : ''}`}
          onClick={() => setFilterType('all')}
        >
          Todos
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
      </div>

      <div id="debtorsList">
        {filtered.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">✅</div>
            <p>¡Sin deudas!</p>
          </div>
        ) : (
          filtered.map(p => {
            const debtClass = p.debt > monthlyShare * 0.5 ? 'high-debt' : 'partial-debt';
            return (
              <div key={p.id} className={`list-item ${debtClass}`}>
                <div>
                  <strong>{normalizeName(p.name)}</strong>
                  <p style={{ fontSize: '12px', color: '#999', marginTop: '4px' }}>
                    Deuda: {formatCurrency(p.debt)}
                  </p>
                </div>
                <span className="debtors-amount">{formatCurrency(p.debt)}</span>
              </div>
            );
          })
        )}
      </div>

      {debtors.length > 0 && (
        <div className="total-row" style={{ marginTop: '15px' }}>
          <span>Deuda Total:</span>
          <span>{formatCurrency(debtors.reduce((sum, p) => sum + p.debt, 0))}</span>
        </div>
      )}
    </div>
  );
}
