'use client';

import { useState } from 'react';
import { formatCurrency, normalizeName } from '@/lib/utils';
import type { Payment, Participant } from '@/types';

interface PaymentsProps {
  payments: Payment[];
  participants: Participant[];
  currentMonth: string;
  onAdd: (participantId: number, date: string, amount: number, method: string, note: string) => void;
  onUpdate: (id: number, participantId: number, date: string, amount: number, method: string, note: string) => void;
  onDelete: (id: number) => void;
  addToast: (message: string, type: 'success' | 'error' | 'info') => void;
}

export default function Payments({
  payments,
  participants,
  currentMonth,
  onAdd,
  onUpdate,
  onDelete,
  addToast
}: PaymentsProps) {
  const [participantId, setParticipantId] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('');
  const [note, setNote] = useState('');

  const [editingId, setEditingId] = useState<number | null>(null);
  const [showModal, setShowModal] = useState(false);

  const openAdd = () => {
    setEditingId(null);
    setParticipantId('');
    setDate(new Date().toISOString().split('T')[0]);
    setAmount('');
    setMethod('');
    setNote('');
    setShowModal(true);
  };

  const openEdit = (p: Payment) => {
    setEditingId(p.id);
    setParticipantId(String(p.participantId));
    setDate(p.date);
    setAmount(String(p.amount));
    setMethod(p.method || '');
    setNote(p.note || '');
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingId(null);
  };

  const handleAdd = () => {
    if (participantId && date && amount) {
      onAdd(Number(participantId), date, Number(amount), method, note);
      closeModal();
      addToast('Pago registrado', 'success');
    }
  };

  const handleSave = () => {
    if (editingId !== null && participantId && date && amount) {
      onUpdate(editingId, Number(participantId), date, Number(amount), method, note);
      closeModal();
    }
  };

  const allMonthPayments = payments
    .filter(p => p.date.startsWith(currentMonth))
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const recentPayments = allMonthPayments.slice(0, 5);
  const [filterType, setFilterType] = useState<'recent' | 'all'>('recent');

  return (
    <div className="tab-content">
      <div style={{ marginBottom: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <button
            className={`filter-btn ${filterType === 'recent' ? 'active' : ''}`}
            style={{marginBottom: '5px', width: '100px'}}
            onClick={() => setFilterType('recent')}
          >
            Recientes
          </button>
          <button
            className={`filter-btn ${filterType === 'all' ? 'active' : ''}`}
            style={{marginBottom: '5px', width: '100px'}}
            onClick={() => setFilterType('all')}
          >
            Todos
          </button>
        </div>
        <button className="btn btn-primary" onClick={openAdd}>
          + Agregar pago
        </button>
      </div>

      <h3 style={{ marginTop: '20px', marginBottom: '10px', color: 'var(--primary)' }}>
        {filterType === 'recent' ? 'Pagos Recientes' : 'Todos los pagos del mes'}
      </h3>
      <div id="recentPayments">
        {((filterType === 'recent' ? recentPayments : allMonthPayments).length === 0) ? (
          <div className="empty-state">
            <div className="empty-state-icon">💸</div>
            <p>Sin pagos este mes</p>
          </div>
        ) : (
          (filterType === 'recent' ? recentPayments : allMonthPayments).map(p => {
            const participant = participants.find(part => part.id === p.participantId);
            return (
              <div key={p.id} className="card paid">
                <div className="card-header">
                  <span>
                    <strong>{participant ? normalizeName(participant.name) : ''}</strong>
                    <span className="badge success" style={{ marginLeft: '8px' }}>
                      {formatCurrency(p.amount)}
                    </span>
                  </span>
                  <span style={{ fontSize: '12px', color: '#999' }}>
                    {new Date(p.date).toLocaleDateString('es-AR')}
                  </span>
                </div>
                {p.note && <p style={{ fontSize: '12px', color: '#666', marginBottom: '8px' }}>{p.note}</p>}
                <div className="card-actions">
                  <button
                    className="btn btn-secondary"
                    onClick={() => openEdit(p)}
                    style={{ width: 'auto', padding: '6px 12px', fontSize: '12px' }}
                  >
                    Editar
                  </button>
                  <button
                    className="btn btn-danger"
                    onClick={() => onDelete(p.id)}
                  >
                    Eliminar
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* modal for add/edit payment */}
      <div className={`modal ${showModal ? 'active' : ''}`} onClick={closeModal}>
        <div className="modal-content" onClick={e => e.stopPropagation()}>
          <button className="close-btn" onClick={closeModal}>&times;</button>
          <h2>{editingId === null ? 'Agregar pago' : 'Editar pago'}</h2>
          <div className="form-group">
            <label>Participante</label>
            <select value={participantId} onChange={e => setParticipantId(e.target.value)}>
              <option value="">-- Seleccionar --</option>
              {participants.filter(p => p.active).map(p => (
                <option key={p.id} value={p.id}>{normalizeName(p.name)}</option>
              ))}
            </select>
          </div>
          <div className="input-group">
            <div className="form-group">
              <label>Fecha</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
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
          </div>
          <div className="form-group">
            <label>Método</label>
            <select value={method} onChange={(e) => setMethod(e.target.value)}>
              <option value="">-- Seleccionar --</option>
              <option value="cash">Efectivo</option>
              <option value="bank">Transferencia</option>
              <option value="other">Otro</option>
            </select>
          </div>
          <div className="form-group">
            <label>Nota</label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Observaciones (opcional)"
              rows={2}
            />
          </div>
          <button className="btn btn-success" onClick={editingId === null ? handleAdd : handleSave}>
            {editingId === null ? 'Registrar Pago' : 'Guardar cambios'}
          </button>
        </div>
      </div>
    </div>
  );
}
