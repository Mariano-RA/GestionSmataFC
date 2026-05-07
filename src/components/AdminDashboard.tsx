'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/context/UserContext';
import { useApi } from '@/hooks/useApi';
import AdminUsers from './AdminUsers';
import AdminTeams from './AdminTeams';
import AdminUserTeams from './AdminUserTeams';
import AdminStats from './AdminStats';
import AdminLogs from './AdminLogs';
import toast from 'react-hot-toast';
import { logger } from '@/lib/logger';

type AdminTab = 'dashboard' | 'users' | 'teams' | 'assignments' | 'stats' | 'logs';

interface DashboardSummary {
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
}

interface ActiveUserStat {
  userId: number;
  actionCount: number;
  user: {
    id: number;
    name: string;
    email: string;
  };
}

interface RecentAction {
  id: number;
  entity: string;
  action: string;
  description: string;
}

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
  summary?: DashboardSummary;
  mostActiveUsers?: ActiveUserStat[];
  recentActions?: RecentAction[];
  teamStats?: TeamStat[];
  actionsByEntity?: ActionByEntity[];
}

interface DebtAuditRow {
  participantId: number;
  name: string;
  joinDate: string;
  joinMonth: string;
  zeroMonths: string[];
  missingSnapshots: string[];
  inconsistentSnapshots: Array<{ month: string; active: boolean; status: string | null }>;
}

interface DebtAuditResponse {
  teamId: number;
  fromMonth: string;
  toMonth: string;
  affectedCount: number;
  rows: DebtAuditRow[];
}

/** useApi devuelve ya el .data del API (objeto de stats), no el envoltorio */

