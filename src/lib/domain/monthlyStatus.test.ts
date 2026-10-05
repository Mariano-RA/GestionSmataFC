import { describe, it, expect } from 'vitest';
import {
  getStatusWeight,
  resolveMonthlyState,
  getParticipantsForStatusReview,
  getPendingStatusReview,
  isStatusReviewMonth,
} from './monthlyStatus';

describe('getStatusWeight', () => {
  it('pondera cada estado', () => {
    expect(getStatusWeight('activo')).toBe(1);
    expect(getStatusWeight(null)).toBe(1);
    expect(getStatusWeight('lesionado')).toBe(0.5);
    expect(getStatusWeight('media_cuota')).toBe(0.5);
    expect(getStatusWeight('sin_laburo')).toBe(0);
  });
});

describe('resolveMonthlyState', () => {
  const participant = { active: true, status: 'lesionado' };

  it('sin snapshot arrastra el último estado del jugador', () => {
    expect(resolveMonthlyState(participant, undefined, false)).toEqual({
      active: true,
      status: 'lesionado',
      debtWaived: false,
    });
  });

  it('el snapshot del mes manda sobre el estado del jugador', () => {
    const snap = { participantId: 1, month: '2026-10', active: true, status: 'media_cuota' };
    expect(resolveMonthlyState(participant, snap, false).status).toBe('media_cuota');
  });

  it('en mes abierto, habilitado/deshabilitado sale del jugador', () => {
    const snap = { participantId: 1, month: '2026-10', active: true, status: 'activo' };
    expect(resolveMonthlyState({ active: false, status: 'activo' }, snap, false).active).toBe(false);
  });

  it('en mes cerrado, habilitado/deshabilitado sale del snapshot', () => {
    const snap = { participantId: 1, month: '2026-09', active: false, status: 'activo' };
    expect(resolveMonthlyState({ active: true, status: 'activo' }, snap, true).active).toBe(false);
  });

  it('expone la condonación de deuda', () => {
    const snap = { participantId: 1, month: '2026-09', active: true, status: 'activo', debtWaived: true };
    expect(resolveMonthlyState(participant, snap, true).debtWaived).toBe(true);
  });
});

describe('revisión de estados', () => {
  const participants = [
    { id: 1, active: true, status: 'activo' },
    { id: 2, active: true, status: 'lesionado' },
    { id: 3, active: true, status: 'sin_laburo' },
    { id: 4, active: false, status: 'media_cuota' },
    { id: 5, active: true, status: 'media_cuota' },
  ];

  it('incluye habilitados no activos y excluye deshabilitados', () => {
    expect(getParticipantsForStatusReview(participants).map((p) => p.id)).toEqual([2, 3, 5]);
  });

  it('pendientes son los que no tienen snapshot en el mes', () => {
    const snapshots = [
      { participantId: 2, month: '2026-10', active: true, status: 'lesionado' },
      { participantId: 3, month: '2026-09', active: true, status: 'sin_laburo' },
    ];
    expect(getPendingStatusReview(participants, '2026-10', snapshots).map((p) => p.id)).toEqual([3, 5]);
  });
});

describe('isStatusReviewMonth', () => {
  it('mes calendario abierto', () => {
    expect(isStatusReviewMonth('2026-10', ['2026-09'], '2026-10')).toBe(true);
  });

  it('mes siguiente al último cerrado aunque no sea el calendario', () => {
    expect(isStatusReviewMonth('2026-11', ['2026-09', '2026-10'], '2026-10')).toBe(true);
  });

  it('meses cerrados nunca', () => {
    expect(isStatusReviewMonth('2026-10', ['2026-10'], '2026-10')).toBe(false);
  });

  it('meses futuros sueltos no', () => {
    expect(isStatusReviewMonth('2027-01', ['2026-09'], '2026-10')).toBe(false);
  });
});
