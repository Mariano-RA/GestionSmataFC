import type { RequestFn } from './types';
import type { Expense } from '@/types';

export async function getExpenses(request: RequestFn): Promise<Expense[] | null> {
  const data = await request<Expense[]>('/api/expenses');
  return data != null && Array.isArray(data) ? data : null;
}

export async function createExpense(
  request: RequestFn,
  body: { name: string; amount: number; date: string; category: string; includeInMonthlyShare?: boolean }
): Promise<Expense | null> {
  return request<Expense>('/api/expenses', {
    method: 'POST',
    body,
  });
}

export async function updateExpense(
  request: RequestFn,
  id: number,
  body: { name: string; amount: number; date: string; category: string; includeInMonthlyShare?: boolean }
): Promise<Expense | null> {
  return request<Expense>(`/api/expenses/${id}`, {
    method: 'PATCH',
    body,
  });
}

export async function deleteExpense(request: RequestFn, id: number): Promise<unknown> {
  return request<unknown>(`/api/expenses/${id}`, { method: 'DELETE' });
}
