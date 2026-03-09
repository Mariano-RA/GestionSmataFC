'use client';

import { aggregateExpensesByCategory } from '@/lib/domain/expenses';
import { formatCurrency } from '@/lib/utils';
import type { Expense } from '@/types';

interface ExpenseTrendProps {
  expenses: Expense[];
}

export default function ExpenseTrend({ expenses }: ExpenseTrendProps) {
  const categories = aggregateExpensesByCategory(expenses);
  const maxAmount = Math.max(...categories.map(c => c.amount), 1);

  return (
    <div style={{ marginTop: '20px', padding: '15px', background: 'var(--bg-primary)', borderRadius: '8px', border: '1px solid var(--border)' }}>
      <h3 style={{ marginBottom: '15px', color: 'var(--text)' }}>📊 Gastos por Categoría</h3>
      {categories.length === 0 ? (
        <p style={{ color: 'var(--text-secondary)' }}>Sin datos disponibles</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {categories.map(cat => {
            const percentage = (cat.amount / maxAmount) * 100;
            return (
              <div key={cat.category}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                  <span style={{ fontSize: '13px', fontWeight: '500' }}>{cat.category}</span>
                  <span style={{ fontSize: '13px', fontWeight: 'bold', color: 'var(--heading)' }}>{formatCurrency(cat.amount)}</span>
                </div>
                <div style={{ background: 'var(--bg-secondary)', borderRadius: '4px', height: '20px', overflow: 'hidden' }}>
                  <div
                    style={{
                      height: '100%',
                      background: 'linear-gradient(90deg, var(--primary), var(--primary-light))',
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
