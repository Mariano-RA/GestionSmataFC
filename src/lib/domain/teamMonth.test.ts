import { describe, it, expect } from 'vitest';
import { computeTeamMonth, type TeamMonthInput } from './teamMonth';
import { buildGroupRemainingToCompleteMessage } from '@/lib/utils/whatsapp';
import type { Participant, Payment } from '@/types';

function jugador(id: number, name: string, over: Partial<Participant> = {}): Participant {
  return { id, teamId: 2, name, active: true, status: 'activo', joinDate: '2026-01-01T12:00:00.000Z', createdAt: '', ...over };
}

function pago(id: number, participantId: number, amount: number, over: Partial<Payment> = {}): Payment {
  return { id, teamId: 2, participantId, date: '2026-11-05', amount, recordedAt: '', ...over };
}

function base(over: Partial<TeamMonthInput> = {}): TeamMonthInput {
  return {
    participants: [],
    payments: [],
    expenses: [],
    monthlyStatuses: [],
    monthlyConfigs: [],
    config: { monthlyTarget: 900, fieldRental: 300 },
    currentMonth: '2026-11',
    ...over,
  };
}

describe('computeTeamMonth', () => {
  it('divide el objetivo entre los jugadores activos', () => {
    const r = computeTeamMonth(base({ participants: [jugador(1, 'ana'), jugador(2, 'beto'), jugador(3, 'carla'), jugador(4, 'dani')] }));
    expect(r.monthlyObjective).toBe(1200);
    expect(r.effectiveParticipants).toBe(4);
    expect(r.monthlyShare).toBe(300);
  });

  it('media cuota y lesionado pesan 0.5 y sin laburo no paga', () => {
    const r = computeTeamMonth(
      base({
        participants: [
          jugador(1, 'ana'),
          jugador(2, 'beto', { status: 'media_cuota' }),
          jugador(3, 'carla', { status: 'lesionado' }),
          jugador(4, 'dani', { status: 'sin_laburo' }),
        ],
        config: { monthlyTarget: 2000, fieldRental: 0 },
      })
    );
    // pesos: 1 + 0.5 + 0.5 + 0 = 2 -> cuota entera 1000
    expect(r.monthlyShare).toBe(1000);
    const porNombre = Object.fromEntries(r.status.map((s) => [s.name, s]));
    expect(porNombre.ana.required).toBe(1000);
    expect(porNombre.beto.required).toBe(500);
    expect(porNombre.carla.required).toBe(500);
    expect(porNombre.dani.required).toBe(0);
  });

  it('calcula lo pagado y la deuda del mes imputando por appliedMonth', () => {
    const r = computeTeamMonth(
      base({
        participants: [jugador(1, 'ana'), jugador(2, 'beto')],
        payments: [pago(1, 1, 400), pago(2, 1, 200, { date: '2026-12-01', appliedMonth: '2026-11' }), pago(3, 2, 600, { appliedMonth: '2026-10' })],
        config: { monthlyTarget: 1200, fieldRental: 0 },
      })
    );
    const ana = r.status.find((s) => s.name === 'ana')!;
    expect(ana.required).toBe(600);
    expect(ana.paid).toBe(600);
    expect(ana.debt).toBe(0);
    const beto = r.status.find((s) => s.name === 'beto')!;
    expect(beto.paid).toBe(0);
    expect(beto.debt).toBe(600);
  });

  it('suma los gastos incluidos del mes al objetivo', () => {
    const r = computeTeamMonth(
      base({
        participants: [jugador(1, 'ana'), jugador(2, 'beto')],
        expenses: [
          { date: '2026-11-10', amount: 200, includeInMonthlyShare: true },
          { date: '2026-11-11', amount: 999, includeInMonthlyShare: false },
          { date: '2026-10-11', amount: 999, includeInMonthlyShare: true },
        ],
        config: { monthlyTarget: 800, fieldRental: 0 },
      })
    );
    expect(r.monthlyObjective).toBe(1000);
    expect(r.monthlyShare).toBe(500);
  });

  it('un jugador dado de alta después del mes no genera cuota en ese mes', () => {
    const r = computeTeamMonth(
      base({
        participants: [jugador(1, 'ana'), jugador(2, 'nuevo', { joinDate: '2026-12-15T12:00:00.000Z' })],
        config: { monthlyTarget: 1000, fieldRental: 0 },
      })
    );
    const nuevo = r.status.find((s) => s.name === 'nuevo');
    expect(nuevo).toBeUndefined();
  });

  it('arrastra deuda de meses anteriores que tienen configuración', () => {
    const r = computeTeamMonth(
      base({
        participants: [jugador(1, 'ana')],
        monthlyConfigs: [
          { month: '2026-10', monthlyTarget: 500, rent: 0, includedExpenses: 0, effectiveParticipants: 1, closedAt: '2026-10-31T00:00:00.000Z' },
        ],
        payments: [pago(1, 1, 200, { date: '2026-10-05' })],
        config: { monthlyTarget: 500, fieldRental: 0 },
      })
    );
    const ana = r.status[0];
    expect(ana.debt).toBe(500);
    expect(ana.previousDebt).toBe(300);
    expect(ana.totalDebt).toBe(800);
    expect(r.isMonthClosed('2026-10')).toBe(true);
    expect(r.isMonthClosed('2026-11')).toBe(false);
  });

  it('el estado elegido para el mes (snapshot) manda sobre el estado del jugador', () => {
    const r = computeTeamMonth(
      base({
        participants: [jugador(1, 'ana'), jugador(2, 'beto')],
        monthlyStatuses: [{ participantId: 2, month: '2026-11', active: true, status: 'sin_laburo', debtWaived: false }],
        config: { monthlyTarget: 1000, fieldRental: 0 },
      })
    );
    expect(r.monthlyShare).toBe(1000);
    expect(r.status.find((s) => s.name === 'beto')!.required).toBe(0);
  });

  it('el mensaje de faltantes lista solo a quienes deben y a los sin trabajo', () => {
    const r = computeTeamMonth(
      base({
        participants: [jugador(1, 'ana lópez'), jugador(2, 'beto'), jugador(3, 'carla', { status: 'sin_laburo' })],
        payments: [pago(1, 1, 500)],
        config: { monthlyTarget: 1000, fieldRental: 0 },
      })
    );
    // pesos: 1 + 1 + 0 = 2 -> cuota 500. Ana ya pagó, Beto debe, Carla sin laburo.
    const mensaje = buildGroupRemainingToCompleteMessage(r.status, '2026-11', r.monthlyShare);
    const lineas = mensaje.split('\n');
    expect(lineas[0]).toContain('Cuota: $500');
    expect(lineas).toContain('Beto: $500');
    expect(lineas).toContain('Carla (sin trabajo)');
    expect(mensaje).not.toContain('Ana');
  });
});
