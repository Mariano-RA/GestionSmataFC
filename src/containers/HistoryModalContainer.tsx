'use client';

import { useMemo } from 'react';
import { useTeamDataContext } from '@/context/TeamDataContext';
import HistoryModal from '@/components/HistoryModal';
import {
  getMonthlyObjectiveForHistory,
  computeMonthlyHistory,
} from '@/lib/domain/history';

interface HistoryModalContainerProps {
  isOpen: boolean;
  participantId: number;
  participantName: string;
  onClose: () => void;
}

export default function HistoryModalContainer({
  isOpen,
  participantId,
  participantName,
  onClose,
}: HistoryModalContainerProps) {
  const data = useTeamDataContext();

  const { historyPayments, monthlyHistory } = useMemo(() => {
    const payments = data.payments
      .filter(p => p.participantId === participantId)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    const participant = data.participants.find(p => p.id === participantId);
    // La “cuota” real en la app pondera el estado del jugador:
    // - sin_laburo => 0
    // - lesionado => 0.5
    // - activo => 1
    // Para el historial usamos la misma ponderación, pero aplicada a cada mes según
    // la configuración mensual de ese mes.
    const effectiveParticipants =
      data.participants
        .filter(p => p.active)
        .reduce(
          (sum, p) =>
            sum + (p.status === 'sin_laburo' ? 0 : p.status === 'lesionado' ? 0.5 : 1),
          0
        ) || 1;

    const monthlyConfigsSorted = [...data.monthlyConfigs].sort((a, b) =>
      a.month.localeCompare(b.month)
    );
    const fallbackTarget = data.globalConfig.monthlyTarget ?? 0;
    const fallbackRent = data.globalConfig.fieldRental ?? 0;

    const getRequiredForMonth = (month: string) => {
      const objective = getMonthlyObjectiveForHistory(
        month,
        monthlyConfigsSorted,
        fallbackTarget,
        fallbackRent
      );
      const monthlyShare = effectiveParticipants > 0 ? objective / effectiveParticipants : 0;

      if (!participant || !participant.active) return 0;
      if (participant.status === 'sin_laburo') return 0;
      if (participant.status === 'lesionado') return monthlyShare / 2;
      return monthlyShare;
    };

    const historyMonths = Array.from(
      new Set([
        ...payments.map(p => p.date.slice(0, 7)),
        ...monthlyConfigsSorted
          .filter(cfg => cfg.month <= data.currentMonth)
          .map(cfg => cfg.month),
      ])
    ).sort();

    const byMonth = computeMonthlyHistory(payments, historyMonths, getRequiredForMonth);

    return { historyPayments: payments, monthlyHistory: byMonth };
  }, [
    data.payments,
    data.participants,
    data.monthlyConfigs,
    data.globalConfig.monthlyTarget,
    data.globalConfig.fieldRental,
    data.currentMonth,
    participantId,
  ]);

  return (
    <HistoryModal
      isOpen={isOpen}
      participantName={participantName}
      payments={historyPayments}
      monthlyHistory={monthlyHistory}
      onClose={onClose}
      onDeletePayment={data.handleDeletePayment}
    />
  );
}
