import { describe, it, expect } from 'vitest';
import {
  buildDebtMatrixMonths,
  computeParticipantDebtMatrixRow,
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

  it('incluye activos sin trabajo aunque required y paid sean 0', () => {
    const participants = [
      participant({ id: 1, active: true, status: 'sin_laburo', name: 'Juan' }),
    ];
    const payments: Payment[] = [];
    const getRequiredAmount = () => 0;
    const result = computeParticipantsWithDebtStatus(
      participants,
      payments,
      '2024-03',
      getRequiredAmount
    );
    expect(result).toHaveLength(1);
    expect(result[0].status).toBe('sin_laburo');
    expect(result[0].debt).toBe(0);
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

describe('buildDebtMatrixMonths', () => {
  it('devuelve 5 meses: cuatro anteriores y el mes actual', () => {
    const months = buildDebtMatrixMonths('2026-05');
    expect(months).toEqual(['2026-01', '2026-02', '2026-03', '2026-04', '2026-05']);
  });
});

describe('computeParticipantDebtMatrixRow', () => {
  it('coincide con la deuda del mes del historial (faltante = requerido - pagado)', () => {
    const p = participant({ id: 1 });
    const payments: Payment[] = [
      payment({ participantId: 1, date: '2026-03-10', amount: 400, appliedMonth: '2026-03' }),
    ];
    const matrixMonths = buildDebtMatrixMonths('2026-05');
    const getRequired = () => 1000;
    const row = computeParticipantDebtMatrixRow(p, payments, matrixMonths, () => getRequired());
    const mar = row.find((r) => r.month === '2026-03');
    expect(mar?.paid).toBe(400);
    expect(mar?.required).toBe(1000);
    expect(mar?.debtMonth).toBe(600);
  });
});
