'use client';

import { useTeamDataContext } from '@/context/TeamDataContext';
import Debtors from '@/components/Debtors';

export default function DebtorsContainer() {
  const data = useTeamDataContext();
  return (
    <Debtors
      participants={data.participants}
      payments={data.payments}
      getRequiredAmount={data.getRequiredAmount}
      currentMonth={data.currentMonth}
      addToast={data.addToast}
    />
  );
}
