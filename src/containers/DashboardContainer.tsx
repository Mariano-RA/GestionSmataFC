'use client';

import { useTeamDataContext } from '@/context/TeamDataContext';
import Dashboard from '@/components/Dashboard';

export default function DashboardContainer() {
  const data = useTeamDataContext();
  return (
    <Dashboard
      currentMonth={data.currentMonth}
      participants={data.participants}
      payments={data.payments}
      expenses={data.expenses}
      config={data.config}
      getRequiredAmount={data.getRequiredAmount}
    />
  );
}
