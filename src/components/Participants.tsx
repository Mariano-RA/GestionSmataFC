'use client';

import { useState } from 'react';
import { normalizeName } from '@/lib/utils';
import type { Participant, Payment, ParticipantStatus } from '@/types';

const STATUS_LABELS: Record<ParticipantStatus, string> = {
  activo: 'Activo',
  sin_laburo: 'Sin trabajo',
  lesionado: 'Lesionado',
};

const STATUS_SORT_ORDER: Record<ParticipantStatus, number> = {
  lesionado: 0,
  sin_laburo: 1,
  activo: 2,
};

interface ParticipantsProps {
  participants: Participant[];
  payments: Payment[];
  currentMonth: string;
  getRequiredAmount: (p: Participant) => number;
  onAdd: (name: string, phone: string, notes: string, status?: ParticipantStatus) => void;
  onUpdate: (id: number, name: string, phone: string, notes: string, status?: ParticipantStatus | null) => void;
  onRemove: (id: number) => void;
  onToggle: (id: number) => void;
  onShowHistory: (id: number, name: string) => void;
}

export default function Participants({
  participants,
  payments,
  currentMonth,
  getRequiredAmount,
  onAdd,
  onUpdate,
  onRemove,
  onToggle,
  onShowHistory
}: ParticipantsProps) {
  const [searchInput, setSearchInput] = useState('');
  const [sortOption, setSortOption] = useState<'all_status' | 'active_status' | 'all_name_asc' | 'all_name_desc'>('all_status');
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newNotes, setNewNotes] = useState('');
  const [newStatus, setNewStatus] = useState<ParticipantStatus>('activo');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [showModal, setShowModal] = useState(false);

  const openAdd = () => {
    setEditingId(null);
    setNewName('');
    setNewPhone('');
    setNewNotes('');
    setNewStatus('activo');
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingId(null);
  };

  const handleAdd = async () => {
    if (!newName.trim()) {
      return;
    }
    try {
      await onAdd(normalizeName(newName), newPhone, newNotes, newStatus);
      closeModal();
      setNewName('');
      setNewPhone('');
      setNewNotes('');
    } catch (error) {
      console.error('Error in handleAdd:', error);
    }
  };

  const handleSave = async () => {
    if (editingId === null || !newName.trim()) {
      return;
    }
    try {
      await onUpdate(editingId, normalizeName(newName), newPhone, newNotes, newStatus);
      closeModal();
      setEditingId(null);
      setNewName('');
      setNewPhone('');
      setNewNotes('');
    } catch (error) {
      console.error('Error in handleSave:', error);
    }
  };

  const startEdit = (p: Participant) => {
    setEditingId(p.id);
    setNewName(p.name);
    setNewPhone(p.phone || '');
    setNewNotes(p.notes || '');
    setNewStatus((p.status as ParticipantStatus) || 'activo');
    setShowModal(true);
  };

  const filtered = participants
    .filter(p => {
      const matchSearch = p.name.toLowerCase().includes(searchInput.toLowerCase());
      const onlyActive = sortOption === 'active_status';
      const matchFilter = !onlyActive || p.active;
      return matchSearch && matchFilter;
    })
    .sort((a, b) => {
      if (sortOption === 'all_name_asc' || sortOption === 'all_name_desc') {
        const cmp = a.name.localeCompare(b.name, 'es');
        return sortOption === 'all_name_desc' ? -cmp : cmp;
      }
      const statusA = STATUS_SORT_ORDER[(a.status as ParticipantStatus) || 'activo'];
      const statusB = STATUS_SORT_ORDER[(b.status as ParticipantStatus) || 'activo'];
      if (statusA !== statusB) return statusA - statusB;
      return a.name.localeCompare(b.name, 'es');
    });

  return (
    <div className="tab-content">
      <div className="search-box">
        <input
          type="text"
          placeholder="🔍 Buscar..."
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
        />
      </div>


      <div style={{ marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '12px' }}>
        <label htmlFor="participants-sort" style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Orden:</label>
        <select
          id="participants-sort"
          value={sortOption}
          onChange={e => setSortOption(e.target.value as typeof sortOption)}
          style={{
            padding: '8px 12px',
            borderRadius: '6px',
            border: '1px solid var(--border)',
            background: 'var(--bg-primary)',
            color: 'var(--text)',
            fontSize: '14px',
            width: '220px',
          }}
        >
          <option value="all_status">Todos — Estado y nombre</option>
          <option value="active_status">Solo activos — Estado y nombre</option>
          <option value="all_name_asc">Todos — Nombre A-Z</option>
          <option value="all_name_desc">Todos — Nombre Z-A</option>
        </select>
        <button className="btn btn-primary" onClick={openAdd}>
          ➕ Agregar Participante
        </button>
      </div>

      <div id="participantsList">
        {filtered.map(p => {
          const paid = payments
            .filter(pay => pay.participantId === p.id && pay.date.startsWith(currentMonth))
            .reduce((sum, pay) => sum + pay.amount, 0);
          const required = getRequiredAmount(p);
          const balance = paid - required;
          const statusClass = balance >= 0 ? 'success' : balance > -required * 0.3 ? 'warning' : 'danger';

          return (
            <div key={p.id} className={`card ${statusClass} ${p.active ? 'active-participant' : 'inactive-participant'}`}>
              <div className="card-header">
                <span>
                  <span className={p.active ? 'active-icon' : 'inactive-icon'}>
                    {p.active ? '✓' : '○'}
                  </span>{' '}
                  <strong>{normalizeName(p.name)}</strong>
                  {p.status && p.status !== 'activo' && (
                    <span style={{ fontSize: '11px', marginLeft: '6px', opacity: 0.9 }}>
                      ({STATUS_LABELS[p.status as ParticipantStatus]})
                    </span>
                  )}
                </span>
                <span className={`badge ${balance >= 0 ? 'success' : 'danger'}`}>
                  {balance >= 0 ? '+' : ''} ${balance.toLocaleString('es-AR')}
                </span>
              </div>
              {p.phone && <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{p.phone}</p>}
              {p.notes && <p style={{ fontSize: '12px', color: '#888', fontStyle: 'italic', marginBottom: '6px' }}>📝 {p.notes}</p>}
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                Pagado: ${paid.toLocaleString('es-AR')} / Requerido: ${required.toLocaleString('es-AR')}
              </p>
              <div className="card-actions btn-group">
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => startEdit(p)}
                >
                  ✏️ Editar
                </button>
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => onShowHistory(p.id, p.name)}
                >
                  📋 Historial
                </button>
                <button
                  className={`btn btn-secondary btn-sm`}
                  onClick={() => onToggle(p.id)}
                >
                  {p.active ? '❌ Desactivar' : '✅ Activar'}
                </button>
                <button
                  className="btn btn-danger btn-sm"
                  onClick={() => onRemove(p.id)}
                >
                  🗑️ Eliminar
                </button>
              </div>
            </div>
          );
        })}
      </div>
      {/* modal for add/edit participant */}
      <div className={`modal ${showModal ? 'active' : ''}`} onClick={closeModal}>
        <div className="modal-content" onClick={e => e.stopPropagation()}>
          <button className="close-btn" onClick={closeModal}>&times;</button>
          <h2>{editingId === null ? 'Agregar participante' : 'Editar participante'}</h2>
          <div className="form-group">
            <label>Nombre</label>
            <input
              type="text"
              value={newName}
              onChange={e => setNewName(e.target.value)}
            />
          </div>
          <div className="form-group">
            <label>Teléfono (opcional)</label>
            <input
              type="tel"
              value={newPhone}
              onChange={e => setNewPhone(e.target.value)}
            />
          </div>
          <div className="form-group">
            <label>Estado</label>
            <select
              value={newStatus}
              onChange={e => setNewStatus(e.target.value as ParticipantStatus)}
              style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--bg-primary)', color: 'var(--text)', width: '100%' }}
            >
              {(Object.keys(STATUS_LABELS) as ParticipantStatus[]).map(s => (
                <option key={s} value={s}>{STATUS_LABELS[s]}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label>Notas (opcional)</label>
            <textarea
              rows={2}
              value={newNotes}
              onChange={e => setNewNotes(e.target.value)}
            />
          </div>
          <button className="btn btn-success" onClick={editingId === null ? handleAdd : handleSave}>
            {editingId === null ? '✅ Agregar' : '💾 Guardar Cambios'}
          </button>
        </div>
      </div>
    </div>
  );
}
