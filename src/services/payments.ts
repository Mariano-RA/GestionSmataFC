import type { RequestFn } from './types';
import type { Payment } from '@/types';

export async function getPayments(request: RequestFn): Promise<Payment[] | null> {
  const data = await request<Payment[]>('/api/payments');
  return data != null && Array.isArray(data) ? data : null;
}

export async function createPayment(
  request: RequestFn,
  body: { participantId: number; date: string; amount: number; method: string; note: string }
): Promise<Payment | null> {
  return request<Payment>('/api/payments', {
    method: 'POST',
    body,
  });
}

export async function updatePayment(
  request: RequestFn,
  id: number,
  body: { participantId: number; date: string; amount: number; method: string; note: string }
): Promise<Payment | null> {
  return request<Payment>(`/api/payments/${id}`, {
    method: 'PATCH',
    body,
  });
}

export async function deletePayment(request: RequestFn, id: number): Promise<unknown> {
  return request<unknown>(`/api/payments/${id}`, { method: 'DELETE' });
}
