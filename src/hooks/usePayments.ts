'use client';

import { useState, useCallback } from 'react';
import type { Payment } from '@/types';
import type { RequestFn } from '@/services/types';
import * as paymentsService from '@/services/payments';

type AddToast = (message: string, type?: 'success' | 'error' | 'info') => void;

export function usePayments(
  request: RequestFn,
  currentTeamId: number | null,
  addToast: AddToast
) {
  const [payments, setPayments] = useState<Payment[]>([]);

  const loadPayments = useCallback(async () => {
    if (!currentTeamId) return;
    const data = await paymentsService.getPayments(request);
    setPayments(data ?? []);
  }, [request, currentTeamId]);

  const handleAddPayment = useCallback(
    async (participantId: number, date: string, amount: number, method: string, note: string) => {
      try {
        const res = await paymentsService.createPayment(request, {
          participantId,
          date,
          amount,
          method,
          note,
        });
        if (res != null) {
          addToast('Pago registrado', 'success');
          await loadPayments();
        }
      } catch (error) {
        const msg = error instanceof Error ? error.message : 'Error registrando pago';
        addToast(msg, 'error');
        throw error;
      }
    },
    [request, loadPayments, addToast]
  );

  const handleDeletePayment = useCallback(
    async (id: number) => {
      if (!confirm('¿Eliminar?')) return;
      try {
        const res = await paymentsService.deletePayment(request, id);
        if (res !== null) {
          addToast('Pago eliminado', 'success');
          await loadPayments();
        }
      } catch (error) {
        addToast(error instanceof Error ? error.message : 'Error eliminando pago', 'error');
      }
    },
    [request, loadPayments, addToast]
  );

  const handleUpdatePayment = useCallback(
    async (id: number, participantId: number, date: string, amount: number, method: string, note: string) => {
      try {
        const res = await paymentsService.updatePayment(request, id, {
          participantId,
          date,
          amount,
          method,
          note,
        });
        if (res != null) {
          addToast('Pago actualizado', 'success');
          await loadPayments();
        }
      } catch (error) {
        addToast(error instanceof Error ? error.message : 'Error actualizando pago', 'error');
      }
    },
    [request, loadPayments, addToast]
  );

  return {
    payments,
    loadPayments,
    handleAddPayment,
    handleDeletePayment,
    handleUpdatePayment,
  };
}
