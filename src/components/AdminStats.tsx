'use client';

import React from 'react';

interface TeamStat {
  id: number;
  name: string;
  _count: {
    participants: number;
    payments: number;
    expenses: number;
    userTeams: number;
  };
}

interface ActionByEntity {
  entity: string;
  action: string;
  _count: number;
}

interface AdminStatsData {
  summary?: {
    totalUsers: number;
    totalActiveUsers: number;
    totalTeams: number;
    totalActiveTeams: number;
    totalParticipants: number;
    totalAuditLogs: number;
    totalPayments: number;
    totalExpenses: number;
    inactiveUsers: number;
    inactiveTeams: number;
  };
  teamStats?: TeamStat[];
  actionsByEntity?: ActionByEntity[];
}

interface AdminStatsProps {
  stats: AdminStatsData | null;
  loading: boolean;
}

export default function AdminStats({ stats, loading }: AdminStatsProps) {
  if (loading || !stats) {
    return (
      <div style={{ textAlign: 'center', padding: '40px' }}>
        <div style={{ display: 'inline-block', animation: 'spin 1s linear infinite', borderRadius: '50%', width: '40px', height: '40px', borderTop: '4px solid var(--primary)' }}></div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <h2 style={{ fontSize: '20px', fontWeight: 'bold', color: 'var(--primary)' }}>📈 Estadísticas del Sistema</h2>

      {/* Summary Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px' }}>
        <div className="stat-card" style={{ padding: '15px' }}>
          <h3 style={{ fontSize: '12px', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '8px' }}>👥 Usuarios</h3>
          <div className="value" style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--primary)', marginBottom: '4px' }}>{stats.summary?.totalUsers || 0}</div>
          <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{stats.summary?.totalActiveUsers || 0} activos</p>
        </div>

        <div className="stat-card" style={{ padding: '15px' }}>
          <h3 style={{ fontSize: '12px', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '8px' }}>⚽ Equipos</h3>
          <div className="value" style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--success)', marginBottom: '4px' }}>{stats.summary?.totalTeams || 0}</div>
          <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{stats.summary?.totalActiveTeams || 0} activos</p>
        </div>

        <div className="stat-card" style={{ padding: '15px' }}>
          <h3 style={{ fontSize: '12px', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '8px' }}>🏃 Participantes</h3>
          <div className="value" style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--warning)', marginBottom: '4px' }}>{stats.summary?.totalParticipants || 0}</div>
          <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>registrados</p>
        </div>

        <div className="stat-card" style={{ padding: '15px' }}>
          <h3 style={{ fontSize: '12px', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '8px' }}>📋 Auditoría</h3>
          <div className="value" style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--danger)', marginBottom: '4px' }}>{stats.summary?.totalAuditLogs || 0}</div>
          <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>eventos</p>
        </div>
        <div className="stat-card">
          <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '6px' }}>👥 Participantes</p>
          <div className="value" style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--primary)', marginBottom: '4px' }}>{stats.summary?.totalParticipants || 0}</div>
          <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>en todos los equipos</p>
        </div>
        <div className="stat-card">
          <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '6px' }}>📋 Auditoría</p>
          <div className="value" style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--warning)', marginBottom: '4px' }}>{stats.summary?.totalAuditLogs || 0}</div>
          <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>eventos registrados</p>
        </div>
      </div>

      {/* Team Statistics */}
      <div style={{ background: 'var(--bg-primary)', padding: '15px', borderRadius: '8px', border: '1px solid var(--border)' }}>
        <h3 style={{ fontSize: '16px', fontWeight: 'bold', color: 'var(--primary)', marginBottom: '12px' }}>⚽ Estadísticas por Equipo</h3>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--border)' }}>
                <th style={{ textAlign: 'left', padding: '10px', color: 'var(--primary)', fontWeight: 'bold', fontSize: '13px' }}>Equipo</th>
                <th style={{ textAlign: 'center', padding: '10px', color: 'var(--primary)', fontWeight: 'bold', fontSize: '13px' }}>Participantes</th>
                <th style={{ textAlign: 'center', padding: '10px', color: 'var(--primary)', fontWeight: 'bold', fontSize: '13px' }}>Pagos</th>
                <th style={{ textAlign: 'center', padding: '10px', color: 'var(--primary)', fontWeight: 'bold', fontSize: '13px' }}>Gastos</th>
                <th style={{ textAlign: 'center', padding: '10px', color: 'var(--primary)', fontWeight: 'bold', fontSize: '13px' }}>Admins</th>
              </tr>
            </thead>
            <tbody>
              {stats.teamStats?.map((team) => (
                <tr key={team.id} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '10px', color: 'var(--text)', fontWeight: 'bold', fontSize: '13px' }}>{team.name}</td>
                  <td style={{ textAlign: 'center', padding: '10px', color: 'var(--text)', fontSize: '12px' }}>{team._count.participants}</td>
                  <td style={{ textAlign: 'center', padding: '10px', color: 'var(--text)', fontSize: '12px' }}>{team._count.payments}</td>
                  <td style={{ textAlign: 'center', padding: '10px', color: 'var(--text)', fontSize: '12px' }}>{team._count.expenses}</td>
                  <td style={{ textAlign: 'center', padding: '10px', color: 'var(--text)', fontSize: '12px' }}>{team._count.userTeams}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Actions by Entity */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '15px' }}>
        <div style={{ background: 'var(--bg-primary)', padding: '15px', borderRadius: '8px', border: '1px solid var(--border)' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 'bold', color: 'var(--primary)', marginBottom: '12px' }}>📊 Acciones por Entidad</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {stats.actionsByEntity?.map((stat, idx: number) => (
              <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px', background: 'var(--bg-secondary)', borderRadius: '6px', fontSize: '12px' }}>
                <div>
                  <p style={{ color: 'var(--text)', fontWeight: 'bold' }}>{stat.entity}</p>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '11px' }}>{stat.action}</p>
                </div>
                <span style={{ padding: '4px 8px', borderRadius: '4px', background: 'var(--primary)', color: 'white', fontWeight: 'bold', fontSize: '11px' }}>{stat._count}</span>
              </div>
            ))}
          </div>
        </div>

        <div style={{ background: 'var(--bg-primary)', padding: '15px', borderRadius: '8px', border: '1px solid var(--border)' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 'bold', color: 'var(--primary)', marginBottom: '12px' }}>💰 Transacciones</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px', background: 'var(--bg-secondary)', borderRadius: '6px', fontSize: '12px' }}>
              <p style={{ color: 'var(--text)' }}>💳 Total Pagos</p>
              <span style={{ padding: '4px 8px', borderRadius: '4px', background: 'var(--success)', color: 'white', fontWeight: 'bold', fontSize: '11px' }}>{stats.summary?.totalPayments || 0}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px', background: 'var(--bg-secondary)', borderRadius: '6px', fontSize: '12px' }}>
              <p style={{ color: 'var(--text)' }}>📝 Total Gastos</p>
              <span style={{ padding: '4px 8px', borderRadius: '4px', background: 'var(--danger)', color: 'white', fontWeight: 'bold', fontSize: '11px' }}>{stats.summary?.totalExpenses || 0}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px', background: 'var(--bg-secondary)', borderRadius: '6px', fontSize: '12px' }}>
              <p style={{ color: 'var(--text)' }}>⚠️ Usuarios Inactivos</p>
              <span style={{ padding: '4px 8px', borderRadius: '4px', background: 'var(--text-secondary)', color: 'white', fontWeight: 'bold', fontSize: '11px' }}>{stats.summary?.inactiveUsers || 0}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px', background: 'var(--bg-secondary)', borderRadius: '6px', fontSize: '12px' }}>
              <p style={{ color: 'var(--text)' }}>⚠️ Equipos Inactivos</p>
              <span style={{ padding: '4px 8px', borderRadius: '4px', background: 'var(--text-secondary)', color: 'white', fontWeight: 'bold', fontSize: '11px' }}>{stats.summary?.inactiveTeams || 0}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
