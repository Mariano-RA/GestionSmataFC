'use client';

import type { Payment } from '@/types';

interface MonthlyProgressBarProps {
  payments: Payment[];
  currentMonth: string;
  monthlyObjective: number;
}

export default function MonthlyProgressBar({
  payments,
  currentMonth,
  monthlyObjective,
}: MonthlyProgressBarProps) {
  const monthPayments = payments.filter(p => p.date.startsWith(currentMonth));
  const collected = monthPayments.reduce((sum, p) => sum + p.amount, 0);
  const progress = monthlyObjective > 0 ? (collected / monthlyObjective) * 100 : 0;

  return (
    <div
      style={{
        background: 'var(--bg-primary)',
        padding: '15px',
        borderRadius: '8px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        marginBottom: '20px',
        border: '1px solid var(--border)',
      }}
    >
      <div
        style={{
          fontSize: '12px',
          color: 'var(--text-secondary)',
          fontWeight: '500',
          marginBottom: '8px',
        }}
      >
        📊 PROGRESO MENSUAL
      </div>
      <div className="progress-bar">
        <div
          className="progress-fill"
          style={{ width: `${Math.min(progress, 100)}%` }}
        >
          {Math.round(progress)}%
        </div>
      </div>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '10px',
          fontSize: '12px',
        }}
      >
        <div>Objetivo: ${monthlyObjective.toLocaleString('es-AR')}</div>
        <div>Recaudado: ${collected.toLocaleString('es-AR')}</div>
      </div>
    </div>
  );
}
