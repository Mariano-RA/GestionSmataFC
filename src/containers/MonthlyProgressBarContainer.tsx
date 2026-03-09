'use client';

import { useTeamDataContext } from '@/context/TeamDataContext';
import MonthlyProgressBar from '@/components/MonthlyProgressBar';
import MonthSelector from '@/components/MonthSelector';

export default function MonthlyProgressBarContainer() {
  const data = useTeamDataContext();
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
        📅 Trabajando en
      </div>
      <MonthSelector
        currentMonth={data.currentMonth}
        onMonthChange={data.setCurrentMonth}
      />
      <div style={{ marginTop: '16px', paddingTop: '12px', borderTop: '1px solid var(--border)' }}>
        <div
          style={{
            fontSize: '12px',
            color: 'var(--text-secondary)',
            fontWeight: '500',
            marginBottom: '8px',
          }}
        >
          📊 Progreso mensual
        </div>
        <MonthlyProgressBar
          payments={data.payments}
          currentMonth={data.currentMonth}
          monthlyObjective={data.monthlyObjective}
        />
      </div>
    </div>
  );
}
