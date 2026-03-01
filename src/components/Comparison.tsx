'use client';

import { useState } from 'react';
import { formatCurrency, getMonthName } from '@/lib/utils';
import type { Payment, Expense } from '@/types';

interface ComparisonProps {
  payments: Payment[];
  expenses: Expense[];
  allMonths: string[];
  currentMonth: string;
}

export default function Comparison({
  payments,
  expenses,
  allMonths,
  currentMonth
}: ComparisonProps) {
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);

  const monthPayments = payments.filter(p => p.date.startsWith(selectedMonth));
  const monthExpenses = expenses.filter(e => e.date.startsWith(selectedMonth));

  const collected = monthPayments.reduce((sum, p) => sum + p.amount, 0);
  const totalExpenses = monthExpenses.reduce((sum, e) => sum + e.amount, 0);
  const profit = Math.max(0, collected - totalExpenses);

  return (
    <div className="tab-content">
      <div style={{ marginBottom: '15px' }}>
        <h3 style={{ marginBottom: '10px', color: 'var(--primary)' }}>Seleccionar Mes</h3>
        <div style={{ overflowX: 'auto', display: 'flex', gap: '8px', marginBottom: '15px' }}>
          {allMonths.slice(-6).map(month => (
            <button
              key={month}
              className={`month-btn ${selectedMonth === month ? 'active' : ''}`}
              onClick={() => setSelectedMonth(month)}
            >
              {getMonthName(month)}
            </button>
          ))}
        </div>
      </div>

      <div className="comparison-chart">
        <div className="comparison-item">
          <div className="comparison-label">Recaudado</div>
          <div className="comparison-value">{formatCurrency(collected)}</div>
        </div>
        <div className="comparison-item">
          <div className="comparison-label">Gastos</div>
          <div className="comparison-value">{formatCurrency(totalExpenses)}</div>
        </div>
        <div className="comparison-item">
          <div className="comparison-label">Ganancia</div>
          <div className="comparison-value">{formatCurrency(profit)}</div>
        </div>
        <div className="comparison-item">
          <div className="comparison-label">Operaciones</div>
          <div className="comparison-value">{monthPayments.length + monthExpenses.length}</div>
        </div>
      </div>

      <div style={{ background: 'var(--bg-primary)', padding: '15px', borderRadius: '8px', marginTop: '20px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', border: '1px solid var(--border)', color: 'var(--text)' }}>
        <h3 style={{ marginBottom: '15px', color: 'var(--primary)' }}>Detalle</h3>
        <p>📊 Mes: <strong>{getMonthName(selectedMonth)}</strong></p>
        <p>💰 Recaudado: <strong>{formatCurrency(collected)}</strong></p>
        <p>💸 Gastos: <strong>{formatCurrency(totalExpenses)}</strong></p>
        <p>📈 Ganancia: <strong>{formatCurrency(profit)}</strong></p>
      </div>
    </div>
  );
}
