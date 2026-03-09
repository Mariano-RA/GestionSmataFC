import type { Expense } from '@/types';

export interface CategoryTotal {
  category: string;
  amount: number;
}

/**
 * Agrupa gastos por categoría y devuelve totales ordenados de mayor a menor.
 */
export function aggregateExpensesByCategory(expenses: Expense[]): CategoryTotal[] {
  const byCategory: Record<string, number> = {};
  for (const e of expenses) {
    const cat = e.category || 'Otros';
    byCategory[cat] = (byCategory[cat] ?? 0) + e.amount;
  }
  return Object.entries(byCategory)
    .map(([category, amount]) => ({ category, amount }))
    .sort((a, b) => b.amount - a.amount);
}
