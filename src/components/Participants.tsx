'use client';

import { useState } from 'react';
import { normalizeName } from '@/lib/utils';
import type { Participant, Payment } from '@/types';

interface ParticipantsProps {
  participants: Participant[];
  payments: Payment[];
  monthlyShare: number;
  currentMonth: string;
  onAdd: (name: string, phone: string, notes: string) => void;
  onUpdate: (id: number, name: string, phone: string, notes: string) => void;
  onRemove: (id: number) => void;
  onToggle: (id: number) => void;
  onShowHistory: (id: number, name: string) => void;
}

export default function Participants({
  participants,
  payments,
  monthlyShare,
  currentMonth,
  onAdd,
  onUpdate,
  onRemove,
  onToggle,
  onShowHistory
}: ParticipantsProps) {
  const [searchInput, setSearchInput] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newNotes, setNewNotes] = useState('');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [showModal, setShowModal] = useState(false);

  const openAdd = () => {
    setEditingId(null);
    setNewName('');
    setNewPhone('');
    setNewNotes('');
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingId(null);
  };

  const handleAdd = () => {
    if (newName.trim()) {
      onAdd(normalizeName(newName), newPhone, newNotes);
      setNewName('');
      setNewPhone('');
      setNewNotes('');
    }
  };

  const handleSave = () => {
    if (editingId !== null && newName.trim()) {
      onUpdate(editingId, normalizeName(newName), newPhone, newNotes);
      setEditingId(null);
      setNewName('');
      setNewPhone('');
      setNewNotes('');
    }
  };

  const startEdit = (p: Participant) => {
    setEditingId(p.id);
    setNewName(p.name);
    setNewPhone(p.phone || '');
    setNewNotes(p.notes || '');
    setShowModal(true);
  };

  const filtered = participants.filter(p => {
    const matchSearch = p.name.toLowerCase().includes(searchInput.toLowerCase());
    const matchFilter = filterType === 'all' || (filterType === 'active' && p.active);
    return matchSearch && matchFilter;
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


      <div style={{ marginBottom: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <button
            className={`filter-btn ${filterType === 'all' ? 'active' : ''}`}
            style={{marginBottom: '5px', width: '100px'}}
            onClick={() => setFilterType('all')}
          >
            Todos
          </button>
          <button
            className={`filter-btn ${filterType === 'active' ? 'active' : ''}`}
            style={{marginBottom: '5px', width: '100px'}}
            onClick={() => setFilterType('active')}
          >
            Activos
          </button>
        </div>
        <button className="btn btn-primary" onClick={openAdd}>
          + Agregar participante
        </button>
      </div>

      <div id="participantsList">
        {filtered.map(p => {
          const paid = payments
            .filter(pay => pay.participantId === p.id && pay.date.startsWith(currentMonth))
            .reduce((sum, pay) => sum + pay.amount, 0);
          const balance = paid - monthlyShare;
          const statusClass = balance >= 0 ? 'success' : balance > -monthlyShare * 0.3 ? 'warning' : 'danger';

          return (
            <div key={p.id} className={`card ${statusClass} ${p.active ? 'active-participant' : 'inactive-participant'}`}>
              <div className="card-header">
                <span>
                  <span className={p.active ? 'active-icon' : 'inactive-icon'}>
                    {p.active ? '✓' : '○'}
                  </span>{' '}
                  <strong>{normalizeName(p.name)}</strong>
                </span>
                <span className={`badge ${balance >= 0 ? 'success' : 'danger'}`}>
                  {balance >= 0 ? '+' : ''} ${balance.toLocaleString('es-AR')}
                </span>
              </div>
              {p.phone && <p style={{ fontSize: '12px', color: '#999' }}>{p.phone}</p>}
              <p style={{ fontSize: '13px', color: '#666', marginBottom: '8px' }}>
                Pagado: ${paid.toLocaleString('es-AR')} / Requerido: ${monthlyShare.toLocaleString('es-AR')}
              </p>
              <div className="card-actions">
                <button
                  className="btn btn-secondary"
                  onClick={() => startEdit(p)}
                  style={{ width: 'auto', padding: '6px 12px', fontSize: '12px' }}
                >
                  Editar
                </button>
                <button
                  className="btn btn-secondary"
                  onClick={() => onShowHistory(p.id, p.name)}
                  style={{ width: 'auto', padding: '6px 12px', fontSize: '12px' }}
                >
                  Ver Historial
                </button>
                <button
                  className={`btn btn-secondary`}
                  onClick={() => onToggle(p.id)}
                  style={{ width: 'auto', padding: '6px 12px', fontSize: '12px' }}
                >
                  {p.active ? 'Desactivar' : 'Activar'}
                </button>
                <button
                  className="btn btn-danger"
                  onClick={() => onRemove(p.id)}
                >
                  Eliminar
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
            <label>Notas (opcional)</label>
            <textarea
              rows={2}
              value={newNotes}
              onChange={e => setNewNotes(e.target.value)}
            />
          </div>
          <button className="btn btn-primary" onClick={handleSave}>
            {editingId === null ? 'Agregar' : 'Guardar cambios'}
          </button>
        </div>
      </div>
    </div>
  );
}
