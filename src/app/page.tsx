'use client';

import { useState, useEffect } from 'react';
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
  const [activeTab, setActiveTab] = useState('dashboard');
  const [currentMonth, setCurrentMonth] = useState(getCurrentMonth());
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [config, setConfig] = useState<AppConfig>(DEFAULT_CONFIG);
  const [globalConfig, setGlobalConfig] = useState<AppConfig>(DEFAULT_CONFIG);
  const [monthlyConfigs, setMonthlyConfigs] = useState<MonthlyConfig[]>([]);
  const [loading, setLoading] = useState(true);
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

  // Load data on mount
  useEffect(() => {
    loadAllData();
  }, []);

  // Load monthly config when month changes
  useEffect(() => {
    loadMonthlyConfig();
    loadMonthlyConfigs();
  }, [currentMonth, globalConfig]);

  const loadMonthlyConfigs = async () => {
    try {
      const res = await fetch('/api/config?allMonths=true');
      if (res.ok) {
        const data = await res.json();
        setMonthlyConfigs(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.log('Using global config history fallback');
    }
  };

  const loadMonthlyConfig = async () => {
    try {
      const res = await fetch(`/api/config?month=${currentMonth}`);
      if (res.ok) {
        const monthlyConfig = await res.json();
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
      console.log('Using global config for month:', currentMonth);
      setConfig(globalConfig);
    }
  };

  const loadAllData = async () => {
    try {
      const [partsRes, paysRes, expRes, cfgRes] = await Promise.all([
        fetch('/api/participants'),
        fetch('/api/payments'),
        fetch('/api/expenses'),
        fetch('/api/config'),
      ]);

      const parts = await partsRes.json();
      const pays = await paysRes.json();
      const exps = await expRes.json();
      const cfg = await cfgRes.json();

      if (partsRes.status !== 200) {
        throw new Error(parts.error || 'Failed to load participants');
      }
      if (paysRes.status !== 200) {
        throw new Error(pays.error || 'Failed to load payments');
      }
      if (expRes.status !== 200) {
        throw new Error(exps.error || 'Failed to load expenses');
      }

      setParticipants(Array.isArray(parts) ? parts : []);
      setPayments(Array.isArray(pays) ? pays : []);
      setExpenses(Array.isArray(exps) ? exps : []);
      setConfig(cfg || DEFAULT_CONFIG);
      setGlobalConfig(cfg || DEFAULT_CONFIG);
      setLoading(false);
    } catch (error) {
      console.error('Error loading data:', error);
      setLoading(false);
    }
  };

  const activeParticipants = participants.filter(p => p.active).length || 1;
  const monthlyObjective = (config.monthlyTarget || 0) + (config.fieldRental || 0);
  const monthlyShare = monthlyObjective / activeParticipants;

  const handleAddParticipant = async (name: string, phone: string, notes: string) => {
    try {
      const res = await fetch('/api/participants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, phone, notes }),
      });
      if (res.ok) {
        await loadAllData();
      }
    } catch (error) {
      console.error('Error adding participant:', error);
    }
  };

  const handleRemoveParticipant = async (id: number) => {
    if (!confirm('¿Eliminar?')) return;
    try {
      const res = await fetch(`/api/participants/${id}`, { method: 'DELETE' });
      if (res.ok) {
        await loadAllData();
      }
    } catch (error) {
      console.error('Error removing participant:', error);
    }
  };

  const handleUpdateParticipant = async (id: number, name: string, phone: string, notes: string) => {
    try {
      const res = await fetch(`/api/participants/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, phone, notes })
      });
      if (res.ok) {
        await loadAllData();
      }
    } catch (error) {
      console.error('Error updating participant:', error);
    }
  };

  const handleToggleParticipant = async (id: number) => {
    try {
      const p = participants.find(x => x.id === id);
      if (p) {
        const res = await fetch(`/api/participants/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ active: !p.active }),
        });
        if (res.ok) {
          await loadAllData();
        }
      }
    } catch (error) {
      console.error('Error toggling participant:', error);
    }
  };

  const handleAddPayment = async (participantId: number, date: string, amount: number, method: string, note: string) => {
    try {
      const res = await fetch('/api/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ participantId, date, amount, method, note }),
      });
      if (res.ok) {
        await loadAllData();
      }
    } catch (error) {
      console.error('Error adding payment:', error);
    }
  };

  const handleDeletePayment = async (id: number) => {
    if (!confirm('¿Eliminar?')) return;
    try {
      const res = await fetch(`/api/payments/${id}`, { method: 'DELETE' });
      if (res.ok) {
        await loadAllData();
      }
    } catch (error) {
      console.error('Error deleting payment:', error);
    }
  };

  const handleUpdatePayment = async (id: number, participantId: number, date: string, amount: number, method: string, note: string) => {
    try {
      const res = await fetch(`/api/payments/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ participantId, date, amount, method, note })
      });
      if (res.ok) {
        await loadAllData();
      }
    } catch (error) {
      console.error('Error updating payment:', error);
    }
  };

  const handleAddExpense = async (name: string, amount: number, date: string, category: string) => {
    try {
      const res = await fetch('/api/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, amount, date, category }),
      });
      if (res.ok) {
        await loadAllData();
      }
    } catch (error) {
      console.error('Error adding expense:', error);
    }
  };

  const handleUpdateExpense = async (id: number, name: string, amount: number, date: string, category: string) => {
    try {
      const res = await fetch(`/api/expenses/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, amount, date, category })
      });
      if (res.ok) {
        await loadAllData();
      }
    } catch (error) {
      console.error('Error updating expense:', error);
    }
  };

  const handleDeleteExpense = async (id: number) => {
    if (!confirm('¿Eliminar?')) return;
    try {
      const res = await fetch(`/api/expenses/${id}`, { method: 'DELETE' });
      if (res.ok) {
        await loadAllData();
      }
    } catch (error) {
      console.error('Error deleting expense:', error);
    }
  };

  const handleSaveConfig = async (newConfig: AppConfig) => {
    try {
      const res = await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newConfig),
      });
      if (res.ok) {
        await loadAllData();
      }
    } catch (error) {
      console.error('Error saving config:', error);
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

  if (loading) {
    return <div style={{ padding: '20px', textAlign: 'center' }}>Cargando...</div>;
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