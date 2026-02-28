'use client';

import { useState, useEffect } from 'react';
import { formatCurrency, getMonthName } from '@/lib/utils';
import type { Payment, Participant, Expense, AppConfig } from '@/types';

interface DashboardProps {
  currentMonth: string;
  onMonthChange: (delta: number) => void;
  participants: Participant[];
  payments: Payment[];
  expenses: Expense[];
  config: AppConfig;
}

export default function Dashboard({
  currentMonth,
  onMonthChange,
  participants,
  payments,
  expenses,
  config
}: DashboardProps) {
  const activeParticipants = participants.filter(p => p.active).length || 1;
  const monthlyShare = config.monthlyTarget / activeParticipants;
  
  const monthPayments = payments.filter(p => p.date.startsWith(currentMonth));
  const monthExpenses = expenses.filter(e => e.date.startsWith(currentMonth));
  
  const collected = monthPayments.reduce((sum, p) => sum + p.amount, 0);
  const totalExpenses = monthExpenses.reduce((sum, e) => sum + e.amount, 0);
  const profit = Math.max(0, collected - totalExpenses);

  const totalDebt = participants
    .filter(p => p.active)
    .reduce((sum, p) => {
      const paid = monthPayments
        .filter(pay => pay.participantId === p.id)
        .reduce((s, pay) => s + pay.amount, 0);
      return sum + Math.max(0, monthlyShare - paid);
    }, 0);

  const progress = config.monthlyTarget > 0 ? (collected / config.monthlyTarget) * 100 : 0;

  return (
    <div className="tab-content active">
      {/* Month Navigation */}
      <div className="month-nav" style={{ textAlign: 'center', marginBottom: '10px' }}>
        <button className="btn-secondary" style={{ width: 'auto', padding: '6px 12px' }} onClick={() => onMonthChange(-1)}>
          ◀
        </button>
        <span id="dashMonth" style={{ margin: '0 12px', fontWeight: '600' }}>
          {getMonthName(currentMonth)}
        </span>
        <button className="btn-secondary" style={{ width: 'auto', padding: '6px 12px' }} onClick={() => onMonthChange(1)}>
          ▶
        </button>
      </div>

      {/* Stats Cards */}
      <div className="stats">
        <div className="stat-card">
          <h3>Mes Actual</h3>
          <div className="value">{getMonthName(currentMonth)}</div>
        </div>
        <div className="stat-card warning">
          <h3>Objetivo</h3>
          <div className="value">{formatCurrency(config.monthlyTarget)}</div>
        </div>
        <div className="stat-card success">
          <h3>Recaudado</h3>
          <div className="value">{formatCurrency(collected)}</div>
        </div>
        <div className="stat-card danger">
          <h3>Deuda Total</h3>
          <div className="value">{formatCurrency(totalDebt)}</div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="progress-bar">
        <div className="progress-fill" style={{ width: `${Math.min(progress, 100)}%` }}>
          {Math.round(progress)}%
        </div>
      </div>

      {/* Summary */}
      <div style={{ background: 'white', padding: '15px', borderRadius: '8px', marginBottom: '15px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
        <h3 style={{ marginBottom: '15px', color: 'var(--primary)' }}>🔔 Resumen</h3>
        <div style={{ fontSize: '14px', lineHeight: '1.8' }}>
          <p>💰 Recaudado: <strong>{formatCurrency(collected)}</strong></p>
          <p>💸 Gastos: <strong>{formatCurrency(totalExpenses)}</strong></p>
          <p>📈 Ganancia Neta: <strong>{formatCurrency(profit)}</strong></p>
          <p>⚠️ Deuda Pendiente: <strong>{formatCurrency(totalDebt)}</strong></p>
        </div>
      </div>

      <button className="btn btn-primary">📄 Exportar a TXT</button>
    </div>
  );
}
