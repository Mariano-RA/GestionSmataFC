'use client';

import { addMonths } from '@/lib/utils';
import { useTeamDataContext } from '@/context/TeamDataContext';
import Comparison from '@/components/Comparison';

export default function ComparisonContainer() {
  const data = useTeamDataContext();
  const allMonths = Array.from(
    { length: 12 },
    (_, i) => addMonths(data.currentMonth, -(11 - i))
  );
  return (
    <Comparison
      payments={data.payments}
      expenses={data.expenses}
      allMonths={allMonths}
      currentMonth={data.currentMonth}
    />
  );
}
