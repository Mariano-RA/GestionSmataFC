'use client';

import { useMemo } from 'react';
import { addMonths } from '@/lib/utils';
import { deriveOperationalStartMonth } from '@/lib/domain/summary';
import { useTeamDataContext } from '@/context/TeamDataContext';
import Comparison from '@/components/Comparison';

function buildAnalysisHistoryMonths(
  currentMonth: string,
  payments: { date: string }[],
  monthlyConfigs: { month: string }[]
): string[] {
  const set = new Set<string>();
  for (let i = 0; i < 12; i++) {
    set.add(addMonths(currentMonth, -(11 - i)));
  }
  for (const p of payments) {
    set.add(p.date.slice(0, 7));
  }
  for (const c of monthlyConfigs) {
    set.add(c.month);
  }
  return Array.from(set).sort((a, b) => a.localeCompare(b));
}

export default function ComparisonContainer() {
  const data = useTeamDataContext();
  const allMonths = useMemo(
    () => Array.from({ length: 12 }, (_, i) => addMonths(data.currentMonth, -(11 - i))),
    [data.currentMonth]
  );
  const historyMonths = useMemo(
    () => buildAnalysisHistoryMonths(data.currentMonth, data.payments, data.monthlyConfigs),
    [data.currentMonth, data.payments, data.monthlyConfigs]
  );

  const operationalStartMonth = useMemo(
    () =>
      deriveOperationalStartMonth(
        data.currentMonth,
        data.payments,
        data.expenses,
        data.monthlyConfigs
      ),
    [data.currentMonth, data.payments, data.expenses, data.monthlyConfigs]
  );

  return (
    <Comparison
      payments={data.payments}
      expenses={data.expenses}
      allMonths={allMonths}
      historyMonths={historyMonths}
      currentMonth={data.currentMonth}
      operationalStartMonth={operationalStartMonth}
      participants={data.participants}
      getRequiredAmountForMonth={data.getRequiredAmountForMonth}
      getBaseObjectiveForMonth={data.getBaseObjectiveForMonth}
    />
  );
}
