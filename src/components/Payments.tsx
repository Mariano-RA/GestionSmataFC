'use client';

import { useMemo, useState } from 'react';
import { formatCurrency, normalizeName, formatLocalYMD, parseYMDToLocalDate, addMonths, getLastDayOfMonthYMD } from '@/lib/utils';
import type { Payment, Participant } from '@/types';

interface PaymentsProps {
  payments: Payment[];
  participants: Participant[];
  currentMonth: string;
  onAdd: (participantId: number, date: string, amount: number, method: string, note: string, appliedMonth?: string) => void;
  onUpdate: (id: number, participantId: number, date: string, amount: number, method: string, note: string, appliedMonth?: string | null) => void;
  onDelete: (id: number) => void;
  addToast: (message: string, type: 'success' | 'error' | 'info') => void;
  getRequiredAmountForMonth: (p: Participant, month: string) => number;
}

export default function Payments({
  payments,
  participants,
  currentMonth,
  onAdd,
  onUpdate,
  onDelete,
  addToast,
  getRequiredAmountForMonth,
}: PaymentsProps) {
  const getPayMonth = (p: Payment) => p.appliedMonth ?? p.date.slice(0, 7);

  const [participantId, setParticipantId] = useState('');
  const [date, setDate] = useState(formatLocalYMD(new Date()));
  const [amount, setAmount] = useState(''); // monto a imputar al mes actual (mes de la fecha)
  const [method, setMethod] = useState('');
  const [note, setNote] = useState('');
  const [applyToPrevAmount, setApplyToPrevAmount] = useState('');

  const [editingId, setEditingId] = useState<number | null>(null);
  const [showModal, setShowModal] = useState(false);

  const openAdd = () => {
    setEditingId(null);
    setParticipantId('');
    setDate(formatLocalYMD(new Date()));
    setAmount('');
    setMethod('');
    setNote('');
    setApplyToPrevAmount('');
    setShowModal(true);
  };

  const openEdit = (p: Payment) => {
    setEditingId(p.id);
    setParticipantId(String(p.participantId));
    setDate(p.date);
    setAmount(String(p.amount));
    setMethod(p.method || '');
    setNote(p.note || '');
    setApplyToPrevAmount('');
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingId(null);
  };

  const payMonth = date.slice(0, 7);
  const prevMonth = addMonths(payMonth, -1);
  const selectedParticipant = useMemo(
    () => participants.find((p) => p.id === Number(participantId)) ?? null,
    [participants, participantId]
  );
  const prevDebt = useMemo(() => {
    if (!selectedParticipant) return 0;
    const requiredPrev = getRequiredAmountForMonth(selectedParticipant, prevMonth);
    const paidPrev = payments
      .filter((p) => p.participantId === selectedParticipant.id && getPayMonth(p) === prevMonth)
      .reduce((sum, p) => sum + p.amount, 0);
    return Math.max(0, requiredPrev - paidPrev);
  }, [selectedParticipant, prevMonth, payments, getRequiredAmountForMonth]);

  const handleAdd = async () => {
    if (!participantId || !date) {
      addToast('Por favor completa todos los campos requeridos', 'error');
      return;
    }
    try {
      const pid = Number(participantId);
      const amtCurr = Number(amount) || 0;
      const amtPrevRequested = Number(applyToPrevAmount) || 0;
      const amtPrev = Math.max(0, Math.min(prevDebt, amtPrevRequested));

      if (amtCurr <= 0 && amtPrev <= 0) {
        addToast('Ingresá un monto para el mes actual y/o el mes anterior', 'error');
        return;
      }

      if (amtPrev > 0) {
        // Para imputar al mes anterior, la fecha debe ser el último día de ese mes
        const prevMonthDate = getLastDayOfMonthYMD(prevMonth);
        await onAdd(pid, prevMonthDate, amtPrev, method, note, prevMonth);
      }
      if (amtCurr > 0) {
        await onAdd(pid, date, amtCurr, method, note, payMonth);
      }

      closeModal();
    } catch (error) {
      console.error('Error in handleAdd:', error);
    }
  };

  const handleSave = () => {
    if (editingId !== null && participantId && date && amount) {
      onUpdate(editingId, Number(participantId), date, Number(amount), method, note);
      closeModal();
    }
  };

  const allMonthPayments = payments
    .filter(p => getPayMonth(p) === currentMonth)
    .sort((a, b) => {
      const dateA = parseYMDToLocalDate(a.date).getTime();
      const dateB = parseYMDToLocalDate(b.date).getTime();
      if (dateB !== dateA) return dateB - dateA;
      return (b.id ?? 0) - (a.id ?? 0);
    });

  const recentPayments = allMonthPayments.slice(0, 5);
  const [filterType, setFilterType] = useState<'recent' | 'all'>('recent');

  return (
    <div className="tab-content payments-tab">
      <div className="payments-toolbar">
        <div className="payments-toolbar-left">
          <div className="payments-filter-group">
            <button
              className={`payments-filter-btn ${filterType === 'recent' ? 'active' : ''}`}
              onClick={() => setFilterType('recent')}
            >
              Recientes
            </button>
            <button
              className={`payments-filter-btn ${filterType === 'all' ? 'active' : ''}`}
              onClick={() => setFilterType('all')}
            >
              Todos
            </button>
          </div>
        </div>
        <button className="btn btn-primary payments-add-btn-mobile" onClick={openAdd}>
          ➕ Registrar
        </button>
      </div>

      <h3 className="payments-section-title">
        {filterType === 'recent' ? '📄 Pagos Recientes' : '📋 Todos los pagos del mes'}
      </h3>

      <div id="recentPayments" className="payments-list">
        {((filterType === 'recent' ? recentPayments : allMonthPayments).length === 0) ? (
          <div className="empty-state">
            <div className="empty-state-icon">💸</div>
            <p>Sin pagos este mes</p>
          </div>
        ) : (
          (filterType === 'recent' ? recentPayments : allMonthPayments).map(p => {
            const participant = participants.find(part => part.id === p.participantId);
            return (
              <div key={p.id} className="payment-card">
                <div className="payment-card-header">
                  <div className="payment-card-user">
                    <span className="payment-card-avatar">
                      {participant ? normalizeName(participant.name).charAt(0).toUpperCase() : '?'}
                    </span>
                    <div className="payment-card-user-info">
                      <span className="payment-card-name">
                        <strong>{participant ? normalizeName(participant.name) : ''}</strong>
                      </span>
                      <span className="payment-card-date">
                        {parseYMDToLocalDate(p.date).toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })}
                      </span>
                    </div>
                  </div>
                  <div className="payment-card-amount">
                    <span className="badge success">{formatCurrency(p.amount)}</span>
                  </div>
                </div>
                {(p.note || p.method) && (
                  <div className="payment-card-meta">
                    {p.method && <span className="payment-card-method">{p.method === 'cash' ? '💵 Efectivo' : p.method === 'bank' ? '🏦 Transferencia' : '📌 Otro'}</span>}
                    {p.note && <span className="payment-card-note">📝 {p.note}</span>}
                  </div>
                )}
                <div className="payment-card-actions">
                  <button className="btn btn-secondary btn-sm" onClick={() => openEdit(p)}>
                    ✏️ Editar
                  </button>
                  <button className="btn btn-danger btn-sm" onClick={() => onDelete(p.id)}>
                    🗑️ Eliminar
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
          {editingId === null && participantId && (
            <div
              style={{
                marginBottom: '12px',
                padding: '10px 12px',
                borderRadius: '8px',
                border: '1px solid var(--border)',
                background: 'var(--bg-secondary)',
                fontSize: '12px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', flexWrap: 'wrap' }}>
                <div style={{ color: 'var(--text-secondary)' }}>
                  Deuda mes anterior ({prevMonth})
                </div>
                <div style={{ fontWeight: 'bold', color: prevDebt > 0 ? 'var(--danger)' : 'var(--success)' }}>
                  {formatCurrency(prevDebt)}
                </div>
              </div>
              {prevDebt > 0 ? (
                <div style={{ marginTop: '10px' }}>
                  <label style={{ display: 'block', marginBottom: '6px', color: 'var(--text-secondary)' }}>
                    Monto a imputar al mes anterior
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="1000"
                    value={applyToPrevAmount}
                    onChange={(e) => setApplyToPrevAmount(e.target.value)}
                    placeholder={`0 (máx ${formatCurrency(prevDebt)})`}
                  />
                  <div style={{ marginTop: '6px', color: 'var(--text-secondary)' }}>
                    Si imputás, se guardará con fecha <strong>{getLastDayOfMonthYMD(prevMonth)}</strong>.
                  </div>
                </div>
              ) : (
                <div style={{ marginTop: '6px', color: 'var(--text-secondary)' }}>
                  No hay deuda pendiente del mes anterior.
                </div>
              )}
            </div>
          )}
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
                placeholder="0 (mes actual)"
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
            {editingId === null ? '✅ Registrar Pago' : '💾 Guardar Cambios'}
          </button>
        </div>
      </div>
    </div>
  );
}
