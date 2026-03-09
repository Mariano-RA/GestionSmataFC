'use client';

import { useState, useRef, useEffect } from 'react';
import { addMonths, getMonthName, getCurrentMonth } from '@/lib/utils';

interface MonthSelectorProps {
  currentMonth: string;
  onMonthChange: (newMonth: string) => void;
  /** Cantidad de meses hacia atrás desde el mes actual para el listado */
  monthsBack?: number;
  /** Cantidad de meses hacia adelante desde el mes actual para el listado */
  monthsAhead?: number;
}

export default function MonthSelector({
  currentMonth,
  onMonthChange,
  monthsBack = 12,
  monthsAhead = 3,
}: MonthSelectorProps) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const today = getCurrentMonth();
  const isViewingCurrentMonth = currentMonth === today;

  const availableMonths = (() => {
    const list: string[] = [];
    for (let i = -monthsBack; i <= monthsAhead; i++) {
      list.push(addMonths(today, i));
    }
    return list.sort();
  })();

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handlePrev = () => onMonthChange(addMonths(currentMonth, -1));
  const handleNext = () => onMonthChange(addMonths(currentMonth, 1));
  const handleSelectMonth = (month: string) => {
    onMonthChange(month);
    setDropdownOpen(false);
  };
  const goToCurrentMonth = () => {
    onMonthChange(today);
    setDropdownOpen(false);
  };

  return (
    <div
      ref={containerRef}
      className="month-selector"
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        gap: '8px',
        justifyContent: 'center',
      }}
    >
      <button
        type="button"
        className="btn-secondary btn-sm"
        onClick={handlePrev}
        title="Mes anterior"
        aria-label="Mes anterior"
      >
        ◀
      </button>

      <div style={{ position: 'relative' }}>
        <button
          type="button"
          className="month-selector-trigger"
          onClick={() => setDropdownOpen(prev => !prev)}
          title="Elegir otro mes"
          aria-haspopup="listbox"
          aria-expanded={dropdownOpen}
          aria-label={`Mes seleccionado: ${getMonthName(currentMonth)}`}
          style={{
            padding: '8px 14px',
            minWidth: '180px',
            borderRadius: '8px',
            border: '1px solid var(--border)',
            background: 'var(--bg-primary)',
            color: 'var(--text)',
            fontWeight: 600,
            fontSize: '14px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '8px',
            boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
          }}
        >
          <span>{getMonthName(currentMonth)}</span>
          <span style={{ opacity: 0.7, fontSize: '10px' }}>▼</span>
        </button>

        {dropdownOpen && (
          <ul
            role="listbox"
            aria-label="Seleccionar mes"
            style={{
              position: 'absolute',
              top: '100%',
              left: '50%',
              transform: 'translateX(-50%)',
              marginTop: '4px',
              padding: '6px 0',
              minWidth: '200px',
              maxHeight: '280px',
              overflowY: 'auto',
              listStyle: 'none',
              background: 'var(--bg-primary)',
              border: '1px solid var(--border)',
              borderRadius: '8px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
              zIndex: 100,
            }}
          >
            {availableMonths.map(month => (
              <li key={month} role="option" aria-selected={month === currentMonth}>
                <button
                  type="button"
                  onClick={() => handleSelectMonth(month)}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    border: 'none',
                    background: month === currentMonth ? 'var(--secondary)' : 'transparent',
                    color: month === currentMonth ? 'var(--primary)' : 'var(--text)',
                    fontWeight: month === currentMonth ? 700 : 500,
                    fontSize: '13px',
                    textAlign: 'left',
                    cursor: 'pointer',
                  }}
                  onMouseEnter={e => {
                    if (month !== currentMonth) {
                      e.currentTarget.style.background = 'var(--bg-secondary)';
                    }
                  }}
                  onMouseLeave={e => {
                    if (month !== currentMonth) {
                      e.currentTarget.style.background = 'transparent';
                    }
                  }}
                >
                  {getMonthName(month)}
                  {month === today && ' (actual)'}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <button
        type="button"
        className="btn-secondary btn-sm"
        onClick={handleNext}
        title="Mes siguiente"
        aria-label="Mes siguiente"
      >
        ▶
      </button>

      {!isViewingCurrentMonth && (
        <button
          type="button"
          className="btn-secondary btn-sm"
          onClick={goToCurrentMonth}
          title="Ir al mes actual"
          style={{ marginLeft: '4px' }}
        >
          Ir a mes actual
        </button>
      )}
    </div>
  );
}
