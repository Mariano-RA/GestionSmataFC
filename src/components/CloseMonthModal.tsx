'use client';

import { useState } from 'react';
import { formatCurrency, getMonthName, normalizeName } from '@/lib/utils';

interface MonthDebtor {
  id: number;
  name: string;
  /** Deuda del mes que se cierra. */
  debt: number;
  /** Deuda acumulada (incluye el mes). */
  totalDebt: number;
}

interface SeasonPlayer {
  id: number;
  name: string;
  active: boolean;
  /** Deuda acumulada hasta el mes que se cierra (incluido). */
  totalDebt: number;
}

export interface SeasonDecisions {
  /** Jugadores que no siguen: se deshabilitan. */
  deactivateIds: number[];
  /** Jugadores a los que se les condona toda la deuda acumulada. */
  waiveAllDebtIds: number[];
}

interface CloseMonthModalProps {
  month: string;
  nextMonth: string;
  debtors: MonthDebtor[];
  /** Jugadores para el cierre de campeonato: habilitados + deshabilitados que todavía deben. */
  seasonPlayers: SeasonPlayer[];
  closing: boolean;
  onConfirm: (waivedParticipantIds: number[], season?: SeasonDecisions) => void;
  onClose: () => void;
}

const selectStyle = { width: 'auto', minWidth: '130px', background: 'var(--bg-primary)', color: 'var(--text)' };
const rowStyle = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: '12px',
  padding: '8px 0',
  borderBottom: '1px solid var(--border)',
  flexWrap: 'wrap' as const,
};

/**
 * Cierre de mes: por cada jugador que todavía debe el mes se elige mantener la deuda
 * o condonarla (no cuenta como pago, solo deja de exigirse).
 * Si es el último mes del campeonato, por jugador se elige si sigue y si arrastra o condona toda su deuda.
 */
