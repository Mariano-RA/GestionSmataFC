import { describe, it, expect } from 'vitest';
import {
  computeParticipantsWithDebtStatus,
  filterDebtorsByType,
  type ParticipantWithDebtStatus,
} from './debt';
import type { Participant, Payment } from '@/types';

function participant(overrides: Partial<Participant> = {}): Participant {
  return {
    id: 1,
    teamId: 1,
    name: 'Test',
    active: true,
    joinDate: '2024-01-01',
    createdAt: '',
    ...overrides,
  };
}

function payment(overrides: Partial<Payment> = {}): Payment {
  return {
    id: 1,
    teamId: 1,
    participantId: 1,
    date: '2024-03-15',
    amount: 1000,
    recordedAt: '',
    ...overrides,
  };
}

describe('computeParticipantsWithDebtStatus', () => {
  it('calcula deuda del mes cuando no hay pagos', () => {
    const participants = [participant({ id: 1, active: true })];
    const payments: Payment[] = [];
    const getRequiredAmount = () => 500;
    const result = computeParticipantsWithDebtStatus(
      participants,
      payments,
      '2024-03',
      getRequiredAmount
    );
    expect(result).toHaveLength(1);
    expect(result[0].required).toBe(500);
    expect(result[0].paid).toBe(0);
    expect(result[0].debt).toBe(500);
  });

  it('reduce deuda cuando hay pago en el mes', () => {
    const participants = [participant({ id: 1, active: true })];
    const payments = [payment({ participantId: 1, date: '2024-03-10', amount: 300 })];
    const getRequiredAmount = () => 500;
    const result = computeParticipantsWithDebtStatus(
      participants,
      payments,
      '2024-03',
      getRequiredAmount
    );
    expect(result[0].paid).toBe(300);
    expect(result[0].debt).toBe(200);
  });

  it('excluye participantes inactivos', () => {
    const participants = [
      participant({ id: 1, active: true }),
      participant({ id: 2, active: false }),
    ];
    const payments: Payment[] = [];
    const getRequiredAmount = (p: Participant) => (p.active ? 500 : 0);
    const result = computeParticipantsWithDebtStatus(
      participants,
      payments,
      '2024-03',
      getRequiredAmount
    );
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(1);
  });
});

describe('filterDebtorsByType', () => {
  const withDebt: ParticipantWithDebtStatus = {
    ...participant({ id: 1 }),
    required: 500,
    paid: 200,
    debt: 300,
    previousDebt: 0,
    totalDebt: 300,
    paymentHistory: [],
  };
  const withNoDebt: ParticipantWithDebtStatus = {
    ...participant({ id: 2 }),
    required: 500,
    paid: 500,
    debt: 0,
    previousDebt: 0,
    totalDebt: 0,
    paymentHistory: [],
  };

  it('"all" devuelve solo los que tienen deuda', () => {
    const all = [withDebt, withNoDebt];
    const filtered = filterDebtorsByType(all, 'all');
    expect(filtered).toHaveLength(1);
    expect(filtered[0].id).toBe(1);
  });

  it('"completed" devuelve los que no tienen deuda', () => {
    const all = [withDebt, withNoDebt];
    const filtered = filterDebtorsByType(all, 'completed');
    expect(filtered).toHaveLength(1);
    expect(filtered[0].id).toBe(2);
  });
});
