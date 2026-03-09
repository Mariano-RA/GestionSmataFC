import type { RequestFn } from './types';
import type { Participant } from '@/types';

export async function getParticipants(request: RequestFn): Promise<Participant[] | null> {
  const data = await request<Participant[]>('/api/participants');
  return data != null && Array.isArray(data) ? data : null;
}

export async function createParticipant(
  request: RequestFn,
  body: { name: string; phone: string; notes: string; status?: string }
): Promise<Participant | null> {
  return request<Participant>('/api/participants', {
    method: 'POST',
    body: { name: body.name, phone: body.phone, notes: body.notes, status: body.status || 'activo' },
  });
}

export async function updateParticipant(
  request: RequestFn,
  id: number,
  body: { name?: string; phone?: string; notes?: string; status?: string | null } | { active: boolean }
): Promise<Participant | null> {
  return request<Participant>(`/api/participants/${id}`, {
    method: 'PATCH',
    body: body as Record<string, unknown>,
  });
}

export async function deleteParticipant(request: RequestFn, id: number): Promise<unknown> {
  return request<unknown>(`/api/participants/${id}`, { method: 'DELETE' });
}
