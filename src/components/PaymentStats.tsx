'use client';

import type { Participant, Payment } from '@/types';
import { formatCurrency } from '@/lib/utils';

interface PaymentStatsProps {
  participants: Participant[];
  payments: Payment[];
  currentMonth: string;
  getRequiredAmount: (p: Participant) => number;
}

export default function PaymentStats({
  participants,
  payments,
  currentMonth,
  getRequiredAmount
}: PaymentStatsProps) {
  const activeParticipants = participants.filter(p => p.active);
  
  const stats = activeParticipants.map(p => {
    const paid = payments
      .filter(pay => pay.participantId === p.id && pay.date.startsWith(currentMonth))
      .reduce((sum, pay) => sum + pay.amount, 0);
    const required = getRequiredAmount(p);
    return {
      ...p,
      paid,
      required,
      missing: Math.max(0, required - paid),
      percentage: required > 0 ? (paid / required) * 100 : 100
    };
  }).sort((a, b) => b.paid - a.paid);

  return (
    <div style={{ marginTop: '20px', padding: '15px', background: 'var(--bg-primary)', borderRadius: '8px', border: '1px solid var(--border)' }}>
      <h3 style={{ marginBottom: '15px', color: 'var(--text)' }}>📈 Pagos de Participantes</h3>
      {stats.length === 0 ? (
        <p style={{ color: 'var(--text-secondary)' }}>Sin participantes activos</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {stats.map(p => {
            const percentage = Math.min(p.percentage, 100);
            const color = p.percentage >= 100 ? '#27ae60' : p.percentage >= 50 ? '#f39c12' : '#e74c3c';
            return (
              <div key={p.id}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', alignItems: 'center' }}>
                  <span style={{ fontSize: '13px', fontWeight: '500' }}>{p.name}</span>
                  <span style={{ fontSize: '12px', color: color, fontWeight: 'bold' }}>
                    {formatCurrency(p.paid)}/{formatCurrency(p.required)}
                  </span>
                </div>
                <div style={{ background: 'var(--bg-secondary)', borderRadius: '4px', height: '18px', overflow: 'hidden' }}>
                  <div
                    style={{
                      height: '100%',
                      background: color,
                      width: `${percentage}%`,
                      transition: 'width 0.3s',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: percentage > 10 ? 'white' : 'transparent',
                      fontSize: '10px',
                      fontWeight: 'bold'
                    }}
                  >
                    {percentage > 10 && `${Math.round(percentage)}%`}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
