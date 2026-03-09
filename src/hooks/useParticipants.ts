'use client';

import { useState, useCallback } from 'react';
import type { Participant } from '@/types';
import type { RequestFn } from '@/services/types';
import * as participantsService from '@/services/participants';

type AddToast = (message: string, type?: 'success' | 'error' | 'info') => void;

export function useParticipants(
  request: RequestFn,
  currentTeamId: number | null,
  addToast: AddToast
) {
  const [participants, setParticipants] = useState<Participant[]>([]);

  const loadParticipants = useCallback(async () => {
    if (!currentTeamId) return;
    const data = await participantsService.getParticipants(request);
    setParticipants(data ?? []);
  }, [request, currentTeamId]);

  const handleAddParticipant = useCallback(
    async (name: string, phone: string, notes: string, status?: string) => {
      try {
        const res = await participantsService.createParticipant(request, { name, phone, notes, status });
        if (res != null) {
          addToast('Participante agregado', 'success');
          await loadParticipants();
        }
      } catch (error) {
        const msg = error instanceof Error ? error.message : 'Error agregando participante';
        addToast(msg, 'error');
        throw error;
      }
    },
    [request, loadParticipants, addToast]
  );

  const handleRemoveParticipant = useCallback(
    async (id: number) => {
      if (!confirm('¿Eliminar?')) return;
      try {
        const res = await participantsService.deleteParticipant(request, id);
        if (res !== null) {
          addToast('Participante eliminado', 'success');
          await loadParticipants();
        }
      } catch (error) {
        addToast(error instanceof Error ? error.message : 'Error eliminando participante', 'error');
      }
    },
    [request, loadParticipants, addToast]
  );

  const handleUpdateParticipant = useCallback(
    async (id: number, name: string, phone: string, notes: string, status?: string | null) => {
      try {
        const res = await participantsService.updateParticipant(request, id, {
          name,
          phone,
          notes,
          status: status ?? undefined,
        });
        if (res != null) {
          addToast('Participante actualizado', 'success');
          await loadParticipants();
        }
      } catch (error) {
        addToast(error instanceof Error ? error.message : 'Error actualizando participante', 'error');
      }
    },
    [request, loadParticipants, addToast]
  );

  const handleToggleParticipant = useCallback(
    async (id: number) => {
      const p = participants.find(x => x.id === id);
      if (!p) return;
      try {
        const res = await participantsService.updateParticipant(request, id, { active: !p.active });
        if (res != null) await loadParticipants();
      } catch (error) {
        addToast(error instanceof Error ? error.message : 'Error actualizando participante', 'error');
      }
    },
    [request, participants, loadParticipants, addToast]
  );

  return {
    participants,
    loadParticipants,
    handleAddParticipant,
    handleRemoveParticipant,
    handleUpdateParticipant,
    handleToggleParticipant,
  };
}
