'use client';

import { useState } from 'react';
import { useTeamDataContext } from '@/context/TeamDataContext';
import { useUser } from '@/context/UserContext';
import MonthlyProgressBar from '@/components/MonthlyProgressBar';
import MonthSelector from '@/components/MonthSelector';
import MonthStatusReviewModal from '@/components/MonthStatusReviewModal';
import CloseMonthModal, { type SeasonDecisions } from '@/components/CloseMonthModal';
import { addMonths, getCurrentMonth, getMonthName } from '@/lib/utils';
import { computeOutstandingDebtByMonth, computeParticipantsWithDebtStatus } from '@/lib/domain/debt';
import {
  getParticipantsForStatusReview,
  getPendingStatusReview,
  isStatusReviewMonth,
} from '@/lib/domain/monthlyStatus';
import { canEditTeamData, type TeamRole } from '@/lib/permissions';
import type { ParticipantStatus, SeasonClose } from '@/types';

export default function MonthlyProgressBarContainer() {
  const data = useTeamDataContext();
  const { user } = useUser();
  const [closingMonth, setClosingMonth] = useState(false);
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [savingReview, setSavingReview] = useState(false);
  /** Meses en los que se eligió "Más tarde" en esta sesión (no se vuelve a abrir solo). */
  const [dismissedReviews, setDismissedReviews] = useState<Set<string>>(new Set());

  const teamRole = user?.teams.find((t) => t.id === data.currentTeamId)?.role as TeamRole | undefined;
  const canEdit = user ? canEditTeamData(user.globalRole, teamRole) : false;

  const historyMonths = Array.from(
    new Set([
      ...data.monthlyConfigs.filter(cfg => cfg.month <= data.currentMonth).map(cfg => cfg.month),
      data.currentMonth,
    ])
  ).sort();
  const debtors = computeParticipantsWithDebtStatus(
    data.participants,
    data.payments,
    data.currentMonth,
    data.getRequiredAmount,
    { getRequiredAmountForMonth: data.getRequiredAmountForMonth, historyMonths }
  );
  const monthlyDebtTotal = debtors.reduce((sum, p) => sum + p.debt, 0);
  const monthDebtors = debtors.filter((p) => p.debt >= 0.5);

  /** Deuda pendiente por mes de cada jugador (para el cierre de campeonato). Solo con el modal abierto. */
  const outstandingDebtById = new Map(
    (showCloseModal ? data.participants : []).map((p) => [
      p.id,
      computeOutstandingDebtByMonth(
        p,
        data.payments,
        data.currentMonth,
        historyMonths,
        data.getRequiredAmountForMonth
      ),
    ])
  );
  const seasonPlayers = data.participants
    .map((p) => ({
      id: p.id,
      name: p.name,
      active: p.active,
      totalDebt: (outstandingDebtById.get(p.id) ?? []).reduce((sum, row) => sum + row.debt, 0),
    }))
    .filter((p) => p.active || p.totalDebt >= 0.5)
    .sort((a, b) => Number(b.active) - Number(a.active) || a.name.localeCompare(b.name, 'es'));

  const monthClosed = data.isMonthClosed(data.currentMonth);
  const reviewParticipants = getParticipantsForStatusReview(data.participants);
  const pendingReview = getPendingStatusReview(
    data.participants,
    data.currentMonth,
    data.participantMonthlyStatuses
  );
  const reviewKey = `${data.currentTeamId}:${data.currentMonth}`;
  const shouldAutoOpenReview =
    canEdit &&
    pendingReview.length > 0 &&
    !dismissedReviews.has(reviewKey) &&
    isStatusReviewMonth(
      data.currentMonth,
      data.monthlyConfigs.map((cfg) => cfg.month),
      getCurrentMonth()
    );

  const reviewOpen =
    reviewParticipants.length > 0 && (showReviewModal || (shouldAutoOpenReview && !showCloseModal));

  const closeReview = () => {
    setShowReviewModal(false);
    setDismissedReviews((prev) => new Set(prev).add(reviewKey));
  };

  const handleConfirmReview = async (statuses: { participantId: number; status: ParticipantStatus }[]) => {
    setSavingReview(true);
    try {
      const ok = await data.handleSetMonthlyStatuses(statuses);
      if (!ok) return;
      data.addToast(`Estados de ${getMonthName(data.currentMonth)} guardados`, 'success');
      closeReview();
    } finally {
      setSavingReview(false);
    }
  };

  const handleCloseMonth = async (waivedParticipantIds: number[], season?: SeasonDecisions) => {
    if (closingMonth) return;
    const nextMonth = addMonths(data.currentMonth, 1);
    const seasonClose: SeasonClose | undefined = season && {
      deactivateParticipantIds: season.deactivateIds,
      waiveDebt: season.waiveAllDebtIds
        .map((participantId) => ({
          participantId,
          months: (outstandingDebtById.get(participantId) ?? []).map((row) => row.month),
        }))
        .filter((w) => w.months.length > 0),
    };
    setClosingMonth(true);
    try {
      const saved = await data.handleCloseMonth(waivedParticipantIds, seasonClose);
      if (!saved) return;
      setShowCloseModal(false);
      data.setCurrentMonth(nextMonth);
      data.addToast(
        `${seasonClose ? 'Campeonato cerrado' : 'Mes cerrado'}. Ahora estás en ${getMonthName(nextMonth)}.`,
        'success'
      );
    } finally {
      setClosingMonth(false);
    }
  };
  return (
    <div
      style={{
        background: 'var(--bg-primary)',
        padding: '15px',
        borderRadius: '8px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        marginBottom: '20px',
        border: '1px solid var(--border)',
      }}
    >
      <div
        style={{
          fontSize: '12px',
          color: 'var(--text-secondary)',
          fontWeight: '500',
          marginBottom: '8px',
        }}
      >
        📅 Trabajando en
      </div>
      <MonthSelector
        currentMonth={data.currentMonth}
        onMonthChange={data.setCurrentMonth}
      />
      <div style={{ marginTop: '10px', display: 'flex', justifyContent: 'center', gap: '8px', flexWrap: 'wrap' }}>
        {canEdit && !monthClosed && reviewParticipants.length > 0 && (
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => setShowReviewModal(true)}
            title="Revisar jugadores sin trabajo, lesionados o con media cuota en este mes"
          >
            📝 Estados del mes ({reviewParticipants.length})
          </button>
        )}
        <button
          type="button"
          className="btn btn-warning"
          onClick={() => setShowCloseModal(true)}
          disabled={closingMonth}
          title="Congela estados del mes y pasa al siguiente"
        >
          {closingMonth ? 'Cerrando mes...' : '🔒 Cerrar mes y pasar al siguiente'}
        </button>
      </div>
      <div style={{ marginTop: '16px', paddingTop: '12px', borderTop: '1px solid var(--border)' }}>
        <div
          style={{
            fontSize: '12px',
            color: 'var(--text-secondary)',
            fontWeight: '500',
            marginBottom: '8px',
          }}
        >
          📊 Progreso mensual
        </div>
        <MonthlyProgressBar
          payments={data.payments}
          currentMonth={data.currentMonth}
          monthlyObjective={data.monthlyObjective}
          monthlyDebtTotal={monthlyDebtTotal}
        />
      </div>

      {reviewOpen && (
        <MonthStatusReviewModal
          key={reviewKey}
          month={data.currentMonth}
          participants={reviewParticipants}
          saving={savingReview}
          onConfirm={handleConfirmReview}
          onClose={closeReview}
        />
      )}
      {showCloseModal && (
        <CloseMonthModal
          month={data.currentMonth}
          nextMonth={addMonths(data.currentMonth, 1)}
          debtors={monthDebtors}
          seasonPlayers={seasonPlayers}
          closing={closingMonth}
          onConfirm={handleCloseMonth}
          onClose={() => setShowCloseModal(false)}
        />
      )}
    </div>
  );
}
