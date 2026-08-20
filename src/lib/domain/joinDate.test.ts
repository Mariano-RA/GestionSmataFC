import { describe, it, expect } from 'vitest';
import { getJoinMonthLocal, shouldChargeForMonth } from './joinDate';

describe('getJoinMonthLocal', () => {
  it('usa el mes local del Date', () => {
    expect(getJoinMonthLocal(new Date(2026, 7, 15))).toBe('2026-08');
  });

  it('parsea ISO y usa calendario local', () => {
    const iso = new Date(2026, 7, 1, 0, 0, 0, 0).toISOString();
    expect(getJoinMonthLocal(iso)).toBe('2026-08');
  });
});

describe('shouldChargeForMonth', () => {
  const joinIso = new Date(2026, 7, 20, 12, 0, 0, 0).toISOString();

  it('no cobra meses anteriores al alta', () => {
    expect(shouldChargeForMonth(joinIso, '2026-07')).toBe(false);
    expect(shouldChargeForMonth(joinIso, '2026-01')).toBe(false);
  });

  it('cobra el mes de alta y siguientes', () => {
    expect(shouldChargeForMonth(joinIso, '2026-08')).toBe(true);
    expect(shouldChargeForMonth(joinIso, '2026-09')).toBe(true);
  });

  it('acepta Date además de string', () => {
    expect(shouldChargeForMonth(new Date(2026, 7, 5), '2026-07')).toBe(false);
    expect(shouldChargeForMonth(new Date(2026, 7, 5), '2026-08')).toBe(true);
  });
});
