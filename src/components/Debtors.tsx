'use client';

import { useState } from 'react';
import { formatCurrency, getMonthName, normalizeName } from '@/lib/utils';
import type { Participant, Payment } from '@/types';

interface DebtorsProps {
  participants: Participant[];
  payments: Payment[];
  monthlyShare: number;
  currentMonth: string;
  addToast: (message: string, type: 'success' | 'error' | 'info') => void;
}

export default function Debtors({
  participants,
  payments,
  monthlyShare,
  currentMonth,
  addToast
}: DebtorsProps) {
  const [filterType, setFilterType] = useState('all');
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const allParticipantsStatus = participants
    .filter(p => p.active)
    .map(p => {
      const participantPayments = payments.filter(pay => pay.participantId === p.id);
      const paidThisMonth = participantPayments
        .filter(pay => pay.date.startsWith(currentMonth))
        .reduce((sum, pay) => sum + pay.amount, 0);

      const monthPayments = participantPayments
        .filter(pay => pay.date.startsWith(currentMonth))
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      const debtThisMonth = Math.max(0, monthlyShare - paidThisMonth);

      const monthsWithActivity = new Set(participantPayments.map(pay => pay.date.slice(0, 7)));
      monthsWithActivity.add(currentMonth);
      const allMonths = Array.from(monthsWithActivity).sort();
      let totalDebt = 0;
      allMonths.forEach(month => {
        const paidInMonth = participantPayments
          .filter(pay => pay.date.startsWith(month))
          .reduce((sum, pay) => sum + pay.amount, 0);
        totalDebt += Math.max(0, monthlyShare - paidInMonth);
      });
      const previousDebt = Math.max(0, totalDebt - debtThisMonth);

      return {
        ...p,
        paid: paidThisMonth,
        debt: debtThisMonth,
        previousDebt,
        totalDebt,
        paymentHistory: monthPayments
      };
    })
    .sort((a, b) => b.debt - a.debt);

  const debtors = allParticipantsStatus.filter(p => p.debt > 0);

  let filtered = debtors;
  if (filterType === 'high') {
    filtered = debtors.filter(p => p.debt > monthlyShare * 0.5);
  } else if (filterType === 'medium') {
    filtered = debtors.filter(p => p.debt > 0 && p.debt <= monthlyShare * 0.5);
  } else if (filterType === 'completed') {
    filtered = allParticipantsStatus.filter(p => p.debt === 0);
  }

  const normalizePhoneForWhatsApp = (phone: string | null | undefined): string | null => {
    if (!phone || !phone.trim()) return null;
    const digits = phone.replace(/\D/g, '');
    if (digits.length < 8) return null;
    if (digits.startsWith('54') && digits.length >= 12) return digits;
    if (digits.length === 10 && digits.startsWith('9')) return '54' + digits;
    if (digits.length === 11 && digits.startsWith('15')) return '54' + '9' + digits.slice(2);
    return digits;
  };

  const openWhatsAppForDebtor = (
    phone: string | null | undefined,
    name: string,
    debtThisMonth: number,
    previousDebt: number
  ) => {
    const monthName = getMonthName(currentMonth);
    const totalDebt = debtThisMonth + previousDebt;
    let message = `Hola ${normalizeName(name)}, te recuerdo que tenés una cuota pendiente de ${formatCurrency(debtThisMonth)} correspondiente al mes de ${monthName}.`;
    if (previousDebt > 0) {
      message += ` Además tenés una deuda anterior de ${formatCurrency(previousDebt)}, lo que hace un total de ${formatCurrency(totalDebt)}.`;
    }
    message += ' ¡Gracias!';
    const encoded = encodeURIComponent(message);
    const waNumber = normalizePhoneForWhatsApp(phone);
    if (waNumber) {
      window.open(`https://wa.me/${waNumber}?text=${encoded}`, '_blank', 'noopener,noreferrer');
    } else {
      addToast('Este jugador no tiene número cargado. Agregalo en Participantes.', 'error');
    }
  };

  return (
    <div className="tab-content">
      <div style={{ marginBottom: '10px', display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
        <button
          className={`filter-btn ${filterType === 'all' ? 'active' : ''}`}
          onClick={() => setFilterType('all')}
        >
          Pendientes ({debtors.length})
        </button>
        <button
          className={`filter-btn ${filterType === 'high' ? 'active' : ''}`}
          onClick={() => setFilterType('high')}
        >
          Crítico ({'>'} 50%)
        </button>
        <button
          className={`filter-btn ${filterType === 'medium' ? 'active' : ''}`}
          onClick={() => setFilterType('medium')}
        >
          Parcial ({'<'} 50%)
        </button>
        <button
          className={`filter-btn ${filterType === 'completed' ? 'active' : ''}`}
          onClick={() => setFilterType('completed')}
        >
          Completos ✅
        </button>
      </div>

      <div id="debtorsList">
        {participants.length > 0 && (
          <button
            className="btn btn-warning"
            style={{ width: '100%', marginBottom: '12px', background: '#FFD700', color: '#000' }}
            onClick={() => {
              const msg =
                `Saldos ${currentMonth} - ${formatCurrency(monthlyShare)}\n` +
                allParticipantsStatus
                  .map(p => {
                    if (p.paid > 0) {
                      return `${normalizeName(p.name)}: ${formatCurrency(p.paid)}`;
                    } else {
                      return `${normalizeName(p.name)} `;
                    }
                  })
                  .join('\n');
              navigator.clipboard.writeText(msg);
              addToast('Mensaje copiado al portapapeles', 'success');
            }}
          >
            📋 Copiar Estado para WhatsApp
          </button>
        )}
        {filtered.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">{filterType === 'completed' ? '✅' : '🎉'}</div>
            <p>{filterType === 'completed' ? 'Todos completaron el pago' : '¡Sin deudas!'}</p>
          </div>
        ) : (
          filtered.map(p => {
            const percentage = (p.paid / monthlyShare) * 100;
            const debtClass = p.debt > monthlyShare * 0.5 ? 'high-debt' : 'partial-debt';
            
            return (
              <div key={p.id}>
                <div 
                  className={`list-item ${debtClass}`}
                  style={{ cursor: 'pointer' }}
                  onClick={() => setExpandedId(expandedId === p.id ? null : p.id)}
                >
                  <div>
                    <strong>{normalizeName(p.name)}</strong>
                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                      <span>{formatCurrency(p.paid)}</span>
                      <span style={{ margin: '0 6px' }}>/</span>
                      <span>{formatCurrency(monthlyShare)}</span>
                      <span style={{ marginLeft: '8px', color: 'var(--text)' }}>({Math.round(percentage)}%)</span>
                    </div>
                  </div>
                  <span className="debtors-amount" style={{ fontSize: '14px' }}>{formatCurrency(p.debt)}</span>
                </div>
                {p.debt > 0 && (
                  <div style={{ marginBottom: '8px', marginLeft: '4px' }}>
                    <button
                      type="button"
                      className="btn btn-sm"
                      style={{ fontSize: '12px', background: '#25D366', color: '#fff', border: 'none' }}
                      onClick={(e) => { e.stopPropagation(); openWhatsAppForDebtor(p.phone, p.name, p.debt, p.previousDebt); }}
                    >
                      📲 Avisar por WhatsApp
                    </button>
                  </div>
                )}
                {/* Historial expandible */}
                {expandedId === p.id && p.paymentHistory.length > 0 && (
                  <div style={{ padding: '10px 12px', background: 'var(--bg-secondary)', marginBottom: '8px', borderRadius: '4px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                    <p style={{ fontWeight: '600', marginBottom: '6px', color: 'var(--text)' }}>📜 Historial de pagos:</p>
                    {p.paymentHistory.map(pay => (
                      <div key={pay.id} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                        <span>{new Date(pay.date).toLocaleDateString('es-AR')}</span>
                        <span style={{ color: 'var(--success)', fontWeight: '600' }}>{formatCurrency(pay.amount)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {debtors.length > 0 && (
        <div className="total-row" style={{ marginTop: '15px' }}>
          <span>Deuda Total {filterType !== 'all' && `(${filterType}):`}</span>
          <span>{formatCurrency(
            filterType === 'all' 
              ? debtors.reduce((sum, p) => sum + p.debt, 0)
              : filtered.reduce((sum, p) => sum + p.debt, 0)
          )}</span>
        </div>
      )}
    </div>
  );
}
