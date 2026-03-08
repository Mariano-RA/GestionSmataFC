'use client';

import React, { useState, useEffect } from 'react';
import { useApi } from '@/hooks/useApi';
import toast from 'react-hot-toast';
import { logger } from '@/lib/logger';

interface User {
  id: string;
  name: string;
  email: string;
  globalRole: string;
  active: boolean;
  createdAt: string;
  _count?: {
    userTeams: number;
  };
}

export default function AdminUsers() {
  const { request } = useApi();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    globalRole: 'user',
  });

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const data = await request<User[]>('/api/admin/users', {
        disableAutoParams: true,
      });

      if (data && Array.isArray(data)) {
        setUsers(data);
      } else {
        throw new Error('Error al cargar usuarios');
      }
    } catch (error) {
      toast.error('Error al cargar usuarios');
      logger.error('Error loading admin users', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name || !formData.email) {
      toast.error('Nombre y email son requeridos');
      return;
    }

    try {
      setLoading(true);

      if (editingUser) {
        // Actualizar usuario
        const updateData: {
          name: string;
          email: string;
          globalRole: string;
          password?: string;
        } = {
          name: formData.name,
          email: formData.email,
          globalRole: formData.globalRole,
        };

        if (formData.password) {
          updateData.password = formData.password;
        }

        await request(`/api/admin/users/${editingUser.id}`, {
          method: 'PATCH',
          body: updateData,
          disableAutoParams: true,
        });

        toast.success('Usuario actualizado');
        setEditingUser(null);
      } else {
        // Crear usuario
        if (!formData.password) {
          toast.error('Contraseña es requerida');
          return;
        }

        await request('/api/admin/users', {
          method: 'POST',
          body: formData,
          disableAutoParams: true,
        });

        toast.success('Usuario creado');
      }

      setFormData({ name: '', email: '', password: '', globalRole: 'user' });
      setShowForm(false);
      loadUsers();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error al guardar usuario';
      toast.error(message);
      logger.error('Error saving admin user', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (user: User) => {
    setEditingUser(user);
    setFormData({
      name: user.name,
      email: user.email,
      password: '',
      globalRole: user.globalRole,
    });
    setShowForm(true);
  };

  const handleDelete = async (userId: string) => {
    if (!confirm('¿Está seguro de que desea desactivar este usuario?')) {
      return;
    }

    try {
      await request(`/api/admin/users/${userId}`, {
        method: 'DELETE',
        disableAutoParams: true,
      });

      toast.success('Usuario desactivado');
      loadUsers();
    } catch (error) {
      toast.error('Error al desactivar usuario');
      logger.error('Error deactivating admin user', error);
    }
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingUser(null);
    setFormData({ name: '', email: '', password: '', globalRole: 'user' });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ fontSize: '20px', fontWeight: 'bold', color: 'var(--heading)' }}>👥 Gestión de Usuarios</h2>
        <button
          onClick={() => setShowForm(true)}
          className="btn-primary"
          style={{ padding: '8px 16px', fontSize: '14px', width: 'auto' }}
        >
          ➕ Nuevo
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <div style={{ background: 'var(--bg-primary)', padding: '15px', borderRadius: '8px', border: '1px solid var(--border)' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 'bold', color: 'var(--heading)', marginBottom: '12px' }}>
            {editingUser ? '✏️ Editar Usuario' : '➕ Crear Usuario'}
          </h3>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <input type="text" placeholder="Nombre" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} style={{ padding: '8px', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--bg-secondary)', color: 'var(--text)' }} required/>
              <input type="email" placeholder="Email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} style={{ padding: '8px', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--bg-secondary)', color: 'var(--text)' }} required/>
              <input type="password" placeholder={editingUser ? 'Contraseña (opcional)' : 'Contraseña'} value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} style={{ padding: '8px', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--bg-secondary)', color: 'var(--text)' }} required={!editingUser}/>
              <select value={formData.globalRole} onChange={(e) => setFormData({ ...formData, globalRole: e.target.value })} style={{ padding: '8px', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--bg-secondary)', color: 'var(--text)' }}>
                <option value="user">Usuario</option>
                <option value="admin">Admin</option>
                <option value="super_admin">Super Admin</option>
              </select>
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button type="submit" disabled={loading} className="btn-primary" style={{ padding: '8px 16px', fontSize: '13px', flex: 1 }}>
                {loading ? '⏳ Guardando...' : editingUser ? 'Actualizar' : 'Crear'}
              </button>
              <button type="button" onClick={handleCancel} className="btn-secondary" style={{ padding: '8px 16px', fontSize: '13px', flex: 1 }}>
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Users Table */}
      <div style={{ overflowX: 'auto', background: 'var(--bg-primary)', borderRadius: '8px', border: '1px solid var(--border)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid var(--border)', background: 'var(--bg-secondary)' }}>
              <th style={{ textAlign: 'left', padding: '12px', color: 'var(--text)', fontWeight: 'bold', fontSize: '13px' }}>Nombre</th>
              <th style={{ textAlign: 'left', padding: '12px', color: 'var(--text)', fontWeight: 'bold', fontSize: '13px' }}>Email</th>
              <th style={{ textAlign: 'left', padding: '12px', color: 'var(--text)', fontWeight: 'bold', fontSize: '13px' }}>Rol</th>
              <th style={{ textAlign: 'left', padding: '12px', color: 'var(--text)', fontWeight: 'bold', fontSize: '13px' }}>Equipos</th>
              <th style={{ textAlign: 'left', padding: '12px', color: 'var(--text)', fontWeight: 'bold', fontSize: '13px' }}>Estado</th>
              <th style={{ textAlign: 'left', padding: '12px', color: 'var(--text)', fontWeight: 'bold', fontSize: '13px' }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', padding: '20px', color: 'var(--text-secondary)' }}>⏳ Cargando...</td>
              </tr>
            ) : users.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', padding: '20px', color: 'var(--text-secondary)' }}>Sin usuarios</td>
              </tr>
            ) : (
              users.map((user) => (
                <tr key={user.id} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '12px', color: 'var(--text)' }}>{user.name}</td>
                  <td style={{ padding: '12px', color: 'var(--text-secondary)', fontSize: '13px' }}>{user.email}</td>
                  <td style={{ padding: '12px' }}>
                    <span style={{ padding: '4px 8px', borderRadius: '4px', fontSize: '12px', background: user.globalRole === 'super_admin' ? 'var(--danger)' : user.globalRole === 'admin' ? 'var(--warning)' : 'var(--success)', color: 'white' }}>
                      {user.globalRole === 'super_admin' ? '👑' : user.globalRole === 'admin' ? '⚙️' : '👤'} {user.globalRole}
                    </span>
                  </td>
                  <td style={{ padding: '12px', color: 'var(--text-secondary)' }}>{user._count?.userTeams || 0}</td>
                  <td style={{ padding: '12px' }}>
                    <span style={{ padding: '4px 8px', borderRadius: '4px', fontSize: '12px', background: user.active ? 'var(--success)' : 'var(--danger)', color: 'white' }}>
                      {user.active ? '✅ Activo' : '❌ Inactivo'}
                    </span>
                  </td>
                  <td style={{ padding: '12px', display: 'flex', gap: '6px' }}>
                    <button onClick={() => handleEdit(user)} className="btn-primary" style={{ padding: '4px 10px', fontSize: '12px' }}>✏️</button>
                    {user.active && (<button onClick={() => handleDelete(user.id)} className="btn-secondary" style={{ padding: '4px 10px', fontSize: '12px', background: 'var(--danger)', color: 'white' }}>🗑️</button>)}
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
