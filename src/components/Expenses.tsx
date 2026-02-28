'use client';

import { useState } from 'react';
import { formatCurrency } from '@/lib/utils';
import type { Expense } from '@/types';

interface ExpensesProps {
  expenses: Expense[];
  currentMonth: string;
  onAdd: (name: string, amount: number, date: string) => void;
  onUpdate: (id: number, name: string, amount: number, date: string) => void;
  onDelete: (id: number) => void;
}

export default function Expenses({
  expenses,
  currentMonth,
  onAdd,
  onUpdate,
  onDelete
}: ExpensesProps) {
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

  const [editingId, setEditingId] = useState<number | null>(null);
  const [showModal, setShowModal] = useState(false);

  const openAdd = () => {
    setEditingId(null);
    setName('');
    setAmount('');
    setDate(new Date().toISOString().split('T')[0]);
    setShowModal(true);
  };

  const openEdit = (e: Expense) => {
    setEditingId(e.id);
    setName(e.name);
    setAmount(String(e.amount));
    setDate(e.date);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingId(null);
  };

  const handleAdd = () => {
    if (name.trim() && amount && date) {
      onAdd(name, Number(amount), date);
      closeModal();
      alert('Gasto registrado');
    }
  };

  const handleSave = () => {
    if (editingId !== null && name.trim() && amount && date) {
      onUpdate(editingId, name, Number(amount), date);
      closeModal();
    }
  };

  const monthExpenses = expenses.filter(e => e.date.startsWith(currentMonth));
  const totalExpenses = monthExpenses.reduce((sum, e) => sum + e.amount, 0);

  return (
    <div className="tab-content">
      <div style={{ marginBottom: '10px', display: 'flex', justifyContent: 'flex-end' }}>
        <button className="btn btn-primary" onClick={openAdd}>
          + Agregar gasto
        </button>
      </div>

      <h3 style={{ marginTop: '20px', marginBottom: '10px', color: 'var(--primary)' }}>Gastos del Mes</h3>
      <div id="expensesList">
        {monthExpenses.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">💸</div>
            <p>Sin gastos este mes</p>
          </div>
        ) : (
          monthExpenses.map(e => (
            <div key={e.id} className="expense-item">
              <span>
                <strong>{e.name}</strong>
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
        <span>Total Gastos:</span>
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

          <button className="btn btn-primary" onClick={editingId === null ? handleAdd : handleSave}>
            {editingId === null ? 'Registrar Gasto' : 'Guardar cambios'}
          </button>
        </div>
      </div>
    </div>
  );
}
