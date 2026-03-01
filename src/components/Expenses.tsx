'use client';

import { useState } from 'react';
import { formatCurrency } from '@/lib/utils';
import type { Expense } from '@/types';

interface ExpensesProps {
  expenses: Expense[];
  currentMonth: string;
  onAdd: (name: string, amount: number, date: string, category: string) => void;
  onUpdate: (id: number, name: string, amount: number, date: string, category: string) => void;
  onDelete: (id: number) => void;
  addToast: (message: string, type: 'success' | 'error' | 'info') => void;
}

export default function Expenses({
  expenses,
  currentMonth,
  onAdd,
  onUpdate,
  onDelete,
  addToast
}: ExpensesProps) {
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [category, setCategory] = useState('Otros');

  const [editingId, setEditingId] = useState<number | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [filterCategory, setFilterCategory] = useState('Todos');

  const CATEGORIES = ['Alquiler', 'Arbitraje', 'Equipamiento', 'Otros'];

  const openAdd = () => {
    setEditingId(null);
    setName('');
    setAmount('');
    setDate(new Date().toISOString().split('T')[0]);
    setCategory('Otros');
    setShowModal(true);
  };

  const openEdit = (e: Expense) => {
    setEditingId(e.id);
    setName(e.name);
    setAmount(String(e.amount));
    setDate(e.date);
    setCategory(e.category);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingId(null);
  };

  const handleAdd = () => {
    if (name.trim() && amount && date) {
      onAdd(name, Number(amount), date, category);
      closeModal();
      addToast('Gasto registrado', 'success');
    }
  };

  const handleSave = () => {
    if (editingId !== null && name.trim() && amount && date) {
      onUpdate(editingId, name, Number(amount), date, category);
      closeModal();
    }
  };

  const monthExpenses = expenses.filter(e => e.date.startsWith(currentMonth));
  const filteredExpenses = filterCategory === 'Todos' 
    ? monthExpenses 
    : monthExpenses.filter(e => e.category === filterCategory);
  
  const totalExpenses = filteredExpenses.reduce((sum, e) => sum + e.amount, 0);

  return (
    <div className="tab-content">
      <div style={{ marginBottom: '15px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px' }}>
        <select
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
          style={{
            padding: '8px 12px',
            borderRadius: '6px',
            border: '1px solid var(--border)',
            background: 'var(--bg-primary)',
            color: 'var(--text)',
            fontSize: '13px',
            fontWeight: '500',
            cursor: 'pointer',
            width: '180px'
          }}
        >
          <option value="Todos">📁 Todos los gastos</option>
          {CATEGORIES.map(cat => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>
        <button className="btn btn-primary" onClick={openAdd} style={{ width: 'auto', padding: '8px 16px' }}>
          + Agregar gasto
        </button>
      </div>

      <h3 style={{ marginTop: '20px', marginBottom: '10px', color: 'var(--primary)' }}>
        Gastos del Mes {filterCategory !== 'Todos' && `- ${filterCategory}`}
      </h3>
      <div id="expensesList">
        {filteredExpenses.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">💸</div>
            <p>Sin gastos {filterCategory !== 'Todos' ? `en ${filterCategory.toLowerCase()}` : 'este mes'}</p>
          </div>
        ) : (
          filteredExpenses.map(e => (
            <div key={e.id} className="expense-item">
              <span>
                <strong>{e.name}</strong>
                <span style={{ fontSize: '11px', background: 'var(--secondary)', color: 'var(--text)', padding: '2px 8px', borderRadius: '3px', marginLeft: '8px' }}>
                  {e.category}
                </span>
                <span style={{ fontSize: '12px', color: '#999', marginLeft: '8px' }}>
                  {new Date(e.date).toLocaleDateString('es-AR')}
                </span>
              </span>
              <span className="expense-amount">{formatCurrency(e.amount)}</span>
              <div className="card-actions">
                <button
                  className="btn btn-secondary"
                  onClick={() => openEdit(e)}
                  style={{ width: 'auto', padding: '6px 12px', fontSize: '12px' }}
                >
                  Editar
                </button>
                <button
                  className="btn btn-danger"
                  onClick={() => onDelete(e.id)}
                >
                  X
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="total-row">
        <span>Total Gastos {filterCategory !== 'Todos' && `(${filterCategory})`}:</span>
        <span>{formatCurrency(totalExpenses)}</span>
      </div>

      {/* modal for add/edit expense */}
      <div className={`modal ${showModal ? 'active' : ''}`} onClick={closeModal}>
        <div className="modal-content" onClick={e => e.stopPropagation()}>
          <button className="close-btn" onClick={closeModal}>&times;</button>
          <h2>{editingId === null ? 'Agregar gasto' : 'Editar gasto'}</h2>
          <div className="form-group">
            <label>Nombre del Gasto</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej: Alquiler cancha, Arbitraje..."
            />
          </div>

          <div className="form-group">
            <label>Categoría</label>
            <select value={category} onChange={(e) => setCategory(e.target.value)}>
              {CATEGORIES.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          <div className="input-group">
            <div className="form-group">
              <label>Monto</label>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0"
                min="0"
                step="1000"
              />
            </div>
            <div className="form-group">
              <label>Fecha</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
          </div>

          <button className="btn btn-success" onClick={editingId === null ? handleAdd : handleSave}>
            {editingId === null ? 'Registrar Gasto' : 'Guardar cambios'}
          </button>
        </div>
      </div>
    </div>
  );
}
