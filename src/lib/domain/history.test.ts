import { describe, it, expect } from 'vitest';
import { computeMonthlyHistory, computeTeamMonthlyHistory } from './history';
import type { Participant, Payment } from '@/types';

function p(id: number): Participant {
  return {
    id,
    teamId: 1,
    name: `P${id}`,
    active: true,
    joinDate: '2024-01-01',
    createdAt: '',
  };
}

describe('computeTeamMonthlyHistory', () => {
  it('agrega recaudado y deudas por mes', () => {
    const participants = [p(1), p(2)];
    const payments: Payment[] = [
      { id: 1, teamId: 1, participantId: 1, date: '2024-01-05', amount: 50, recordedAt: '' },
      { id: 2, teamId: 1, participantId: 2, date: '2024-01-10', amount: 100, recordedAt: '' },
      { id: 3, teamId: 1, participantId: 1, date: '2024-02-05', amount: 50, recordedAt: '' },
      { id: 4, teamId: 1, participantId: 2, date: '2024-02-10', amount: 100, recordedAt: '' },
    ];
    const getRequired = (participant: Participant, month: string) => {
      void month;
      return participant.id === 1 || participant.id === 2 ? 100 : 0;
    };
    const rows = computeTeamMonthlyHistory(participants, payments, ['2024-01', '2024-02'], getRequired, '2024-01');
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({
      month: '2024-01',
      collected: 150,
      debtMonth: 50,
      debtAccumulated: 50,
    });
    expect(rows[1]).toMatchObject({
      month: '2024-02',
      collected: 150,
      debtMonth: 50,
      debtAccumulated: 100,
    });
  });

  it('devuelve array vacío si no hay meses', () => {
    expect(computeTeamMonthlyHistory([], [], [], () => 0, '2024-01')).toEqual([]);
  });

  it('pone en cero meses anteriores al inicio operativo', () => {
    const participants = [p(1)];
    const payments: Payment[] = [
      { id: 1, teamId: 1, participantId: 1, date: '2024-01-05', amount: 999, recordedAt: '' },
      { id: 2, teamId: 1, participantId: 1, date: '2024-02-05', amount: 50, recordedAt: '' },
    ];
    const getRequired = () => 100;
    const rows = computeTeamMonthlyHistory(participants, payments, ['2024-01', '2024-02'], getRequired, '2024-02');
    expect(rows[0]).toMatchObject({ month: '2024-01', collected: 0, debtMonth: 0, debtAccumulated: 0 });
    expect(rows[1].month).toBe('2024-02');
    expect(rows[1].collected).toBe(50);
  });
});

describe('computeMonthlyHistory', () => {
  it('acumula deuda mes a mes', () => {
    const payments: Payment[] = [
      { id: 1, teamId: 1, participantId: 1, date: '2024-01-05', amount: 40, recordedAt: '' },
      { id: 2, teamId: 1, participantId: 1, date: '2024-02-05', amount: 30, recordedAt: '' },
    ];
    const rows = computeMonthlyHistory(payments, ['2024-01', '2024-02'], () => 100);
    expect(rows[0].debtAccumulated).toBe(60);
    expect(rows[1].debtAccumulated).toBe(130);
  });
});
