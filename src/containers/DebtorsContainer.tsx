'use client';

import { useTeamDataContext } from '@/context/TeamDataContext';
import Debtors from '@/components/Debtors';

export default function DebtorsContainer() {
  const data = useTeamDataContext();
  const historyMonths = Array.from(
    new Set([
      ...data.monthlyConfigs.filter(cfg => cfg.month <= data.currentMonth).map(cfg => cfg.month),
      data.currentMonth,
    ])
  ).sort();
  return (
    <Debtors
      participants={data.participants}
      payments={data.payments}
      getRequiredAmount={data.getRequiredAmount}
      getRequiredAmountForMonth={data.getRequiredAmountForMonth}
      historyMonths={historyMonths}
      monthlyShare={data.monthlyShare}
      currentMonth={data.currentMonth}
      addToast={data.addToast}
    />
  );
}
