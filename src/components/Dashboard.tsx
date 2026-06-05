'use client';

import { formatCurrency, getMonthName } from '@/lib/utils';
import { computeMonthlySummary, buildDashboardCsvLines } from '@/lib/domain/summary';
import { useState } from 'react';
import ExpenseTrend from './ExpenseTrend';
import PaymentStats from './PaymentStats';
import type { Payment, Participant, Expense, AppConfig, ParticipantStatus } from '@/types';

interface DashboardProps {
  currentMonth: string;
  participants: Participant[];
  payments: Payment[];
  expenses: Expense[];
  config: AppConfig;
  getRequiredAmount: (p: Participant) => number;
  getRequiredAmountForMonth?: (p: Participant, month: string) => number;
}

export default function Dashboard({
  currentMonth,
  participants,
  payments,
  expenses,
  config,
  getRequiredAmount,
  getRequiredAmountForMonth,
}: DashboardProps) {
  const [summaryOpen, setSummaryOpen] = useState(true);
  const summary = computeMonthlySummary(
    participants,
    payments,
    expenses,
    currentMonth,
    config,
    getRequiredAmount,
    getRequiredAmountForMonth
  );

  const activeParticipants = participants.filter(p => p.active).length || 1;
  const getParticipantName = (participantId: number) =>
    participants.find(p => p.id === participantId)?.name ?? '';

  const exportToCsv = () => {
    const BOM = '\uFEFF';
    const lines = buildDashboardCsvLines(
      getMonthName(currentMonth),
      summary.monthPayments,
      summary.monthExpenses,
      summary,
      getParticipantName
    );
    const csv = BOM + lines.join('\r\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `resumen-${currentMonth}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const isProfitPositive = summary.profit >= 0;

  const activeByStatus = participants
    .filter((p) => p.active)
    .reduce<Record<string, number>>((acc, p) => {
      const s = (p.status as ParticipantStatus) || 'activo';
      acc[s] = (acc[s] ?? 0) + 1;
      return acc;
    }, {});

  return (
    <div className="tab-content active">
      <div className="stats">
        <div className="stat-card">
          <h3>Mes Actual</h3>
          <div className="value">{getMonthName(currentMonth)}</div>
        </div>
        <div className="stat-card info">
          <h3>Jugadores Activos</h3>
          <div className="value">{activeParticipants}</div>
        </div>
        <div className="stat-card warning">
          <h3>Objetivo</h3>
          <div className="value">{formatCurrency(summary.monthlyObjective)}</div>
        </div>
        <div className="stat-card success">
          <h3>Recaudado</h3>
          <div className="value">{formatCurrency(summary.collected)}</div>
        </div>
        <div className="stat-card danger">
          <h3>Deuda Total</h3>
          <div className="value">{formatCurrency(summary.totalDebt)}</div>
        </div>
      </div>

      <div className="progress-bar">
        <div className="progress-fill" style={{ width: `${Math.min(summary.progress, 100)}%` }}>
          {Math.round(summary.progress)}%
        </div>
      </div>

      {/* Collapsible Summary Card */}
      <div className="dashboard-summary-row">
        <div className="summary-card">
          <div className="summary-card-header" onClick={() => setSummaryOpen(!summaryOpen)}>
            <h3>🔔 Resumen del mes</h3>
            <span className={`summary-card-toggle ${summaryOpen ? 'open' : ''}`}>▾</span>
          </div>
          {summaryOpen && (
            <div className="summary-card-body">
              <div className="summary-stat-row">
                <span className="summary-stat-label">🎯 Objetivo base</span>
                <span className="summary-stat-value">{formatCurrency(config.monthlyTarget)}</span>
              </div>
              <div className="summary-stat-row">
                <span className="summary-stat-label">🏟️ Alquileres</span>
                <span className="summary-stat-value">{formatCurrency(config.fieldRental)}</span>
              </div>
              <div className="summary-stat-row">
                <span className="summary-stat-label">🧾 Gastos en cuota</span>
                <span className="summary-stat-value">{formatCurrency(summary.includedExpensesForShare)}</span>
              </div>
              <div className="summary-stat-row">
                <span className="summary-stat-label">🎯 Objetivo del mes</span>
                <span className="summary-stat-value">{formatCurrency(summary.monthlyObjective)}</span>
              </div>
              <div className="summary-stat-row">
                <span className="summary-stat-label">💸 Gastos registrados</span>
                <span className="summary-stat-value">{formatCurrency(summary.recordedExpenses)}</span>
              </div>
              <div className="summary-stat-row">
                <span className="summary-stat-label">💰 Recaudado</span>
                <span className="summary-stat-value">{formatCurrency(summary.collected)}</span>
              </div>
              <div className="summary-stat-row">
                <span className="summary-stat-label">📈 Ganancia Neta</span>
                <span className="summary-stat-value" style={{ color: isProfitPositive ? 'var(--success)' : 'var(--danger)' }}>
                  {formatCurrency(summary.profit)}
                </span>
              </div>
              <div className="summary-stat-row">
                <span className="summary-stat-label">⚠️ Deuda Pendiente</span>
                <span className="summary-stat-value" style={{ color: 'var(--danger)' }}>{formatCurrency(summary.totalDebt)}</span>
              </div>
            </div>
          )}
        </div>

        {/* Players by status */}
        <div className="summary-card">
          <div className="summary-card-header">
            <h3>👥 Jugadores por estado</h3>
          </div>
          <div className="summary-card-body">
            <div className="players-status-grid">
              {[
                { key: 'activo', label: 'Activo' },
                { key: 'media_cuota', label: 'Media cuota' },
                { key: 'lesionado', label: 'Lesionado' },
                { key: 'sin_laburo', label: 'Sin trabajo' },
              ].map((s) => (
                <div key={s.key} className="players-status-item">
                  <div className="players-status-count">{activeByStatus[s.key] ?? 0}</div>
                  <div className="players-status-label">{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="dashboard-charts-row">
        <PaymentStats
          participants={participants}
          payments={payments}
          currentMonth={currentMonth}
          getRequiredAmount={getRequiredAmount}
          getRequiredAmountForMonth={getRequiredAmountForMonth}
        />
        <ExpenseTrend expenses={summary.monthExpenses} />
      </div>

      <button className="btn btn-primary dashboard-export-btn" style={{ marginTop: '15px' }} onClick={exportToCsv}>
        📄 Exportar a CSV
      </button>
    </div>
  );
}
