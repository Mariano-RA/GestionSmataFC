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

    const monthlyConfigsSorted = [...data.monthlyConfigs].sort((a, b) =>
      a.month.localeCompare(b.month)
    );
    const fallbackTarget = data.globalConfig.monthlyTarget ?? 0;
    const fallbackRent = data.globalConfig.fieldRental ?? 0;
    const activeParticipants = data.activeParticipants;

    const getRequiredForMonth = (month: string) => {
      const objective = getMonthlyObjectiveForHistory(
        month,
        monthlyConfigsSorted,
        fallbackTarget,
        fallbackRent
      );
      return activeParticipants > 0 ? objective / activeParticipants : 0;
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
    data.monthlyConfigs,
    data.globalConfig.monthlyTarget,
    data.globalConfig.fieldRental,
    data.activeParticipants,
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
