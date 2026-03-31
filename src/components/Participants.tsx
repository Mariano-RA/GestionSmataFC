'use client';

import { useState } from 'react';
import { normalizeName } from '@/lib/utils';
import type { Participant, Payment, ParticipantStatus } from '@/types';

const STATUS_LABELS: Record<ParticipantStatus, string> = {
  activo: 'Activo',
  sin_laburo: 'Sin trabajo',
  lesionado: 'Lesionado',
  media_cuota: 'Media cuota',
};

const STATUS_SORT_ORDER: Record<ParticipantStatus, number> = {
  lesionado: 0,
  media_cuota: 1,
  sin_laburo: 2,
  activo: 3,
};

function ParticipantCard({
  p,
  paid,
  required,
  onEdit,
  onHistory,
  onToggle,
  onRemove,
}: {
  p: Participant;
  paid: number;
  required: number;
  onEdit: (p: Participant) => void;
  onHistory: (id: number, name: string) => void;
  onToggle: (id: number) => void;
  onRemove: (id: number) => void;
}) {
  const balance = paid - required;
  const statusClass = balance >= 0 ? 'success' : balance > -required * 0.3 ? 'warning' : 'danger';

  return (
    <div className={`card ${statusClass} ${p.active ? 'active-participant' : 'inactive-participant'}`}>
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
          type="button"
          className="btn btn-secondary btn-sm"
          onClick={() => onEdit(p)}
        >
          ✏️ Editar
        </button>
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          onClick={() => onHistory(p.id, p.name)}
        >
          📋 Historial
        </button>
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          onClick={() => onToggle(p.id)}
        >
          {p.active ? '❌ Desactivar' : '✅ Activar'}
        </button>
        <button
          type="button"
          className="btn btn-danger btn-sm"
          onClick={() => onRemove(p.id)}
        >
          🗑️ Eliminar
        </button>
      </div>
    </div>
  );
}

