'use client';

import { useState, useCallback } from 'react';
import type { Expense } from '@/types';
import type { RequestFn } from '@/services/types';
import * as expensesService from '@/services/expenses';

type AddToast = (message: string, type?: 'success' | 'error' | 'info') => void;

export function useExpenses(
  request: RequestFn,
  currentTeamId: number | null,
  addToast: AddToast
) {
  const [expenses, setExpenses] = useState<Expense[]>([]);

  const loadExpenses = useCallback(async () => {
    if (!currentTeamId) return;
    const data = await expensesService.getExpenses(request);
    setExpenses(data ?? []);
  }, [request, currentTeamId]);

  const handleAddExpense = useCallback(
    async (name: string, amount: number, date: string, category: string, includeInMonthlyShare?: boolean) => {
      try {
        const res = await expensesService.createExpense(request, { name, amount, date, category, includeInMonthlyShare });
        if (res != null) {
          addToast('Gasto registrado', 'success');
          await loadExpenses();
        }
      } catch (error) {
        const msg = error instanceof Error ? error.message : 'Error registrando gasto';
        addToast(msg, 'error');
        throw error;
      }
    },
    [request, loadExpenses, addToast]
  );

  const handleUpdateExpense = useCallback(
    async (id: number, name: string, amount: number, date: string, category: string, includeInMonthlyShare?: boolean) => {
      try {
        const res = await expensesService.updateExpense(request, id, { name, amount, date, category, includeInMonthlyShare });
        if (res != null) {
          addToast('Gasto actualizado', 'success');
          await loadExpenses();
        }
      } catch (error) {
        addToast(error instanceof Error ? error.message : 'Error actualizando gasto', 'error');
      }
    },
    [request, loadExpenses, addToast]
  );

  const handleDeleteExpense = useCallback(
    async (id: number) => {
      if (!confirm('¿Eliminar?')) return;
      try {
        const res = await expensesService.deleteExpense(request, id);
        if (res !== null) {
          addToast('Gasto eliminado', 'success');
          await loadExpenses();
        }
      } catch (error) {
        addToast(error instanceof Error ? error.message : 'Error eliminando gasto', 'error');
      }
    },
    [request, loadExpenses, addToast]
  );

  return {
    expenses,
    loadExpenses,
    handleAddExpense,
    handleUpdateExpense,
    handleDeleteExpense,
  };
}
