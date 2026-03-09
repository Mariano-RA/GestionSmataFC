'use client';

import { useTeamDataContext } from '@/context/TeamDataContext';
import Expenses from '@/components/Expenses';

export default function ExpensesContainer() {
  const data = useTeamDataContext();
  return (
    <Expenses
      expenses={data.expenses}
      expenseCategories={data.config.expenseCategories}
      addToast={data.addToast}
      currentMonth={data.currentMonth}
      onAdd={data.handleAddExpense}
      onUpdate={data.handleUpdateExpense}
      onDelete={data.handleDeleteExpense}
    />
  );
}
