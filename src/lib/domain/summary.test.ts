import { describe, it, expect } from 'vitest';
import { computeMonthlySummary, computeMonthComparison } from './summary';
import type { Participant, Payment, Expense, AppConfig } from '@/types';

const defaultConfig: AppConfig = {
  monthlyTarget: 1000,
  fieldRental: 500,
  maxParticipants: 25,
  notes: '',
  expenseCategories: [],
};

function participant(id: number): Participant {
  return {
    id,
    teamId: 1,
    name: `P${id}`,
    active: true,
    joinDate: '2024-01-01',
    createdAt: '',
  };
}

describe('computeMonthlySummary', () => {
  it('calcula recaudado y progreso con pagos del mes', () => {
    const participants = [participant(1)];
    const payments: Payment[] = [
      { id: 1, teamId: 1, participantId: 1, date: '2024-03-05', amount: 400, recordedAt: '' },
      { id: 2, teamId: 1, participantId: 1, date: '2024-03-10', amount: 600, recordedAt: '' },
    ];
    const expenses: Expense[] = [];
    const getRequiredAmount = () => 1500; // monthlyObjective / 1 = 1500
    const summary = computeMonthlySummary(
      participants,
      payments,
      expenses,
      '2024-03',
      defaultConfig,
      getRequiredAmount
    );
    expect(summary.collected).toBe(1000);
    expect(summary.monthlyObjective).toBe(1500);
    expect(summary.progress).toBeCloseTo((1000 / 1500) * 100);
    expect(summary.totalDebt).toBe(500);
  });

  it('incluye gastos del mes en totalCosts', () => {
    const participants = [participant(1)];
    const payments: Payment[] = [];
    const expenses: Expense[] = [
      { id: 1, teamId: 1, name: 'Arbitraje', amount: 200, date: '2024-03-01', category: 'Arbitraje', recordedAt: '' },
    ];
    const getRequiredAmount = () => 0;
    const summary = computeMonthlySummary(
      participants,
      payments,
      expenses,
      '2024-03',
      defaultConfig,
      getRequiredAmount
    );
    expect(summary.recordedExpenses).toBe(200);
    expect(summary.totalCosts).toBe(200 + defaultConfig.monthlyTarget + defaultConfig.fieldRental);
  });
});

describe('computeMonthComparison', () => {
  it('suma solo pagos y gastos del mes indicado', () => {
    const payments: Payment[] = [
      { id: 1, teamId: 1, participantId: 1, date: '2024-03-01', amount: 100, recordedAt: '' },
      { id: 2, teamId: 1, participantId: 1, date: '2024-04-01', amount: 200, recordedAt: '' },
    ];
    const expenses: Expense[] = [
      { id: 1, teamId: 1, name: 'X', amount: 50, date: '2024-03-15', category: 'Otros', recordedAt: '' },
    ];
    const mar = computeMonthComparison(payments, expenses, '2024-03');
    expect(mar.collected).toBe(100);
    expect(mar.totalExpenses).toBe(50);
    expect(mar.profit).toBe(50);
    expect(mar.paymentCount).toBe(1);
    expect(mar.expenseCount).toBe(1);
  });
});