/** Vista “tabla” en pantallas chicas: misma info que la grilla desktop, presentación densa (no duplica las cards). */
function ParticipantMobileTableRow({
  p,
  paid,
  required,
  onEdit,
  onHistory,
  onToggle,
  onRemove,
}: {
  p: Participant;
  paid: number;
  required: number;
  onEdit: (p: Participant) => void;
  onHistory: (id: number, name: string) => void;
  onToggle: (id: number) => void;
  onRemove: (id: number) => void;
}) {
  const balance = paid - required;
  const status = (p.status as ParticipantStatus) || 'activo';
  const statusBg = status === 'lesionado' ? 'var(--danger)' : status === 'sin_laburo' ? 'var(--warning)' : status === 'media_cuota' ? 'var(--warning)' : 'var(--success)';

  return (
    <div
      className="participants-mobile-table-row"
      style={{
        border: '1px solid var(--border)',
        borderRadius: '8px',
        padding: '12px',
        background: 'var(--bg-primary)',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px', marginBottom: '8px' }}>
        <div style={{ minWidth: 0, flex: 1 }}>
          <span className={p.active ? 'active-icon' : 'inactive-icon'} style={{ marginRight: '6px' }}>
            {p.active ? '✓' : '○'}
          </span>
          <strong style={{ fontSize: '15px', wordBreak: 'break-word' }}>{normalizeName(p.name)}</strong>
        </div>
        <span className={`badge ${balance >= 0 ? 'success' : 'danger'}`} style={{ fontSize: '11px', flexShrink: 0 }}>
          {balance >= 0 ? '+' : ''} ${balance.toLocaleString('es-AR')}
        </span>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '8px' }}>
        <span style={{ padding: '3px 8px', borderRadius: '999px', fontSize: '11px', background: p.active ? 'var(--success)' : 'var(--danger)', color: 'white' }}>
          {p.active ? 'Activo' : 'Inactivo'}
        </span>
        {status !== 'activo' && (
          <span style={{ padding: '3px 8px', borderRadius: '999px', fontSize: '11px', background: statusBg, color: 'white' }}>
            {STATUS_LABELS[status]}
          </span>
        )}
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '8px',
          marginBottom: '8px',
          fontSize: '12px',
        }}
      >
        <div>
          <div style={{ color: 'var(--text-secondary)', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.03em' }}>Pagado</div>
          <div style={{ color: 'var(--text)', fontWeight: 600 }}>${paid.toLocaleString('es-AR')}</div>
        </div>
        <div>
          <div style={{ color: 'var(--text-secondary)', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.03em' }}>Requerido</div>
          <div style={{ color: 'var(--text)', fontWeight: 600 }}>${required.toLocaleString('es-AR')}</div>
        </div>
        <div>
          <div style={{ color: 'var(--text-secondary)', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.03em' }}>Saldo</div>
          <div style={{ color: balance >= 0 ? 'var(--success)' : 'var(--danger)', fontWeight: 600 }}>
            {balance >= 0 ? '+' : ''} ${balance.toLocaleString('es-AR')}
          </div>
        </div>
      </div>

      {(p.phone || p.notes) && (
        <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '8px' }}>
          {p.phone && <div>📞 {p.phone}</div>}
          {p.notes && <div style={{ color: '#888', fontStyle: 'italic', marginTop: '4px' }}>📝 {p.notes}</div>}
        </div>
      )}

      <div className="card-actions btn-group" style={{ marginTop: '4px' }}>
        <button type="button" className="btn btn-secondary btn-sm" onClick={() => onEdit(p)}>
          ✏️ Editar
        </button>
        <button type="button" className="btn btn-secondary btn-sm" onClick={() => onHistory(p.id, p.name)}>
          📋 Historial
        </button>
        <button type="button" className="btn btn-secondary btn-sm" onClick={() => onToggle(p.id)}>
          {p.active ? '❌ Desactivar' : '✅ Activar'}
        </button>
        <button type="button" className="btn btn-danger btn-sm" onClick={() => onRemove(p.id)}>
          🗑️ Eliminar
        </button>
      </div>
    </div>
  );
}

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
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');
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

  const paidByParticipantId = payments
    .filter(pay => pay.date.startsWith(currentMonth))
    .reduce<Record<number, number>>((acc, pay) => {
      acc[pay.participantId] = (acc[pay.participantId] || 0) + pay.amount;
      return acc;
    }, {});

  const participantCards = filtered.map(p => {
    const paid = paidByParticipantId[p.id] || 0;
    const required = getRequiredAmount(p);
    return (
      <ParticipantCard
        key={p.id}
        p={p}
        paid={paid}
        required={required}
        onEdit={startEdit}
        onHistory={onShowHistory}
        onToggle={onToggle}
        onRemove={onRemove}
      />
    );
  });

  const participantMobileTableRows = filtered.map(p => {
    const paid = paidByParticipantId[p.id] || 0;
    const required = getRequiredAmount(p);
    return (
      <ParticipantMobileTableRow
        key={p.id}
        p={p}
        paid={paid}
        required={required}
        onEdit={startEdit}
        onHistory={onShowHistory}
        onToggle={onToggle}
        onRemove={onRemove}
      />
    );
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


      <div className="participants-toolbar">
        <div className="participants-toolbar-sort">
          <label htmlFor="participants-sort" style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Orden:</label>
          <select
            id="participants-sort"
            className="participants-sort-select"
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
              maxWidth: '100%',
            }}
          >
            <option value="all_status">Todos — Estado y nombre</option>
            <option value="active_status">Solo activos — Estado y nombre</option>
            <option value="all_name_asc">Todos — Nombre A-Z</option>
            <option value="all_name_desc">Todos — Nombre Z-A</option>
          </select>
        </div>
        <div className="participants-toolbar-actions">
          <div className="participants-view-toggle" style={{ display: 'flex', gap: '6px', flex: '1 1 auto', minWidth: 0 }}>
            <button
              type="button"
              className={viewMode === 'cards' ? 'btn btn-primary' : 'btn btn-secondary'}
              onClick={() => setViewMode('cards')}
              style={{ flex: 1, minWidth: 0 }}
            >
              🧩 Cards
            </button>
            <button
              type="button"
              className={viewMode === 'table' ? 'btn btn-primary' : 'btn btn-secondary'}
              onClick={() => setViewMode('table')}
              style={{ flex: 1, minWidth: 0 }}
            >
              📋 Tabla
            </button>
          </div>
          <button type="button" className="btn btn-primary participants-add-btn" onClick={openAdd}>
            ➕ Agregar Participante
          </button>
        </div>
      </div>

      {viewMode === 'cards' ? (
        <div id="participantsList">
          {participantCards}
        </div>
      ) : (
        <>
          <div className="participants-table-desktop-only" style={{ overflowX: 'auto', background: 'var(--bg-primary)', borderRadius: '8px', border: '1px solid var(--border)', width: '100%' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
            <colgroup>
              <col style={{ width: '26%' }} />
              <col style={{ width: '17%' }} />
              <col style={{ width: '13%' }} />
              <col style={{ width: '10%' }} />
              <col style={{ width: '10%' }} />
              <col style={{ width: '12%' }} />
              <col style={{ width: '12%' }} />
            </colgroup>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--border)', background: 'var(--bg-secondary)' }}>
                <th style={{ textAlign: 'left', padding: '10px', color: 'var(--text)', fontWeight: 'bold', fontSize: '13px' }}>Participante</th>
                <th style={{ textAlign: 'left', padding: '10px', color: 'var(--text)', fontWeight: 'bold', fontSize: '13px' }}>Estado</th>
                <th style={{ textAlign: 'left', padding: '10px', color: 'var(--text)', fontWeight: 'bold', fontSize: '13px' }}>Teléfono</th>
                <th style={{ textAlign: 'right', padding: '10px', color: 'var(--text)', fontWeight: 'bold', fontSize: '13px' }}>Pagado</th>
                <th style={{ textAlign: 'right', padding: '10px', color: 'var(--text)', fontWeight: 'bold', fontSize: '13px' }}>Requerido</th>
                <th style={{ textAlign: 'right', padding: '10px', color: 'var(--text)', fontWeight: 'bold', fontSize: '13px' }}>Balance</th>
                <th style={{ textAlign: 'left', padding: '10px', color: 'var(--text)', fontWeight: 'bold', fontSize: '13px' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '20px', color: 'var(--text-secondary)' }}>Sin participantes</td>
                </tr>
              ) : (
                filtered.map(p => {
                  const paid = paidByParticipantId[p.id] || 0;
                  const required = getRequiredAmount(p);
                  const balance = paid - required;
                  const status = (p.status as ParticipantStatus) || 'activo';
                  const statusBg = status === 'lesionado' ? 'var(--danger)' : status === 'sin_laburo' ? 'var(--warning)' : status === 'media_cuota' ? 'var(--warning)' : 'var(--success)';

                  return (
                    <tr key={p.id} style={{ borderBottom: '1px solid var(--border)', verticalAlign: 'top' }}>
                      <td style={{ padding: '10px', color: 'var(--text)', wordBreak: 'break-word', overflowWrap: 'anywhere' }}>
                        <span className={p.active ? 'active-icon' : 'inactive-icon'} style={{ marginRight: '6px' }}>
                          {p.active ? '✓' : '○'}
                        </span>
                        <strong>{normalizeName(p.name)}</strong>
                        {p.notes && (
                          <div style={{ fontSize: '12px', color: '#888', fontStyle: 'italic', marginTop: '4px' }}>
                            📝 {p.notes}
                          </div>
                        )}
                      </td>
                      <td style={{ padding: '10px', display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'flex-start' }}>
                        <span style={{ padding: '4px 8px', borderRadius: '999px', fontSize: '11px', background: p.active ? 'var(--success)' : 'var(--danger)', color: 'white', whiteSpace: 'nowrap' }}>
                          {p.active ? '✅ Activo' : '❌ Inactivo'}
                        </span>
                        {status !== 'activo' && (
                          <span style={{ padding: '4px 8px', borderRadius: '999px', fontSize: '11px', background: statusBg, color: 'white', whiteSpace: 'nowrap' }}>
                            {STATUS_LABELS[status]}
                          </span>
                        )}
                      </td>
                      <td style={{ padding: '10px', color: 'var(--text-secondary)', fontSize: '12px', wordBreak: 'break-word' }}>{p.phone || '—'}</td>
                      <td style={{ padding: '10px', textAlign: 'right', color: 'var(--text)', fontSize: '12px' }}>${paid.toLocaleString('es-AR')}</td>
                      <td style={{ padding: '10px', textAlign: 'right', color: 'var(--text)', fontSize: '12px' }}>${required.toLocaleString('es-AR')}</td>
                      <td style={{ padding: '10px', textAlign: 'right' }}>
                        <span className={`badge ${balance >= 0 ? 'success' : 'danger'}`} style={{ fontSize: '11px' }}>
                          {balance >= 0 ? '+' : ''} ${balance.toLocaleString('es-AR')}
                        </span>
                      </td>
                      <td style={{ padding: '10px', display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                        <button onClick={() => startEdit(p)} className="btn btn-secondary btn-sm" style={{ padding: '4px 10px', fontSize: '12px' }}>✏️</button>
                        <button onClick={() => onShowHistory(p.id, p.name)} className="btn btn-secondary btn-sm" style={{ padding: '4px 10px', fontSize: '12px' }}>📋</button>
                        <button onClick={() => onToggle(p.id)} className="btn btn-secondary btn-sm" style={{ padding: '4px 10px', fontSize: '12px' }}>
                          {p.active ? '❌' : '✅'}
                        </button>
                        <button onClick={() => onRemove(p.id)} className="btn btn-danger btn-sm" style={{ padding: '4px 10px', fontSize: '12px' }}>🗑️</button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
          </div>
          <div className="participants-table-mobile-fallback">
            <div className="participants-mobile-stack participants-mobile-table">
              {filtered.length === 0 ? (
                <p style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '16px' }}>Sin participantes</p>
              ) : (
                participantMobileTableRows
              )}
            </div>
          </div>
        </>
      )}
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
