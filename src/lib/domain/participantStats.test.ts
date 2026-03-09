import { describe, it, expect } from 'vitest';
import { computeParticipantPaymentStats } from './participantStats';
import type { Participant, Payment } from '@/types';

function participant(id: number, active = true): Participant {
  return {
    id,
    teamId: 1,
    name: `P${id}`,
    active,
    joinDate: '2024-01-01',
    createdAt: '',
  };
}

describe('computeParticipantPaymentStats', () => {
  it('calcula paid, required, missing y percentage por participante', () => {
    const participants = [participant(1), participant(2)];
    const payments: Payment[] = [
      { id: 1, teamId: 1, participantId: 1, date: '2024-03-01', amount: 300, recordedAt: '' },
      { id: 2, teamId: 1, participantId: 1, date: '2024-03-15', amount: 200, recordedAt: '' },
    ];
    const getRequiredAmount = () => 500;
    const stats = computeParticipantPaymentStats(
      participants,
      payments,
      '2024-03',
      getRequiredAmount
    );
    expect(stats).toHaveLength(2);
    const p1 = stats.find(s => s.id === 1)!;
    expect(p1.paid).toBe(500);
    expect(p1.required).toBe(500);
    expect(p1.missing).toBe(0);
    expect(p1.percentage).toBe(100);
    const p2 = stats.find(s => s.id === 2)!;
    expect(p2.paid).toBe(0);
    expect(p2.missing).toBe(500);
    expect(p2.percentage).toBe(0);
  });

  it('ordena por paid descendente', () => {
    const participants = [participant(1), participant(2), participant(3)];
    const payments: Payment[] = [
      { id: 1, teamId: 1, participantId: 2, date: '2024-03-01', amount: 1000, recordedAt: '' },
      { id: 2, teamId: 1, participantId: 1, date: '2024-03-01', amount: 100, recordedAt: '' },
    ];
    const getRequiredAmount = () => 500;
    const stats = computeParticipantPaymentStats(
      participants,
      payments,
      '2024-03',
      getRequiredAmount
    );
    expect(stats[0].id).toBe(2);
    expect(stats[1].id).toBe(1);
    expect(stats[2].id).toBe(3);
  });
});
