'use client';

import { Payment, Expense } from '@/types';
import { formatCurrency } from '@/lib/utils';

interface ExpenseTrendProps {
  expenses: Expense[];
}

export default function ExpenseTrend({ expenses }: ExpenseTrendProps) {
  // Agrupar gastos por categoría
  const categoryTotals: { [key: string]: number } = {};
  
  expenses.forEach(e => {
    const cat = e.category || 'Otros';
    categoryTotals[cat] = (categoryTotals[cat] || 0) + e.amount;
  });

  const categories = Object.keys(categoryTotals).sort((a, b) => categoryTotals[b] - categoryTotals[a]);
  const maxAmount = Math.max(...Object.values(categoryTotals), 1);

  return (
    <div style={{ marginTop: '20px', padding: '15px', background: 'var(--bg-primary)', borderRadius: '8px', border: '1px solid var(--border)' }}>
      <h3 style={{ marginBottom: '15px', color: 'var(--text)' }}>📊 Gastos por Categoría</h3>
      {categories.length === 0 ? (
        <p style={{ color: 'var(--text-secondary)' }}>Sin datos disponibles</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {categories.map(cat => {
            const amount = categoryTotals[cat];
            const percentage = (amount / maxAmount) * 100;
            return (
              <div key={cat}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                  <span style={{ fontSize: '13px', fontWeight: '500' }}>{cat}</span>
                  <span style={{ fontSize: '13px', fontWeight: 'bold', color: 'var(--primary)' }}>{formatCurrency(amount)}</span>
                </div>
                <div style={{ background: 'var(--bg-secondary)', borderRadius: '4px', height: '20px', overflow: 'hidden' }}>
                  <div
                    style={{
                      height: '100%',
                      background: `linear-gradient(90deg, var(--primary), var(--primary-light))`,
                      width: `${percentage}%`,
                      transition: 'width 0.3s'
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
