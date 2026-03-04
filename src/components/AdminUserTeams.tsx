'use client';

import React, { useState, useEffect } from 'react';
import { useApi } from '@/hooks/useApi';
import toast from 'react-hot-toast';
import { logger } from '@/lib/logger';

interface UserTeamAssignment {
  id: number;
  userId: string;
  teamId: number;
  role: string;
  user: {
    id: string;
    name: string;
    email: string;
  };
  team: {
    id: number;
    name: string;
  };
}

interface User {
  id: string;
  name: string;
  email: string;
}

interface Team {
  id: number;
  name: string;
}

interface AssignmentsResponse {
  data: UserTeamAssignment[];
}

interface UsersResponse {
  data: User[];
}

interface TeamsResponse {
  data: Team[];
}

export default function AdminUserTeams() {
  const { request } = useApi();
  const [assignments, setAssignments] = useState<UserTeamAssignment[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    userId: '',
    teamId: '',
    role: 'viewer',
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    await Promise.all([loadAssignments(), loadUsers(), loadTeams()]);
  };

  const loadAssignments = async () => {
    try {
      const data = await request<AssignmentsResponse>('/api/admin/user-teams', {
        disableAutoParams: true,
      });

      if (data?.data) {
        setAssignments(data.data);
      } else {
        throw new Error('Error al cargar asignaciones');
      }
    } catch (error) {
      toast.error('Error al cargar asignaciones');
      logger.error('Error loading user-team assignments', error);
    }
  };

  const loadUsers = async () => {
    try {
      const data = await request<UsersResponse>('/api/admin/users', {
        disableAutoParams: true,
      });

      if (data?.data) {
        setUsers(data.data);
      }
    } catch (error) {
      logger.error('Error loading users for assignment', error);
    }
  };

  const loadTeams = async () => {
    try {
      const data = await request<TeamsResponse>('/api/admin/teams', {
        disableAutoParams: true,
      });

      if (data?.data) {
        setTeams(data.data);
      }
    } catch (error) {
      logger.error('Error loading teams for assignment', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.userId || !formData.teamId) {
      toast.error('Usuario y equipo son requeridos');
      return;
    }

    try {
      setLoading(true);

      await request('/api/admin/user-teams', {
        method: 'POST',
        body: {
          userId: formData.userId,
          teamId: parseInt(formData.teamId),
          role: formData.role,
        },
        disableAutoParams: true,
      });

      toast.success('Usuario asignado al equipo');
      setFormData({ userId: '', teamId: '', role: 'viewer' });
      setShowForm(false);
      loadAssignments();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error al asignar usuario';
      toast.error(message);
      logger.error('Error assigning user to team', error);
    } finally {
      setLoading(false);
    }
  };

  const handleChangeRole = async (assignmentId: number, newRole: string) => {
    try {
      await request(`/api/admin/user-teams/${assignmentId}`, {
        method: 'PATCH',
        body: { role: newRole },
        disableAutoParams: true,
      });

      toast.success('Rol actualizado');
      loadAssignments();
    } catch (error) {
      toast.error('Error al actualizar rol');
      logger.error('Error updating assignment role', error);
    }
  };

  const handleDelete = async (assignmentId: number) => {
    if (!confirm('¿Está seguro de que desea remover este usuario del equipo?')) {
      return;
    }

    try {
      await request(`/api/admin/user-teams/${assignmentId}`, {
        method: 'DELETE',
        disableAutoParams: true,
      });

      toast.success('Usuario removido del equipo');
      loadAssignments();
    } catch (error) {
      toast.error('Error al remover usuario');
      logger.error('Error removing assignment', error);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ fontSize: '20px', fontWeight: 'bold', color: 'var(--primary)' }}>🔗 Asignaciones Usuario-Equipo</h2>
        <button onClick={() => setShowForm(true)} className="btn-primary" style={{ padding: '8px 16px', fontSize: '14px', width: 'auto' }}>
          ➕ Asignar
        </button>
      </div>

      {showForm && (
        <div style={{ background: 'var(--bg-primary)', padding: '15px', borderRadius: '8px', border: '1px solid var(--border)' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 'bold', color: 'var(--primary)', marginBottom: '12px' }}>Asignar Usuario</h3>
          <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
            <select value={formData.userId} onChange={(e) => setFormData({ ...formData, userId: e.target.value })} style={{ padding: '8px', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--bg-secondary)', color: 'var(--text)' }} required>
              <option value="">Usuario...</option>
              {users.map((u) => (<option key={u.id} value={u.id}>{u.name}</option>))}
            </select>
            <select value={formData.teamId} onChange={(e) => setFormData({ ...formData, teamId: e.target.value })} style={{ padding: '8px', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--bg-secondary)', color: 'var(--text)' }} required>
              <option value="">Equipo...</option>
              {teams.map((t) => (<option key={t.id} value={t.id}>{t.name}</option>))}
            </select>
            <select value={formData.role} onChange={(e) => setFormData({ ...formData, role: e.target.value })} style={{ padding: '8px', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--bg-secondary)', color: 'var(--text)' }}>
              <option value="viewer">👁️ Visualizador</option>
              <option value="admin">⚙️ Admin</option>
            </select>
            <button type="submit" disabled={loading} className="btn-primary" style={{ padding: '8px', gridColumn: 'span 2' }}>
              {loading ? 'Asignando...' : 'Asignar'}
            </button>
            <button type="button" onClick={() => setShowForm(false)} className="btn-secondary" style={{ padding: '8px' }}>Cancelar</button>
          </form>
        </div>
      )}

      <div style={{ overflowX: 'auto', background: 'var(--bg-primary)', borderRadius: '8px', border: '1px solid var(--border)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid var(--border)', background: 'var(--bg-secondary)' }}>
              <th style={{ textAlign: 'left', padding: '12px', fontSize: '13px', color: 'var(--text)', fontWeight: 'bold' }}>Usuario</th>
              <th style={{ textAlign: 'left', padding: '12px', fontSize: '13px', color: 'var(--text)', fontWeight: 'bold' }}>Equipo</th>
              <th style={{ textAlign: 'left', padding: '12px', fontSize: '13px', color: 'var(--text)', fontWeight: 'bold' }}>Rol</th>
              <th style={{ textAlign: 'left', padding: '12px', fontSize: '13px', color: 'var(--text)', fontWeight: 'bold' }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {!loading && assignments.length === 0 ? (
              <tr><td colSpan={4} style={{ textAlign: 'center', padding: '20px', color: 'var(--text-secondary)' }}>Sin asignaciones</td></tr>
            ) : (
              assignments.map((a) => (
                <tr key={a.id} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '12px', color: 'var(--text)' }}>{a.user.name}</td>
                  <td style={{ padding: '12px', color: 'var(--text)' }}>{a.team.name}</td>
                  <td style={{ padding: '12px' }}>
                    <select value={a.role} onChange={(e) => handleChangeRole(a.id, e.target.value)} style={{ padding: '4px 8px', fontSize: '12px', borderRadius: '4px', border: '1px solid var(--border)', background: 'var(--bg-secondary)', color: 'var(--text)' }}>
                      <option value="viewer">👁️ Visualizador</option>
                      <option value="admin">⚙️ Admin</option>
                    </select>
                  </td>
                  <td style={{ padding: '12px' }}>
                    <button onClick={() => handleDelete(a.id)} className="btn-secondary" style={{ padding: '4px 10px', fontSize: '12px', background: 'var(--danger)', color: 'white' }}>🗑️</button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
