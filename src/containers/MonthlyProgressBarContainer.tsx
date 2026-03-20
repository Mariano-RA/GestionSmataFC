'use client';

import { useState } from 'react';
import { useTeamDataContext } from '@/context/TeamDataContext';
import MonthlyProgressBar from '@/components/MonthlyProgressBar';
import MonthSelector from '@/components/MonthSelector';
import { addMonths, getMonthName } from '@/lib/utils';
import { computeParticipantsWithDebtStatus } from '@/lib/domain/debt';

export default function MonthlyProgressBarContainer() {
  const data = useTeamDataContext();
  const [closingMonth, setClosingMonth] = useState(false);
  const historyMonths = Array.from(
    new Set([
      ...data.monthlyConfigs.filter(cfg => cfg.month <= data.currentMonth).map(cfg => cfg.month),
      data.currentMonth,
    ])
  ).sort();
  const debtors = computeParticipantsWithDebtStatus(
    data.participants,
    data.payments,
    data.currentMonth,
    data.getRequiredAmount,
    { getRequiredAmountForMonth: data.getRequiredAmountForMonth, historyMonths }
  );
  const monthlyDebtTotal = debtors.reduce((sum, p) => sum + p.debt, 0);

  const handleCloseMonth = async () => {
    if (closingMonth) return;
    const nextMonth = addMonths(data.currentMonth, 1);
    const ok = confirm(
      `Se va a cerrar ${getMonthName(data.currentMonth)} y pasar a ${getMonthName(nextMonth)}.\n` +
      'Esto congela estados y mantiene la deuda pendiente para el siguiente mes.\n\n¿Continuar?'
    );
    if (!ok) return;
    setClosingMonth(true);
    try {
      const saved = await data.handleCloseMonth();
      if (!saved) return;
      data.setCurrentMonth(nextMonth);
      data.addToast(`Mes cerrado. Ahora estás en ${getMonthName(nextMonth)}.`, 'success');
    } finally {
      setClosingMonth(false);
    }
  };
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
      <div style={{ marginTop: '10px', display: 'flex', justifyContent: 'center' }}>
        <button
          type="button"
          className="btn btn-warning"
          onClick={handleCloseMonth}
          disabled={closingMonth}
          title="Congela estados del mes y pasa al siguiente"
        >
          {closingMonth ? 'Cerrando mes...' : '🔒 Cerrar mes y pasar al siguiente'}
        </button>
      </div>
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
          monthlyDebtTotal={monthlyDebtTotal}
        />
      </div>
    </div>
  );
}
