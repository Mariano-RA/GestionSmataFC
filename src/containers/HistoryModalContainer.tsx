'use client';

import { useMemo } from 'react';
import { useTeamDataContext } from '@/context/TeamDataContext';
import HistoryModal from '@/components/HistoryModal';
import { computeMonthlyHistory } from '@/lib/domain/history';
import { parseYMDToLocalDate } from '@/lib/utils';
import type { ParticipantMonthlyStatus, ParticipantStatus } from '@/types';

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

  const { historyPayments, monthlyHistory, monthlyDetailsByMonth } = useMemo(() => {
    const payments = data.payments
      .filter(p => p.participantId === participantId)
      .sort((a, b) => parseYMDToLocalDate(b.date).getTime() - parseYMDToLocalDate(a.date).getTime());

    const participant = data.participants.find(p => p.id === participantId);
    const monthlyConfigsSorted = [...data.monthlyConfigs].sort((a, b) =>
      a.month.localeCompare(b.month)
    );

    const statusForMonth = (month: string): { active: boolean; status: ParticipantStatus | null } => {
      if (!participant) return { active: false, status: null };
      const snap: ParticipantMonthlyStatus | undefined = data.participantMonthlyStatuses.find(
        (s) => s.participantId === participant.id && s.month === month
      );
      const active = snap?.active ?? participant.active;
      const status = (snap?.status ?? participant.status ?? null) as ParticipantStatus | null;
      return { active, status };
    };

    const objectiveForMonth = (month: string): number => {
      const exact = monthlyConfigsSorted.find((cfg) => cfg.month === month);
      if (exact) return (exact.monthlyTarget || 0) + (exact.rent || 0) + (exact.includedExpenses || 0);
      const previous = monthlyConfigsSorted.filter((cfg) => cfg.month < month);
      if (previous.length > 0) {
        const last = previous[previous.length - 1];
        return (last.monthlyTarget || 0) + (last.rent || 0) + (last.includedExpenses || 0);
      }
      return (data.config.monthlyTarget || 0) + (data.config.fieldRental || 0);
    };

    const effectiveParticipantsForMonth = (month: string): number => {
      const exact = monthlyConfigsSorted.find((cfg) => cfg.month === month);
      if (exact?.effectiveParticipants && exact.effectiveParticipants > 0) return exact.effectiveParticipants;
      return data.effectiveParticipants || 1;
    };

    const getRequiredForMonth = (month: string) => {
      if (!participant) return 0;
      return data.getRequiredAmountForMonth(participant, month);
    };

    const historyMonths = Array.from(
      new Set([
        ...payments.map(p => (p.appliedMonth ?? p.date.slice(0, 7))),
        ...monthlyConfigsSorted
          .filter(cfg => cfg.month <= data.currentMonth)
          .map(cfg => cfg.month),
      ])
    ).sort();

    const byMonth = computeMonthlyHistory(payments, historyMonths, getRequiredForMonth);

    const monthlyDetails = Object.fromEntries(
      historyMonths.map((month) => {
        const { active, status } = statusForMonth(month);
        const objective = objectiveForMonth(month);
        const effectiveParticipants = effectiveParticipantsForMonth(month);
        const share = effectiveParticipants > 0 ? objective / effectiveParticipants : 0;
        return [
          month,
          {
            active,
            status,
            objective,
            effectiveParticipants,
            share,
          },
        ] as const;
      })
    );

    return { historyPayments: payments, monthlyHistory: byMonth, monthlyDetailsByMonth: monthlyDetails };
  }, [
    data.payments,
    data.participants,
    data.monthlyConfigs,
    data.participantMonthlyStatuses,
    data.currentMonth,
    data.getRequiredAmountForMonth,
    data.config.monthlyTarget,
    data.config.fieldRental,
    data.effectiveParticipants,
    participantId,
  ]);

  return (
    <HistoryModal
      isOpen={isOpen}
      participantName={participantName}
      payments={historyPayments}
      monthlyHistory={monthlyHistory}
      monthlyDetailsByMonth={monthlyDetailsByMonth}
      onClose={onClose}
      onDeletePayment={data.handleDeletePayment}
    />
  );
}
