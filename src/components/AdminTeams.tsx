'use client';

import React, { useState, useEffect } from 'react';
import { useApi } from '@/hooks/useApi';
import toast from 'react-hot-toast';
import { logger } from '@/lib/logger';

interface Team {
  id: number;
  name: string;
  description: string | null;
  active: boolean;
  createdAt: string;
  _count?: {
    participants: number;
    payments: number;
    expenses: number;
    userTeams: number;
  };
}

export default function AdminTeams() {
  const { request } = useApi();
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingTeam, setEditingTeam] = useState<Team | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
  });

  useEffect(() => {
    loadTeams();
  }, []);

  const loadTeams = async () => {
    try {
      setLoading(true);
      const data = await request<Team[]>('/api/admin/teams', {
        disableAutoParams: true,
      });

      if (data && Array.isArray(data)) {
        setTeams(data);
      } else {
        throw new Error('Error al cargar equipos');
      }
    } catch (error) {
      toast.error('Error al cargar equipos');
      logger.error('Error loading admin teams', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name) {
      toast.error('Nombre del equipo es requerido');
      return;
    }

    try {
      setLoading(true);

      if (editingTeam) {
        // Actualizar equipo
        await request(`/api/admin/teams/${editingTeam.id}`, {
          method: 'PATCH',
          body: {
            name: formData.name,
            description: formData.description,
          },
          disableAutoParams: true,
        });

        toast.success('Equipo actualizado');
        setEditingTeam(null);
      } else {
        // Crear equipo
        await request('/api/admin/teams', {
          method: 'POST',
          body: {
            name: formData.name,
            description: formData.description,
          },
          disableAutoParams: true,
        });

        toast.success('Equipo creado');
      }

      setFormData({ name: '', description: '' });
      setShowForm(false);
      loadTeams();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error al guardar equipo';
      toast.error(message);
      logger.error('Error saving admin team', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (team: Team) => {
    setEditingTeam(team);
    setFormData({
      name: team.name,
      description: team.description || '',
    });
    setShowForm(true);
  };

  const handleDelete = async (teamId: number) => {
    if (!confirm('¿Está seguro de que desea desactivar este equipo?')) {
      return;
    }

    try {
      await request(`/api/admin/teams/${teamId}`, {
        method: 'DELETE',
        disableAutoParams: true,
      });

      toast.success('Equipo desactivado');
      loadTeams();
    } catch (error) {
      toast.error('Error al desactivar equipo');
      logger.error('Error deactivating admin team', error);
    }
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingTeam(null);
    setFormData({ name: '', description: '' });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ fontSize: '20px', fontWeight: 'bold', color: 'var(--primary)' }}>⚽ Gestión de Equipos</h2>
        <button onClick={() => setShowForm(true)} className="btn-primary" style={{ padding: '8px 16px', fontSize: '14px', width: 'auto' }}>
          ➕ Nuevo
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <div style={{ background: 'var(--bg-primary)', padding: '15px', borderRadius: '8px', border: '1px solid var(--border)' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 'bold', color: 'var(--primary)', marginBottom: '12px' }}>
            {editingTeam ? '✏️ Editar Equipo' : '➕ Crear Equipo'}
          </h3>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <input type="text" placeholder="Nombre del equipo" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} style={{ padding: '8px', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--bg-secondary)', color: 'var(--text)' }} required/>
            <textarea placeholder="Descripción (opcional)" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} style={{ padding: '8px', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--bg-secondary)', color: 'var(--text)', minHeight: '80px', fontFamily: 'inherit' }} rows={3}/>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button type="submit" disabled={loading} className="btn-primary" style={{ padding: '8px 16px', fontSize: '13px', flex: 1 }}>
                {loading ? '⏳ Guardando...' : editingTeam ? 'Actualizar' : 'Crear'}
              </button>
              <button type="button" onClick={handleCancel} className="btn-secondary" style={{ padding: '8px 16px', fontSize: '13px', flex: 1 }}>
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Teams Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '15px' }}>
        {loading ? (
          <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '30px', color: 'var(--text-secondary)' }}>⏳ Cargando...</div>
        ) : teams.length === 0 ? (
          <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '30px', color: 'var(--text-secondary)' }}>Sin equipos</div>
        ) : (
          teams.map((team) => (
            <div key={team.id} style={{ background: 'var(--bg-primary)', padding: '15px', borderRadius: '8px', border: '1px solid var(--border)', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '12px' }}>
                <div>
                  <h3 style={{ fontSize: '16px', fontWeight: 'bold', color: 'var(--text)' }}>{team.name}</h3>
                  {team.description && <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>{team.description}</p>}
                </div>
                <span style={{ padding: '4px 8px', borderRadius: '4px', fontSize: '11px', background: team.active ? 'var(--success)' : 'var(--danger)', color: 'white' }}>
                  {team.active ? '✅' : '❌'}
                </span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '12px', padding: '10px', background: 'var(--bg-secondary)', borderRadius: '6px' }}>
                <div style={{ fontSize: '12px' }}>
                  <p style={{ color: 'var(--text-secondary)' }}>Participantes</p>
                  <p style={{ fontSize: '16px', fontWeight: 'bold', color: 'var(--primary)' }}>{team._count?.participants || 0}</p>
                </div>
                <div style={{ fontSize: '12px' }}>
                  <p style={{ color: 'var(--text-secondary)' }}>Admins</p>
                  <p style={{ fontSize: '16px', fontWeight: 'bold', color: 'var(--primary)' }}>{team._count?.userTeams || 0}</p>
                </div>
                <div style={{ fontSize: '12px' }}>
                  <p style={{ color: 'var(--text-secondary)' }}>Pagos</p>
                  <p style={{ fontSize: '16px', fontWeight: 'bold', color: 'var(--primary)' }}>{team._count?.payments || 0}</p>
                </div>
                <div style={{ fontSize: '12px' }}>
                  <p style={{ color: 'var(--text-secondary)' }}>Gastos</p>
                  <p style={{ fontSize: '16px', fontWeight: 'bold', color: 'var(--primary)' }}>{team._count?.expenses || 0}</p>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '6px' }}>
                <button onClick={() => handleEdit(team)} className="btn-primary" style={{ padding: '6px 12px', fontSize: '12px', flex: 1 }}>✏️</button>
                {team.active && (<button onClick={() => handleDelete(team.id)} className="btn-secondary" style={{ padding: '6px 12px', fontSize: '12px', flex: 1, background: 'var(--danger)', color: 'white' }}>🗑️</button>)}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
