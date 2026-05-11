'use client';

import { useTeamDataContext } from '@/context/TeamDataContext';
import Debtors from '@/components/Debtors';

interface DebtorsContainerProps {
  onShowHistory: (id: number, name: string) => void;
}

export default function DebtorsContainer({ onShowHistory }: DebtorsContainerProps) {
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
      onShowHistory={onShowHistory}
    />
  );
}
