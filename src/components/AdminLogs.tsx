'use client';

import React, { useState, useEffect } from 'react';
import { useApi } from '@/hooks/useApi';
import toast from 'react-hot-toast';
import { logger } from '@/lib/logger';

interface AuditLog {
  id: number;
  action: string;
  entity: string;
  description: string;
  metadata: unknown;
  user: {
    id: string;
    name: string;
    email: string;
    globalRole: string;
  } | null;
  team: {
    id: number;
    name: string;
  } | null;
  ipAddress: string | null;
  createdAt: string;
}

interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasMore: boolean;
}

interface AdminLogsResponse {
  data: {
    logs: AuditLog[];
    pagination: PaginationInfo;
  };
}

export default function AdminLogs() {
  const { request } = useApi();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo>({
    page: 1,
    limit: 50,
    total: 0,
    totalPages: 0,
    hasMore: false,
  });
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({
    userId: '',
    teamId: '',
    entity: '',
    action: '',
    startDate: '',
    endDate: '',
  });

  useEffect(() => {
    loadLogs();
  }, [pagination.page, pagination.limit]);

  const loadLogs = async () => {
    try {
      setLoading(true);

      const params = new URLSearchParams();
      params.append('page', pagination.page.toString());
      params.append('limit', pagination.limit.toString());

      if (filters.userId) params.append('userId', filters.userId);
      if (filters.teamId) params.append('teamId', filters.teamId);
      if (filters.entity) params.append('entity', filters.entity);
      if (filters.action) params.append('action', filters.action);
      if (filters.startDate) params.append('startDate', filters.startDate);
      if (filters.endDate) params.append('endDate', filters.endDate);

      const data = await request<AdminLogsResponse>(`/api/admin/logs?${params.toString()}`, {
        disableAutoParams: true,
      });

      if (data?.data) {
        setLogs(data.data.logs);
        setPagination(data.data.pagination);
      } else {
        throw new Error('Error al cargar logs');
      }
    } catch (error) {
      toast.error('Error al cargar logs');
      logger.error('Error loading admin logs', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key: string, value: string) => {
    setFilters({ ...filters, [key]: value });
    setPagination({ ...pagination, page: 1 });
  };

  const handleApplyFilters = () => {
    setPagination({ ...pagination, page: 1 });
    loadLogs();
  };

  const handleClearFilters = () => {
    setFilters({
      userId: '',
      teamId: '',
      entity: '',
      action: '',
      startDate: '',
      endDate: '',
    });
    setPagination({ ...pagination, page: 1 });
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case 'CREATE':
        return 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-200';
      case 'UPDATE':
        return 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-200';
      case 'DELETE':
        return 'bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-200';
      default:
        return 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300';
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
      <h2 style={{ fontSize: '20px', fontWeight: 'bold', color: 'var(--primary)' }}>📋 Registro de Auditoría</h2>

      {/* Filters */}
      <div style={{ background: 'var(--bg-primary)', padding: '15px', borderRadius: '8px', border: '1px solid var(--border)' }}>
        <h3 style={{ fontSize: '16px', fontWeight: 'bold', color: 'var(--primary)', marginBottom: '12px' }}>🔍 Filtros</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '10px', marginBottom: '10px' }}>
          <input type="text" placeholder="Usuario ID" value={filters.userId} onChange={(e) => handleFilterChange('userId', e.target.value)} style={{ padding: '6px', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--bg-secondary)', color: 'var(--text)', fontSize: '12px' }}/>
          <input type="text" placeholder="Equipo ID" value={filters.teamId} onChange={(e) => handleFilterChange('teamId', e.target.value)} style={{ padding: '6px', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--bg-secondary)', color: 'var(--text)', fontSize: '12px' }}/>
          <select value={filters.entity} onChange={(e) => handleFilterChange('entity', e.target.value)} style={{ padding: '6px', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--bg-secondary)', color: 'var(--text)', fontSize: '12px' }}>
            <option value="">Entidad...</option>
            <option value="User">Usuario</option>
            <option value="Team">Equipo</option>
            <option value="Payment">Pago</option>
            <option value="Expense">Gasto</option>
          </select>
          <select value={filters.action} onChange={(e) => handleFilterChange('action', e.target.value)} style={{ padding: '6px', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--bg-secondary)', color: 'var(--text)', fontSize: '12px' }}>
            <option value="">Acción...</option>
            <option value="CREATE">Crear</option>
            <option value="UPDATE">Actualizar</option>
            <option value="DELETE">Eliminar</option>
          </select>
          <input type="date" value={filters.startDate} onChange={(e) => handleFilterChange('startDate', e.target.value)} style={{ padding: '6px', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--bg-secondary)', color: 'var(--text)', fontSize: '12px' }}/>
          <input type="date" value={filters.endDate} onChange={(e) => handleFilterChange('endDate', e.target.value)} style={{ padding: '6px', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--bg-secondary)', color: 'var(--text)', fontSize: '12px' }}/>
        </div>
        <div style={{ display: 'flex', gap: '8px', fontSize: '12px' }}>
          <button onClick={handleApplyFilters} className="btn-primary" style={{ padding: '6px 12px', flex: 1 }}>Aplicar</button>
          <button onClick={handleClearFilters} className="btn-secondary" style={{ padding: '6px 12px', flex: 1 }}>Limpiar</button>
        </div>
      </div>

      {/* Logs List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-secondary)' }}>⏳ Cargando...</div>
        ) : logs.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-secondary)' }}>Sin registros</div>
        ) : (
          logs.map((log) => (
            <div key={log.id} style={{ background: 'var(--bg-primary)', padding: '12px', borderRadius: '6px', border: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '8px' }}>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <span style={{ padding: '3px 8px', borderRadius: '3px', fontSize: '11px', fontWeight: 'bold', color: 'white', background: log.action === 'CREATE' ? 'var(--success)' : log.action === 'UPDATE' ? 'var(--warning)' : 'var(--danger)' }}>
                    {log.action}
                  </span>
                  <span style={{ fontSize: '13px', fontWeight: 'bold', color: 'var(--text)' }}>{log.entity}</span>
                </div>
                <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{new Date(log.createdAt).toLocaleDateString()}</span>
              </div>
              <p style={{ fontSize: '12px', color: 'var(--text)', marginBottom: '8px' }}>{log.description}</p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', gap: '10px', fontSize: '11px' }}>
                {log.user && (<div><p style={{ color: 'var(--text-secondary)' }}>👤 Usuario</p><p style={{ color: 'var(--text)', fontWeight: 'bold' }}>{log.user.name}</p></div>)}
                {log.team && (<div><p style={{ color: 'var(--text-secondary)' }}>⚽ Equipo</p><p style={{ color: 'var(--text)', fontWeight: 'bold' }}>{log.team.name}</p></div>)}
                {log.ipAddress && (<div><p style={{ color: 'var(--text-secondary)' }}>🌐 IP</p><p style={{ color: 'var(--text)', fontWeight: 'bold', fontSize: '10px' }}>{log.ipAddress}</p></div>)}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Pagination */}
      {!loading && logs.length > 0 && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', background: 'var(--bg-primary)', borderRadius: '6px', border: '1px solid var(--border)', fontSize: '12px', color: 'var(--text-secondary)' }}>
          <span>Página {pagination.page} de {pagination.totalPages}</span>
          <div style={{ display: 'flex', gap: '6px' }}>
            <button onClick={() => setPagination({ ...pagination, page: pagination.page - 1 })} disabled={pagination.page === 1} className="btn-primary" style={{ padding: '4px 10px', fontSize: '11px' }}>← Ant</button>
            <button onClick={() => setPagination({ ...pagination, page: pagination.page + 1 })} disabled={!pagination.hasMore} className="btn-primary" style={{ padding: '4px 10px', fontSize: '11px' }}>Sig →</button>
          </div>
        </div>
      )}
    </div>
  );
}
