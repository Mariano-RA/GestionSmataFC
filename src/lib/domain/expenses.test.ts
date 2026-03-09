import { describe, it, expect } from 'vitest';
import { aggregateExpensesByCategory } from './expenses';
import type { Expense } from '@/types';

function expense(overrides: Partial<Expense> = {}): Expense {
  return {
    id: 1,
    teamId: 1,
    name: 'Test',
    amount: 100,
    date: '2024-03-01',
    category: 'Otros',
    recordedAt: '',
    ...overrides,
  };
}

describe('aggregateExpensesByCategory', () => {
  it('agrupa por categoría y ordena de mayor a menor', () => {
    const expenses: Expense[] = [
      expense({ id: 1, category: 'Arbitraje', amount: 100 }),
      expense({ id: 2, category: 'Arbitraje', amount: 50 }),
      expense({ id: 3, category: 'Alquiler', amount: 200 }),
    ];
    const result = aggregateExpensesByCategory(expenses);
    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({ category: 'Alquiler', amount: 200 });
    expect(result[1]).toEqual({ category: 'Arbitraje', amount: 150 });
  });

  it('usa "Otros" cuando categoría está vacía', () => {
    const expenses: Expense[] = [
      expense({ id: 1, category: '', amount: 10 }),
    ];
    const result = aggregateExpensesByCategory(expenses);
    expect(result).toHaveLength(1);
    expect(result[0].category).toBe('Otros');
    expect(result[0].amount).toBe(10);
  });

  it('devuelve array vacío cuando no hay gastos', () => {
    const result = aggregateExpensesByCategory([]);
    expect(result).toHaveLength(0);
  });
});
