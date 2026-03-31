'use client';

import { useEffect, useMemo, useState } from 'react';
import { formatCurrency, getMonthName } from '@/lib/utils';
import { computeMonthAnalysisMetrics } from '@/lib/domain/summary';
import { computeTeamMonthlyHistory } from '@/lib/domain/history';
import type { Payment, Expense, Participant } from '@/types';

interface ComparisonProps {
  payments: Payment[];
  expenses: Expense[];
  allMonths: string[];
  historyMonths: string[];
  currentMonth: string;
  operationalStartMonth: string;
  participants: Participant[];
  getRequiredAmountForMonth: (p: Participant, month: string) => number;
  getBaseObjectiveForMonth: (month: string) => number;
}

export default function Comparison({
  payments,
  expenses,
  allMonths,
  historyMonths,
  currentMonth,
  operationalStartMonth,
  participants,
  getRequiredAmountForMonth,
  getBaseObjectiveForMonth,
}: ComparisonProps) {
  const monthOptions = historyMonths.length > 0 ? historyMonths : allMonths;
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);

  useEffect(() => {
    setSelectedMonth(currentMonth);
  }, [currentMonth]);

  const selectedOrFallback = monthOptions.includes(selectedMonth)
    ? selectedMonth
    : monthOptions.includes(currentMonth)
      ? currentMonth
      : (monthOptions[monthOptions.length - 1] ?? currentMonth);

  const { collected, totalCosts, profit, paymentCount, expenseCount } = computeMonthAnalysisMetrics(
    payments,
    expenses,
    selectedOrFallback,
    getBaseObjectiveForMonth,
    operationalStartMonth
  );

  const teamHistoryRows = useMemo(
    () =>
      computeTeamMonthlyHistory(
        participants,
        payments,
        historyMonths,
        getRequiredAmountForMonth,
        operationalStartMonth
      ),
    [participants, payments, historyMonths, getRequiredAmountForMonth, operationalStartMonth]
  );

  const selectedTeamRow = teamHistoryRows.find((r) => r.month === selectedOrFallback);
  const debtMonth = selectedTeamRow?.debtMonth ?? 0;
  const debtAccumulated = selectedTeamRow?.debtAccumulated ?? 0;

  const tableRowsDesc = useMemo(() => [...teamHistoryRows].reverse(), [teamHistoryRows]);

  return (
    <div className="tab-content">
      <div style={{ marginBottom: '15px' }}>
        <h3 style={{ marginBottom: '10px', color: 'var(--heading)' }}>Mes</h3>
        <div style={{ overflowX: 'auto', display: 'flex', gap: '8px', marginBottom: '15px' }}>
          {monthOptions.map((month) => (
            <button
              key={month}
              type="button"
              className={`month-btn ${selectedOrFallback === month ? 'active' : ''}`}
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
          <div className="comparison-label">Gastos totales</div>
          <div className="comparison-value">{formatCurrency(totalCosts)}</div>
        </div>
        <div className="comparison-item">
          <div className="comparison-label">Ganancia</div>
          <div className="comparison-value">{formatCurrency(profit)}</div>
        </div>
        <div className="comparison-item">
          <div className="comparison-label">Operaciones</div>
          <div className="comparison-value">{paymentCount + expenseCount}</div>
        </div>
        <div className="comparison-item">
          <div className="comparison-label">Deuda del mes</div>
          <div className="comparison-value">{formatCurrency(debtMonth)}</div>
        </div>
        <div className="comparison-item">
          <div className="comparison-label">Deuda acumulada</div>
          <div className="comparison-value">{formatCurrency(debtAccumulated)}</div>
        </div>
      </div>

      <div
        style={{
          marginTop: '24px',
          background: 'var(--bg-primary)',
          padding: '15px',
          borderRadius: '8px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          border: '1px solid var(--border)',
          color: 'var(--text)',
        }}
      >
        <h3 style={{ marginBottom: '12px', color: 'var(--heading)' }}>Histórico del equipo</h3>
        <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '12px' }}>
          Meses anteriores al inicio de actividad ({getMonthName(operationalStartMonth)}) muestran ceros. La fila
          resaltada coincide con el mes seleccionado arriba.
        </p>
        <div style={{ overflowX: 'auto' }}>
          <table
            style={{
              width: '100%',
              borderCollapse: 'collapse',
              fontSize: '14px',
              minWidth: '420px',
            }}
          >
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)', textAlign: 'left' }}>
                <th style={{ padding: '8px 6px', color: 'var(--heading)' }}>Mes</th>
                <th style={{ padding: '8px 6px', color: 'var(--heading)' }}>Recaudado</th>
                <th style={{ padding: '8px 6px', color: 'var(--heading)' }}>Deuda del mes</th>
                <th style={{ padding: '8px 6px', color: 'var(--heading)' }}>Deuda acum.</th>
              </tr>
            </thead>
            <tbody>
              {tableRowsDesc.map((row) => {
                const isSelected = row.month === selectedOrFallback;
                return (
                  <tr
                    key={row.month}
                    style={{
                      borderBottom: '1px solid var(--border)',
                      background: isSelected ? 'var(--bg-secondary)' : undefined,
                    }}
                  >
                    <td style={{ padding: '8px 6px' }}>{getMonthName(row.month)}</td>
                    <td style={{ padding: '8px 6px' }}>{formatCurrency(row.collected)}</td>
                    <td style={{ padding: '8px 6px' }}>{formatCurrency(row.debtMonth)}</td>
                    <td style={{ padding: '8px 6px' }}>{formatCurrency(row.debtAccumulated)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {teamHistoryRows.length === 0 && (
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>No hay meses para mostrar.</p>
        )}
      </div>
    </div>
  );
}