export default function CloseMonthModal({
  month,
  nextMonth,
  debtors,
  seasonPlayers,
  closing,
  onConfirm,
  onClose,
}: CloseMonthModalProps) {
  const [waived, setWaived] = useState<Set<number>>(new Set());
  const [seasonEnd, setSeasonEnd] = useState(false);
  const [leaving, setLeaving] = useState<Set<number>>(new Set());
  const [waiveAll, setWaiveAll] = useState<Set<number>>(new Set());

  const setInSet = (setter: typeof setWaived, id: number, value: boolean) =>
    setter((prev) => {
      const next = new Set(prev);
      if (value) next.add(id);
      else next.delete(id);
      return next;
    });

  const setAll = (waive: boolean) => setWaived(waive ? new Set(debtors.map((d) => d.id)) : new Set());

  const setLeavingPlayer = (id: number, leaves: boolean) => {
    setInSet(setLeaving, id, leaves);
    // Por defecto, a los que no siguen se les condona la deuda (se puede cambiar).
    setInSet(setWaiveAll, id, leaves);
  };

  const handleConfirm = () => {
    if (!seasonEnd) {
      onConfirm(Array.from(waived));
      return;
    }
    const withDebt = new Set(seasonPlayers.filter((p) => p.totalDebt > 0).map((p) => p.id));
    onConfirm([], {
      deactivateIds: Array.from(leaving),
      waiveAllDebtIds: Array.from(waiveAll).filter((id) => withDebt.has(id)),
    });
  };

  const keptTotal = debtors.filter((d) => !waived.has(d.id)).reduce((s, d) => s + d.debt, 0);
  const waivedTotal = debtors.filter((d) => waived.has(d.id)).reduce((s, d) => s + d.debt, 0);
  const seasonCarried = seasonPlayers.filter((p) => !waiveAll.has(p.id)).reduce((s, p) => s + p.totalDebt, 0);
  const seasonWaived = seasonPlayers.filter((p) => waiveAll.has(p.id)).reduce((s, p) => s + p.totalDebt, 0);

  return (
    <div className="modal active" onClick={closing ? undefined : onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <button className="close-btn" onClick={onClose} disabled={closing}>&times;</button>
        <h2>Cerrar {getMonthName(month)}</h2>
        <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '12px' }}>
          Se congelan los estados del mes y se pasa a {getMonthName(nextMonth)}.
        </p>

        <label
          style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600, fontSize: '14px', marginBottom: '16px', cursor: 'pointer' }}
        >
          <input
            type="checkbox"
            checked={seasonEnd}
            onChange={(e) => setSeasonEnd(e.target.checked)}
            disabled={closing}
            style={{ width: 'auto' }}
          />
          🏁 Último mes del campeonato
        </label>

        {seasonEnd ? (
          <>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '10px' }}>
              Elegí quién sigue en el próximo campeonato y qué pasa con su deuda acumulada.
              Los que no siguen se deshabilitan. Condonar no cuenta como pago.
            </p>
            {seasonPlayers.map((p) => (
              <div key={p.id} style={rowStyle}>
                <div style={{ minWidth: '120px' }}>
                  <div style={{ fontWeight: 600 }}>{normalizeName(p.name)}</div>
                  <div style={{ fontSize: '12px', color: p.totalDebt > 0 ? 'var(--danger)' : 'var(--text-secondary)' }}>
                    {p.totalDebt > 0 ? `Debe ${formatCurrency(p.totalDebt)}` : 'Sin deuda'}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  {p.active ? (
                    <select
                      value={leaving.has(p.id) ? 'leaves' : 'stays'}
                      onChange={(e) => setLeavingPlayer(p.id, e.target.value === 'leaves')}
                      style={selectStyle}
                      disabled={closing}
                    >
                      <option value="stays">Sigue</option>
                      <option value="leaves">No sigue</option>
                    </select>
                  ) : (
                    <span style={{ fontSize: '12px', color: 'var(--text-secondary)', alignSelf: 'center' }}>
                      Deshabilitado
                    </span>
                  )}
                  {p.totalDebt > 0 && (
                    <select
                      value={waiveAll.has(p.id) ? 'waive' : 'carry'}
                      onChange={(e) => setInSet(setWaiveAll, p.id, e.target.value === 'waive')}
                      style={selectStyle}
                      disabled={closing}
                    >
                      <option value="carry">Arrastrar deuda</option>
                      <option value="waive">Condonar deuda</option>
                    </select>
                  )}
                </div>
              </div>
            ))}
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '12px' }}>
              {leaving.size > 0 && `${leaving.size} no siguen. `}
              Se arrastra {formatCurrency(seasonCarried)} de deuda.
              {seasonWaived > 0 && ` Se condonan ${formatCurrency(seasonWaived)}.`}
            </p>
          </>
        ) : debtors.length === 0 ? (
          <p style={{ textAlign: 'center', marginBottom: '16px' }}>✅ Nadie debe el mes.</p>
        ) : (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <strong style={{ fontSize: '14px' }}>Deben el mes ({debtors.length})</strong>
              <div style={{ display: 'flex', gap: '6px' }}>
                <button type="button" className="btn btn-secondary btn-sm" style={{ width: 'auto' }} onClick={() => setAll(false)} disabled={closing}>
                  Mantener todas
                </button>
                <button type="button" className="btn btn-secondary btn-sm" style={{ width: 'auto' }} onClick={() => setAll(true)} disabled={closing}>
                  Condonar todas
                </button>
              </div>
            </div>
            {debtors.map((d) => (
              <div key={d.id} style={rowStyle}>
                <div>
                  <div style={{ fontWeight: 600 }}>{normalizeName(d.name)}</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                    Debe {formatCurrency(d.debt)} del mes
                    {d.totalDebt > d.debt + 0.5 && ` · ${formatCurrency(d.totalDebt)} acumulado`}
                  </div>
                </div>
                <select
                  value={waived.has(d.id) ? 'waive' : 'keep'}
                  onChange={(e) => setInSet(setWaived, d.id, e.target.value === 'waive')}
                  style={selectStyle}
                  disabled={closing}
                >
                  <option value="keep">Mantener deuda</option>
                  <option value="waive">Condonar</option>
                </select>
              </div>
            ))}
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '12px' }}>
              Se mantiene {formatCurrency(keptTotal)} como deuda.
              {waivedTotal > 0 && ` Se condonan ${formatCurrency(waivedTotal)} (no cuenta como pago).`}
            </p>
          </>
        )}

        <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
          <button type="button" className="btn btn-secondary" onClick={onClose} disabled={closing}>
            Cancelar
          </button>
          <button type="button" className="btn btn-warning" onClick={handleConfirm} disabled={closing}>
            {closing ? 'Cerrando...' : seasonEnd ? '🏁 Cerrar campeonato' : '🔒 Cerrar mes'}
          </button>
        </div>
      </div>
    </div>
  );
}