export default function AdminDashboard() {
  const router = useRouter();
  const { user: currentUser } = useUser();
  const { request } = useApi();
  const [activeTab, setActiveTab] = useState<AdminTab>('dashboard');
  const [stats, setStats] = useState<AdminStatsData | null>(null);
  const [loadingStats, setLoadingStats] = useState(false);
  const [downloadingBackup, setDownloadingBackup] = useState(false);

  const [auditTeamId, setAuditTeamId] = useState<number>(1);
  const [auditFromMonth, setAuditFromMonth] = useState<string>('');
  const [auditToMonth, setAuditToMonth] = useState<string>('');
  const [auditLoading, setAuditLoading] = useState(false);
  const [auditApplyingFix, setAuditApplyingFix] = useState(false);
  const [auditResult, setAuditResult] = useState<DebtAuditResponse | null>(null);

  const downloadFullBackup = async () => {
    try {
      setDownloadingBackup(true);
      const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
      const res = await fetch('/api/admin/backup', {
        method: 'GET',
        credentials: 'include',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      if (!res.ok) {
        let message = 'No se pudo descargar el backup completo';
        try {
          const raw = await res.json();
          message = raw?.error || raw?.data?.error || message;
        } catch {
          // sin cuerpo JSON
        }
        throw new Error(message);
      }

      const blob = await res.blob();
      const dispo = res.headers.get('content-disposition') || '';
      const fileNameMatch = dispo.match(/filename="([^"]+)"/i);
      const fileName = fileNameMatch?.[1] || `backup-completo-${new Date().toISOString().slice(0, 10)}.json`;
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success('Backup completo descargado');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Error descargando backup completo');
      logger.error('Error downloading full backup', error);
    } finally {
      setDownloadingBackup(false);
    }
  };

  // Redirigir si no es super_admin
  useEffect(() => {
    if (currentUser && currentUser.globalRole !== 'super_admin') {
      toast.error('Acceso denegado: Solo super administradores');
      router.push('/');
    }
  }, [currentUser, router]);

  // Cargar estadísticas
  useEffect(() => {
    if (activeTab === 'dashboard') {
      loadStats();
    }
  }, [activeTab]);

  const loadStats = async () => {
    try {
      setLoadingStats(true);
      const data = await request<AdminStatsData>('/api/admin/stats', {
        disableAutoParams: true,
      });

      if (data) {
        setStats(data);
      } else {
        throw new Error('Error al cargar estadísticas');
      }
    } catch (error) {
      toast.error('Error al cargar estadísticas');
      logger.error('Error loading admin stats', error);
    } finally {
      setLoadingStats(false);
    }
  };

  const runDebtAudit = async () => {
    try {
      setAuditLoading(true);
      setAuditResult(null);

      const params = new URLSearchParams({ teamId: String(auditTeamId) });
      if (auditFromMonth.trim()) params.set('fromMonth', auditFromMonth.trim());
      if (auditToMonth.trim()) params.set('toMonth', auditToMonth.trim());

      const data = await request<DebtAuditResponse>(`/api/debt-audit?${params.toString()}`, {
        disableAutoParams: true,
      });
      if (!data) throw new Error('No se pudo ejecutar la auditoría');
      setAuditResult(data);
      toast.success('Auditoría ejecutada');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Error ejecutando auditoría');
      logger.error('Error running debt audit', error);
    } finally {
      setAuditLoading(false);
    }
  };

  const applyDebtAuditFix = async () => {
    if (!auditResult) return;
    const ok = confirm(
      'Esto va a crear snapshots faltantes (ParticipantMonthlyStatus) marcando active=false\n' +
      'para meses que no corresponden por fecha de alta.\n\n¿Continuar?'
    );
    if (!ok) return;
    try {
      setAuditApplyingFix(true);
      const body: Record<string, unknown> = { teamId: auditTeamId };
      if (auditFromMonth.trim()) body.fromMonth = auditFromMonth.trim();
      if (auditToMonth.trim()) body.toMonth = auditToMonth.trim();

      const res = await request<{ created: number; updated?: number }>('/api/debt-audit', {
        method: 'POST',
        body: { ...body, fixInconsistent: true },
        disableAutoParams: true,
      });
      toast.success(`Fix aplicado. Snapshots creados: ${res?.created ?? 0}, actualizados: ${res?.updated ?? 0}`);
      await runDebtAudit();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Error aplicando fix');
      logger.error('Error applying debt audit fix', error);
    } finally {
      setAuditApplyingFix(false);
    }
  };

  if (!currentUser || currentUser.globalRole !== 'super_admin') {
    return null;
  }

  return (
    <div style={{ background: 'var(--light)', padding: '15px', minHeight: '100vh' }}>
      <div className="container" style={{ maxWidth: '1000px' }}>
        {/* Header */}
        <div style={{ marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
          <div>
            <h1 style={{ fontSize: '28px', fontWeight: 'bold', color: 'var(--heading)', marginBottom: '8px' }}>
              🔧 Panel de Administración
            </h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
              Gestión completa del sistema, usuarios, equipos y auditoría
            </p>
          </div>
          <button
            onClick={() => router.push('/')}
            className="btn-primary"
            style={{ padding: '8px 16px', whiteSpace: 'nowrap', height: 'fit-content' }}
          >
            ← Menú Principal
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="tabs" style={{ marginBottom: '20px' }}>
          {[
            { id: 'dashboard', label: '📊 Dashboard' },
            { id: 'users', label: '👥 Usuarios' },
            { id: 'teams', label: '⚽ Equipos' },
            { id: 'assignments', label: '🔗 Asignaciones' },
            { id: 'stats', label: '📈 Estadísticas' },
            { id: 'logs', label: '📋 Logs' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as AdminTab)}
              className={`tab-btn`}
              style={{
                background: activeTab === tab.id ? 'var(--primary)' : 'var(--bg-secondary)',
                color: activeTab === tab.id ? 'white' : 'var(--text)',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content Area */}
        <div style={{ background: 'var(--bg-primary)', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', padding: '20px', border: '1px solid var(--border)' }}>
          {/* Dashboard Tab */}
          {activeTab === 'dashboard' && (
            <div>
              <h2 style={{ fontSize: '20px', fontWeight: 'bold', color: 'var(--heading)', marginBottom: '20px' }}>
                📊 Resumen del Sistema
              </h2>

              {loadingStats ? (
                <div style={{ textAlign: 'center', padding: '40px' }}>
                  <div style={{ display: 'inline-block', animation: 'spin 1s linear infinite', borderRadius: '50%', width: '40px', height: '40px', borderTop: '4px solid var(--primary)' }}></div>
                </div>
              ) : stats ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  {/* Summary Cards */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px' }}>
                    <StatCard title="Usuarios Totales" value={stats.summary?.totalUsers || 0} subtitle={`${stats.summary?.totalActiveUsers || 0} activos`} icon="👥"/>
                    <StatCard title="Equipos" value={stats.summary?.totalTeams || 0} subtitle={`${stats.summary?.totalActiveTeams || 0} activos`} icon="⚽"/>
                    <StatCard title="Participantes" value={stats.summary?.totalParticipants || 0} subtitle="registrados" icon="🏃"/>
                    <StatCard title="Auditoría" value={stats.summary?.totalAuditLogs || 0} subtitle="eventos" icon="📋"/>
                  </div>

                  <div style={{ background: 'var(--bg-secondary)', padding: '15px', borderRadius: '8px', border: '1px solid var(--border)' }}>
                    <h3 style={{ fontSize: '16px', fontWeight: 'bold', color: 'var(--heading)', marginBottom: '10px' }}>
                      💾 Backup completo del sistema
                    </h3>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '12px' }}>
                      Descarga un JSON con todas las tablas y todos los equipos.
                    </p>
                    <button
                      className="btn btn-secondary"
                      onClick={downloadFullBackup}
                      disabled={downloadingBackup}
                    >
                      {downloadingBackup ? 'Descargando...' : '📥 Descargar backup completo'}
                    </button>
                  </div>

                  <div style={{ background: 'var(--bg-secondary)', padding: '15px', borderRadius: '8px', border: '1px solid var(--border)' }}>
                    <h3 style={{ fontSize: '16px', fontWeight: 'bold', color: 'var(--heading)', marginBottom: '10px' }}>
                      🧾 Auditoría de deuda por alta (joinDate)
                    </h3>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '12px' }}>
                      Detecta jugadores/meses donde debería ser cuota 0 por fecha de alta (corte: primer sábado 00:00) y faltan snapshots para congelarlo.
                    </p>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '10px', marginBottom: '12px' }}>
                      <div className="form-group" style={{ margin: 0 }}>
                        <label style={{ fontSize: '12px' }}>Team ID</label>
                        <input
                          type="number"
                          value={auditTeamId}
                          min={1}
                          onChange={(e) => setAuditTeamId(Math.max(1, Number(e.target.value) || 1))}
                        />
                      </div>
                      <div className="form-group" style={{ margin: 0 }}>
                        <label style={{ fontSize: '12px' }}>Desde (YYYY-MM)</label>
                        <input
                          type="text"
                          value={auditFromMonth}
                          placeholder="2024-01"
                          onChange={(e) => setAuditFromMonth(e.target.value)}
                        />
                      </div>
                      <div className="form-group" style={{ margin: 0 }}>
                        <label style={{ fontSize: '12px' }}>Hasta (YYYY-MM)</label>
                        <input
                          type="text"
                          value={auditToMonth}
                          placeholder="2024-12"
                          onChange={(e) => setAuditToMonth(e.target.value)}
                        />
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                      <button
                        className="btn btn-secondary"
                        onClick={runDebtAudit}
                        disabled={auditLoading}
                      >
                        {auditLoading ? 'Auditando...' : '🔍 Auditar'}
                      </button>
                      <button
                        className="btn btn-warning"
                        onClick={applyDebtAuditFix}
                        disabled={auditApplyingFix || !auditResult || auditResult.affectedCount === 0}
                        title="Crea snapshots faltantes active=false (no pisa existentes)"
                      >
                        {auditApplyingFix ? 'Aplicando...' : '🧩 Aplicar fix (crear snapshots)'}
                      </button>
                    </div>

                    {auditResult && (
                      <div style={{ marginTop: '12px', background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: '8px', padding: '12px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', flexWrap: 'wrap', marginBottom: '10px' }}>
                          <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                            Team {auditResult.teamId} • Rango {auditResult.fromMonth} → {auditResult.toMonth}
                          </div>
                          <div style={{ fontSize: '12px', fontWeight: 'bold', color: auditResult.affectedCount > 0 ? 'var(--danger)' : 'var(--success)' }}>
                            Afectados: {auditResult.affectedCount}
                          </div>
                        </div>
                        {auditResult.affectedCount === 0 ? (
                          <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '13px' }}>No se detectaron inconsistencias.</p>
                        ) : (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            {auditResult.rows.slice(0, 20).map((r) => (
                              <div key={r.participantId} style={{ padding: '10px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-secondary)' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', flexWrap: 'wrap' }}>
                                  <div style={{ fontWeight: 'bold', color: 'var(--text)' }}>{r.name} (ID {r.participantId})</div>
                                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Alta: {r.joinDate.slice(0, 10)} (mes {r.joinMonth})</div>
                                </div>
                                <div style={{ marginTop: '6px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                                  <div>Snapshots faltantes (cuota 0): <strong>{r.missingSnapshots.length}</strong>{r.missingSnapshots.length ? ` → ${r.missingSnapshots.join(', ')}` : ''}</div>
                                  <div>Snapshots inconsistentes: <strong>{r.inconsistentSnapshots.length}</strong>{r.inconsistentSnapshots.length ? ` → ${r.inconsistentSnapshots.map((x) => x.month).join(', ')}` : ''}</div>
                                </div>
                              </div>
                            ))}
                            {auditResult.rows.length > 20 && (
                              <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-secondary)' }}>
                                Mostrando 20 de {auditResult.rows.length}. (Podemos agregar paginado/export si lo necesitás.)
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Top Users */}
                  <div style={{ background: 'var(--bg-secondary)', padding: '15px', borderRadius: '8px', border: '1px solid var(--border)' }}>
                    <h3 style={{ fontSize: '16px', fontWeight: 'bold', color: 'var(--heading)', marginBottom: '12px' }}>👥 Usuarios Más Activos</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {stats.mostActiveUsers?.slice(0, 5).map((user) => (
                        <div key={user.userId} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px', background: 'var(--bg-primary)', borderRadius: '6px' }}>
                          <div>
                            <p style={{ color: 'var(--text)', fontWeight: 'bold', fontSize: '13px' }}>{user.user.name}</p>
                            <p style={{ color: 'var(--text-secondary)', fontSize: '11px' }}>{user.user.email}</p>
                          </div>
                          <span style={{ padding: '4px 8px', borderRadius: '12px', background: 'var(--success)', color: 'white', fontSize: '11px', fontWeight: 'bold' }}>
                            {user.actionCount} acciones
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Recent Actions */}
                  <div style={{ background: 'var(--bg-secondary)', padding: '15px', borderRadius: '8px', border: '1px solid var(--border)' }}>
                    <h3 style={{ fontSize: '16px', fontWeight: 'bold', color: 'var(--heading)', marginBottom: '12px' }}>⚡ Últimas Acciones</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {stats.recentActions?.slice(0, 10).map((action) => (
                        <div key={action.id} style={{ padding: '8px', background: 'var(--bg-primary)', borderRadius: '6px', fontSize: '12px' }}>
                          <p style={{ color: 'var(--text)', fontWeight: 'bold' }}>{action.entity} - {action.action}</p>
                          <p style={{ color: 'var(--text-secondary)', fontSize: '11px' }}>{action.description}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <p style={{ color: 'var(--text-secondary)' }}>No hay estadísticas disponibles</p>
              )}
            </div>
          )}

          {/* Other Tabs */}
          {activeTab === 'users' && <AdminUsers />}
          {activeTab === 'teams' && <AdminTeams />}
          {activeTab === 'assignments' && <AdminUserTeams />}
          {activeTab === 'stats' && <AdminStats stats={stats} loading={loadingStats} />}
          {activeTab === 'logs' && <AdminLogs />}
        </div>
      </div>
    </div>
  );
}

// Componente de tarjeta de estadísticas
function StatCard({
  title,
  value,
  subtitle,
  icon,
}: {
  title: string;
  value: number | string;
  subtitle: string;
  icon: string;
}) {
  return (
    <div className="stat-card" style={{ textAlign: 'center', padding: '15px' }}>
      <div style={{ fontSize: '24px', marginBottom: '8px' }}>{icon}</div>
      <h3 style={{ fontSize: '12px', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '8px' }}>
        {title}
      </h3>
      <div className="value" style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--heading)', marginBottom: '4px' }}>
        {value}
      </div>
      <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{subtitle}</p>
    </div>
  );
}
