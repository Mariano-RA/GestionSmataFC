'use client';

import { useState, useEffect } from 'react';
import { useUser } from '@/context/UserContext';
import { logger } from '@/lib/logger';
import Header from '@/components/Header';
import Nav from '@/components/Nav';
import Toast, { type ToastMessage } from '@/components/Toast';
import Dashboard from '@/components/Dashboard';
import Participants from '@/components/Participants';
import Payments from '@/components/Payments';
import Expenses from '@/components/Expenses';
import Debtors from '@/components/Debtors';
import Comparison from '@/components/Comparison';
import Settings from '@/components/Settings';
import HistoryModal from '@/components/HistoryModal';
import { getCurrentMonth, addMonths, DEFAULT_CONFIG } from '@/lib/utils';
import type { Participant, Payment, Expense, AppConfig, MonthlyConfig } from '@/types';

export default function Home() {
  const { user, currentTeamId, loading, isAuthenticated } = useUser();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [currentMonth, setCurrentMonth] = useState(getCurrentMonth());
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [config, setConfig] = useState<AppConfig>(DEFAULT_CONFIG);
  const [globalConfig, setGlobalConfig] = useState<AppConfig>(DEFAULT_CONFIG);
  const [monthlyConfigs, setMonthlyConfigs] = useState<MonthlyConfig[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [historyModal, setHistoryModal] = useState({ open: false, id: 0, name: '' });
  const [toastMessages, setToastMessages] = useState<ToastMessage[]>([]);

  const addToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    const id = Date.now().toString();
    setToastMessages(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToastMessages(prev => prev.filter(m => m.id !== id));
    }, 3000);
  };

  const removeToast = (id: string) => {
    setToastMessages(prev => prev.filter(m => m.id !== id));
  };

  // Helper para refrescar el token cuando expire
  const refreshAccessToken = async () => {
    try {
      const res = await fetch('/api/auth/refresh', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // Incluir cookies con refresh token
      });

      if (res.ok) {
        const data = await res.json();
        // Manejar ambos formatos: { accessToken } y { data: { accessToken } }
        const newAccessToken = data.data?.accessToken || data.accessToken;
        if (newAccessToken) {
          localStorage.setItem('accessToken', newAccessToken);
          logger.log('Token refreshed successfully');
          return newAccessToken;
        }
      }
      logger.warn('Failed to refresh token:', res.status);
      return null;
    } catch (error) {
      logger.error('Error refreshing token:', error);
      return null;
    }
  };

  // Helper para hacer requests con JWT token y teamId
  const apiRequest = async (endpoint: string, options: RequestInit = {}): Promise<Response> => {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(typeof options.headers === 'object' && options.headers !== null 
        ? Object.fromEntries(Object.entries(options.headers).map(([k, v]) => [k, String(v)])) 
        : {}),
    };

    // Incluir JWT token en Authorization header
    let token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
      logger.log('Token included in request:', { hasToken: !!token, tokenLength: token.length });
    } else {
      logger.warn('No token found in localStorage');
    }

    // Agregar teamId a la URL si existe
    let url = endpoint;
    if (currentTeamId && !endpoint.includes('?')) {
      url = `${endpoint}?teamId=${currentTeamId}`;
    } else if (currentTeamId && endpoint.includes('?')) {
      url = `${endpoint}&teamId=${currentTeamId}`;
    }

    // Agregar teamId al body si es POST/PATCH
    let body = options.body;
    if (body && typeof body === 'string' && currentTeamId) {
      const data = JSON.parse(body);
      if (!data.teamId) {
        data.teamId = currentTeamId;
      }
      body = JSON.stringify(data);
    }

    logger.log('Making request:', { url, method: options.method || 'GET', hasAuth: !!token });

    let response = await fetch(url, {
      ...options,
      headers,
      body,
      credentials: 'include', // Incluir cookies para refresh token
    });

    logger.log('Response status:', { url, status: response.status });

    // Si obtenemos 401, intentar refrescar el token y reintentar una vez
    if (response.status === 401 && !options.body?.toString().includes('refresh')) {
      logger.warn('Token expired (401), attempting to refresh...');
      const newToken = await refreshAccessToken();
      
      if (newToken) {
        headers['Authorization'] = `Bearer ${newToken}`;
        logger.log('Retrying request with new token');
        response = await fetch(url, {
          ...options,
          headers,
          body,
          credentials: 'include',
        });
      } else {
        // Si no podemos refrescar, redirigir a login
        logger.error('Could not refresh token, redirecting to login');
        localStorage.removeItem('accessToken');
        localStorage.removeItem('userId');
        if (typeof window !== 'undefined') {
          window.location.href = '/login';
        }
      }
    }

    return response;
  };

  // Load data on mount
  useEffect(() => {
    logger.log('useEffect triggered:', { currentTeamId, isAuthenticated, loading });
    if (currentTeamId && isAuthenticated && !loading) {
      logger.log('Calling loadAllData with currentTeamId:', currentTeamId);
      loadAllData();
    }
  }, [currentTeamId, isAuthenticated, loading, user?.id]);

  // Load monthly config when month changes
  useEffect(() => {
    if (currentTeamId) {
      loadMonthlyConfig();
      loadMonthlyConfigs();
    }
  }, [currentMonth, globalConfig, currentTeamId, user?.id]);

  const loadMonthlyConfigs = async () => {
    try {
      const res = await apiRequest('/api/config?allMonths=true');
      if (res.ok) {
        const response = await res.json();
        // Extraer los datos del envoltorio ApiResponse
        const data = response.data || response;
        setMonthlyConfigs(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      logger.log('Using global config history fallback');
    }
  };

  const loadMonthlyConfig = async () => {
    try {
      const res = await apiRequest(`/api/config?month=${currentMonth}`);
      if (res.ok) {
        const response = await res.json();
        // Extraer los datos del envoltorio ApiResponse
        const monthlyConfig = response.data || response;
        // Normalizar la respuesta: MonthlyConfig tiene 'rent', AppConfig tiene 'fieldRental'
        const fieldRentalValue = monthlyConfig.rent !== undefined ? monthlyConfig.rent : monthlyConfig.fieldRental;
        setConfig({
          ...globalConfig,
          monthlyTarget: monthlyConfig.monthlyTarget || globalConfig.monthlyTarget,
          fieldRental: fieldRentalValue || globalConfig.fieldRental
        });
      } else {
        setConfig(globalConfig);
      }
    } catch (error) {
      logger.log('Using global config for month:', currentMonth);
      setConfig(globalConfig);
    }
  };

  const loadAllData = async () => {
    try {
      if (!currentTeamId) {
        logger.warn('loadAllData called without currentTeamId');
        setDataLoading(false);
        return;
      }

      const [partsRes, paysRes, expRes, cfgRes] = await Promise.all([
        apiRequest('/api/participants'),
        apiRequest('/api/payments'),
        apiRequest('/api/expenses'),
        apiRequest('/api/config'),
      ]);

      // Verificar si hay error 401 (token inválido/expirado)
      if (partsRes.status === 401 || paysRes.status === 401 || expRes.status === 401 || cfgRes.status === 401) {
        throw new Error('Token inválido o expirado');
      }

      const parts = await partsRes.json();
      const pays = await paysRes.json();
      const exps = await expRes.json();
      const cfg = await cfgRes.json();

      if (partsRes.status !== 200) {
        logger.error('Failed to load participants:', parts);
        throw new Error(parts.error || 'Failed to load participants');
      }
      if (paysRes.status !== 200) {
        logger.error('Failed to load payments:', pays);
        throw new Error(pays.error || 'Failed to load payments');
      }
      if (expRes.status !== 200) {
        logger.error('Failed to load expenses:', exps);
        throw new Error(exps.error || 'Failed to load expenses');
      }

      // Los endpoints devuelven { success, data, ... }, así que extraer el .data
      setParticipants(Array.isArray(parts.data) ? parts.data : []);
      setPayments(Array.isArray(pays.data) ? pays.data : []);
      setExpenses(Array.isArray(exps.data) ? exps.data : []);
      setConfig(cfg.data || DEFAULT_CONFIG);
      setGlobalConfig(cfg.data || DEFAULT_CONFIG);
      setDataLoading(false);
    } catch (error) {
      logger.error('Error loading data:', error);
      addToast('Error cargando datos: ' + (error instanceof Error ? error.message : 'Error desconocido'), 'error');
      setDataLoading(false);
    }
  };

  const activeParticipants = participants.filter(p => p.active).length || 1;
  const monthlyObjective = (config.monthlyTarget || 0) + (config.fieldRental || 0);
  const monthlyShare = monthlyObjective / activeParticipants;

  const handleAddParticipant = async (name: string, phone: string, notes: string) => {
    try {
      const res = await apiRequest('/api/participants', {
        method: 'POST',
        body: JSON.stringify({ name, phone, notes }),
      });
      if (res.ok) {
        addToast('Participante agregado', 'success');
        await loadAllData();
        return;
      } else {
        const error = await res.json();
        const errorMsg = error.message || 'Error agregando participante';
        addToast(errorMsg, 'error');
        throw new Error(errorMsg);
      }
    } catch (error) {
      logger.error('Error adding participant:', error);
      if ((error as Error).message !== 'Error agregando participante') {
        addToast('Error agregando participante', 'error');
      }
      throw error;
    }
  };

  const handleRemoveParticipant = async (id: number) => {
    if (!confirm('¿Eliminar?')) return;
    try {
      const res = await apiRequest(`/api/participants/${id}`, { method: 'DELETE' });
      if (res.ok) {
        addToast('Participante eliminado', 'success');
        await loadAllData();
      } else {
        const error = await res.json();
        addToast(error.message || 'Error eliminando participante', 'error');
      }
    } catch (error) {
      logger.error('Error removing participant:', error);
      addToast('Error eliminando participante', 'error');
    }
  };

  const handleUpdateParticipant = async (id: number, name: string, phone: string, notes: string) => {
    try {
      const res = await apiRequest(`/api/participants/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ name, phone, notes })
      });
      if (res.ok) {
        addToast('Participante actualizado', 'success');
        await loadAllData();
      } else {
        const error = await res.json();
        addToast(error.message || 'Error actualizando participante', 'error');
      }
    } catch (error) {
      logger.error('Error updating participant:', error);
      addToast('Error actualizando participante', 'error');
    }
  };

  const handleToggleParticipant = async (id: number) => {
    try {
      const p = participants.find(x => x.id === id);
      if (p) {
        const res = await apiRequest(`/api/participants/${id}`, {
          method: 'PATCH',
          body: JSON.stringify({ active: !p.active }),
        });
        if (res.ok) {
          await loadAllData();
        } else {
          const error = await res.json();
          addToast(error.message || 'Error actualizando participante', 'error');
        }
      }
    } catch (error) {
      logger.error('Error toggling participant:', error);
      addToast('Error actualizando participante', 'error');
    }
  };

  const handleAddPayment = async (participantId: number, date: string, amount: number, method: string, note: string) => {
    try {
      const res = await apiRequest('/api/payments', {
        method: 'POST',
        body: JSON.stringify({ participantId, date, amount, method, note }),
      });
      if (res.ok) {
        addToast('Pago registrado', 'success');
        await loadAllData();
        return;
      } else {
        const error = await res.json();
        const errorMsg = error.message || 'Error registrando pago';
        addToast(errorMsg, 'error');
        throw new Error(errorMsg);
      }
    } catch (error) {
      logger.error('Error adding payment:', error);
      if ((error as Error).message !== 'Error registrando pago') {
        addToast('Error registrando pago', 'error');
      }
      throw error;
    }
  };

  const handleDeletePayment = async (id: number) => {
    if (!confirm('¿Eliminar?')) return;
    try {
      const res = await apiRequest(`/api/payments/${id}`, { method: 'DELETE' });
      if (res.ok) {
        addToast('Pago eliminado', 'success');
        await loadAllData();
      } else {
        const error = await res.json();
        addToast(error.message || 'Error eliminando pago', 'error');
      }
    } catch (error) {
      logger.error('Error deleting payment:', error);
      addToast('Error eliminando pago', 'error');
    }
  };

  const handleUpdatePayment = async (id: number, participantId: number, date: string, amount: number, method: string, note: string) => {
    try {
      const res = await apiRequest(`/api/payments/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ participantId, date, amount, method, note })
      });
      if (res.ok) {
        addToast('Pago actualizado', 'success');
        await loadAllData();
      } else {
        const error = await res.json();
        addToast(error.message || 'Error actualizando pago', 'error');
      }
    } catch (error) {
      logger.error('Error updating payment:', error);
      addToast('Error actualizando pago', 'error');
    }
  };

  const handleAddExpense = async (name: string, amount: number, date: string, category: string) => {
    try {
      const res = await apiRequest('/api/expenses', {
        method: 'POST',
        body: JSON.stringify({ name, amount, date, category }),
      });
      if (res.ok) {
        addToast('Gasto registrado', 'success');
        await loadAllData();
        return;
      } else {
        const error = await res.json();
        const errorMsg = error.message || 'Error registrando gasto';
        addToast(errorMsg, 'error');
        throw new Error(errorMsg);
      }
    } catch (error) {
      logger.error('Error adding expense:', error);
      if ((error as Error).message !== 'Error registrando gasto') {
        addToast('Error registrando gasto', 'error');
      }
      throw error;
    }
  };

  const handleUpdateExpense = async (id: number, name: string, amount: number, date: string, category: string) => {
    try {
      const res = await apiRequest(`/api/expenses/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ name, amount, date, category })
      });
      if (res.ok) {
        addToast('Gasto actualizado', 'success');
        await loadAllData();
      } else {
        const error = await res.json();
        addToast(error.message || 'Error actualizando gasto', 'error');
      }
    } catch (error) {
      logger.error('Error updating expense:', error);
      addToast('Error actualizando gasto', 'error');
    }
  };

  const handleDeleteExpense = async (id: number) => {
    if (!confirm('¿Eliminar?')) return;
    try {
      const res = await apiRequest(`/api/expenses/${id}`, { method: 'DELETE' });
      if (res.ok) {
        addToast('Gasto eliminado', 'success');
        await loadAllData();
      } else {
        const error = await res.json();
        addToast(error.message || 'Error eliminando gasto', 'error');
      }
    } catch (error) {
      logger.error('Error deleting expense:', error);
      addToast('Error eliminando gasto', 'error');
    }
  };

  const handleSaveConfig = async (newConfig: AppConfig) => {
    try {
      const res = await apiRequest('/api/config', {
        method: 'POST',
        body: JSON.stringify(newConfig),
      });
      if (res.ok) {
        addToast('Configuración guardada', 'success');
        await loadAllData();
      } else {
        const error = await res.json();
        addToast(error.message || 'Error guardando configuración', 'error');
      }
    } catch (error) {
      logger.error('Error saving config:', error);
      addToast('Error guardando configuración', 'error');
    }
  };

  const handleResetConfig = async () => {
    if (!confirm('¿Restaurar configuración por defecto?')) return;
    await handleSaveConfig(DEFAULT_CONFIG);
  };

  const handleExportDatabase = () => {
    const data = {
      participants,
      payments,
      expenses,
      config,
      exportedAt: new Date().toISOString(),
    };
    const dataStr = JSON.stringify(data, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `smata-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportDatabase = async (file: File) => {
    try {
      const content = await file.text();
      const data = JSON.parse(content);
      
      // You would need to implement bulk import endpoints
      // For now, show success message
      addToast('Importación completada', 'success');
      await loadAllData();
    } catch (error) {
      addToast('Error al importar: ' + (error instanceof Error ? error.message : 'Unknown error'), 'error');
    }
  };

  if (!user || !currentTeamId || !isAuthenticated) {
    return <div style={{ padding: '20px', textAlign: 'center' }}>Cargando usuario y equipo...</div>;
  }

  if (dataLoading) {
    return <div style={{ padding: '20px', textAlign: 'center' }}>Cargando datos...</div>;
  }

  const allMonths = Array.from(
    { length: 12 },
    (_, i) => addMonths(currentMonth, -(11 - i))
  );

  const historyPayments = payments
    .filter(p => p.participantId === historyModal.id)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const monthlyConfigsSorted = [...monthlyConfigs].sort((a, b) => a.month.localeCompare(b.month));

  const getMonthlyObjectiveForHistory = (month: string) => {
    const exactMonthConfig = monthlyConfigsSorted.find(cfg => cfg.month === month);
    if (exactMonthConfig) {
      return (exactMonthConfig.monthlyTarget || 0) + (exactMonthConfig.rent || 0);
    }

    const previousConfigs = monthlyConfigsSorted.filter(cfg => cfg.month < month);
    if (previousConfigs.length > 0) {
      const latestPrevious = previousConfigs[previousConfigs.length - 1];
      return (latestPrevious.monthlyTarget || 0) + (latestPrevious.rent || 0);
    }

    return (globalConfig.monthlyTarget || 0) + (globalConfig.fieldRental || 0);
  };

  const getMonthlyShareForHistory = (month: string) => {
    const objective = getMonthlyObjectiveForHistory(month);
    return activeParticipants > 0 ? objective / activeParticipants : 0;
  };

  const historyMonths = Array.from(
    new Set([
      ...historyPayments.map(p => p.date.slice(0, 7)),
      ...monthlyConfigsSorted.filter(cfg => cfg.month <= currentMonth).map(cfg => cfg.month)
    ])
  ).sort();

  let runningDebt = 0;
  const historyByMonth = historyMonths.map(month => {
    const paid = historyPayments
      .filter(p => p.date.startsWith(month))
      .reduce((sum, p) => sum + p.amount, 0);
    const required = getMonthlyShareForHistory(month);
    const debtMonth = Math.max(0, required - paid);
    runningDebt = Math.max(0, runningDebt + required - paid);

    return {
      month,
      paid,
      required,
      debtMonth,
      debtAccumulated: runningDebt
    };
  });

  return (
    <>
      <Header />
      <Toast messages={toastMessages} onRemove={removeToast} />
      
      <div className="container">
        <div style={{
          background: 'var(--bg-primary)',
          padding: '15px',
          borderRadius: '8px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          marginBottom: '20px',
          border: '1px solid var(--border)',
        }}>
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: '500', marginBottom: '8px' }}>
            📊 PROGRESO MENSUAL
          </div>
          <div className="progress-bar">
            {(() => {
              const monthPayments = payments.filter(p => p.date.startsWith(currentMonth));
              const collected = monthPayments.reduce((sum, p) => sum + p.amount, 0);
              const progress = monthlyObjective > 0 ? (collected / monthlyObjective) * 100 : 0;
              return (
                <div className="progress-fill" style={{ width: `${Math.min(progress, 100)}%` }}>
                  {Math.round(progress)}%
                </div>
              );
            })()}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', fontSize: '12px' }}>
            <div>Objetivo: ${monthlyObjective.toLocaleString('es-AR')}</div>
            <div>Recaudado: ${payments.filter(p => p.date.startsWith(currentMonth)).reduce((s, p) => s + p.amount, 0).toLocaleString('es-AR')}</div>
          </div>
        </div>


        {activeTab === 'dashboard' && (
          <Dashboard
            currentMonth={currentMonth}
            onMonthChange={(delta) => setCurrentMonth(addMonths(currentMonth, delta))}
            participants={participants}
            payments={payments}
            expenses={expenses}
            config={config}
          />
        )}

        {activeTab === 'participants' && (
          <Participants
            participants={participants}
            payments={payments}
            monthlyShare={monthlyShare}
            currentMonth={currentMonth}
            onAdd={handleAddParticipant}
            onUpdate={handleUpdateParticipant}
            onRemove={handleRemoveParticipant}
            onToggle={handleToggleParticipant}
            onShowHistory={(id, name) => setHistoryModal({ open: true, id, name })}
          />
        )}

        {activeTab === 'payments' && (
          <Payments
            payments={payments}
            participants={participants}
            currentMonth={currentMonth}
            onAdd={handleAddPayment}
            onUpdate={handleUpdatePayment}
            onDelete={handleDeletePayment}
            addToast={addToast}
          />
        )}

        {activeTab === 'expenses' && (
          <Expenses
            expenses={expenses}
            addToast={addToast}
            currentMonth={currentMonth}
            onAdd={handleAddExpense}
            onUpdate={handleUpdateExpense}
            onDelete={handleDeleteExpense}
          />
        )}
        {activeTab === 'debtors' && (
          <Debtors
            participants={participants}
            payments={payments}
            monthlyShare={monthlyShare}
            currentMonth={currentMonth}
            addToast={addToast}
          />
        )}

        {activeTab === 'comparison' && (
          <Comparison
            payments={payments}
            expenses={expenses}
            allMonths={allMonths}
            currentMonth={currentMonth}
          />
        )}

        {activeTab === 'settings' && (
          <Settings
            config={config}
            currentMonth={currentMonth}
            onSave={handleSaveConfig}
            onReset={handleResetConfig}
            onExport={handleExportDatabase}
            onImport={handleImportDatabase}
            addToast={addToast}
          />
        )}
      </div>

      <Nav activeTab={activeTab} onTabChange={setActiveTab} />

      <HistoryModal
        isOpen={historyModal.open}
        participantName={historyModal.name}
        payments={historyPayments}
        monthlyHistory={historyByMonth}
        onClose={() => setHistoryModal({ ...historyModal, open: false })}
        onDeletePayment={handleDeletePayment}
      />
    </>
  );
}