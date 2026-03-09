'use client';

import { formatCurrency, getMonthName } from '@/lib/utils';
import { computeMonthlySummary, buildDashboardCsvLines } from '@/lib/domain/summary';
import ExpenseTrend from './ExpenseTrend';
import PaymentStats from './PaymentStats';
import type { Payment, Participant, Expense, AppConfig } from '@/types';

interface DashboardProps {
  currentMonth: string;
  participants: Participant[];
  payments: Payment[];
  expenses: Expense[];
  config: AppConfig;
  getRequiredAmount: (p: Participant) => number;
}

export default function Dashboard({
  currentMonth,
  participants,
  payments,
  expenses,
  config,
  getRequiredAmount
}: DashboardProps) {
  const summary = computeMonthlySummary(
    participants,
    payments,
    expenses,
    currentMonth,
    config,
    getRequiredAmount
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

      <div style={{ background: 'var(--bg-primary)', padding: '15px', borderRadius: '8px', marginBottom: '15px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', border: '1px solid var(--border)' }}>
        <h3 style={{ marginBottom: '15px', color: 'var(--heading)' }}>🔔 Resumen</h3>
        <div style={{ fontSize: '14px', lineHeight: '1.8', color: 'var(--text)' }}>
          <p>🎯 Objetivo base: <strong>{formatCurrency(config.monthlyTarget)}</strong></p>
          <p>🏟️ Alquileres: <strong>{formatCurrency(config.fieldRental)}</strong></p>
          <p>💸 Gastos registrados: <strong>{formatCurrency(summary.recordedExpenses)}</strong></p>
          <p>💰 Recaudado: <strong>{formatCurrency(summary.collected)}</strong></p>
          <p>📈 Ganancia Neta: <strong style={{ color: isProfitPositive ? 'var(--success)' : 'var(--danger)' }}>{formatCurrency(summary.profit)}</strong></p>
          <p>⚠️ Deuda Pendiente: <strong>{formatCurrency(summary.totalDebt)}</strong></p>
        </div>
      </div>

      <PaymentStats
        participants={participants}
        payments={payments}
        currentMonth={currentMonth}
        getRequiredAmount={getRequiredAmount}
      />
      <ExpenseTrend expenses={summary.monthExpenses} />

      <button className="btn btn-primary" style={{ marginTop: '15px' }} onClick={exportToCsv}>
        📄 Exportar a CSV
      </button>
    </div>
  );
}
