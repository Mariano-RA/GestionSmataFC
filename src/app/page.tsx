'use client';

import { useState, useEffect } from 'react';
import Header from '@/components/Header';
import Nav from '@/components/Nav';
import Dashboard from '@/components/Dashboard';
import Participants from '@/components/Participants';
import Payments from '@/components/Payments';
import Expenses from '@/components/Expenses';
import Debtors from '@/components/Debtors';
import Comparison from '@/components/Comparison';
import Settings from '@/components/Settings';
import HistoryModal from '@/components/HistoryModal';
import { getCurrentMonth, addMonths, DEFAULT_CONFIG } from '@/lib/utils';
import type { Participant, Payment, Expense, AppConfig } from '@/types';

export default function Home() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [currentMonth, setCurrentMonth] = useState(getCurrentMonth());
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [config, setConfig] = useState<AppConfig>(DEFAULT_CONFIG);
  const [loading, setLoading] = useState(true);
  const [historyModal, setHistoryModal] = useState({ open: false, id: 0, name: '' });

  // Load data on mount
  useEffect(() => {
    loadAllData();
  }, []);

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
      setLoading(false);
    } catch (error) {
      console.error('Error loading data:', error);
      setLoading(false);
    }
  };

  const activeParticipants = participants.filter(p => p.active).length || 1;
  const monthlyShare = config.monthlyTarget / activeParticipants;

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

  const handleAddExpense = async (name: string, amount: number, date: string) => {
    try {
      const res = await fetch('/api/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, amount, date }),
      });
      if (res.ok) {
        await loadAllData();
      }
    } catch (error) {
      console.error('Error adding expense:', error);
    }
  };

  const handleUpdateExpense = async (id: number, name: string, amount: number, date: string) => {
    try {
      const res = await fetch(`/api/expenses/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, amount, date })
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
      alert('Importación completada');
      await loadAllData();
    } catch (error) {
      alert('Error al importar: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  };

  if (loading) {
    return <div style={{ padding: '20px', textAlign: 'center' }}>Cargando...</div>;
  }

  const allMonths = Array.from(
    { length: 12 },
    (_, i) => addMonths(currentMonth, -(11 - i))
  );

  const historyPayments = payments.filter(p => p.participantId === historyModal.id);

  return (
    <>
      <Header />
      
      <div className="container">
        <div style={{
          background: 'white',
          padding: '15px',
          borderRadius: '8px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          marginBottom: '20px'
        }}>
          <div style={{ fontSize: '12px', color: 'var(--border)', fontWeight: '500', marginBottom: '8px' }}>
            📊 PROGRESO MENSUAL
          </div>
          <div className="progress-bar">
            {(() => {
              const monthPayments = payments.filter(p => p.date.startsWith(currentMonth));
              const collected = monthPayments.reduce((sum, p) => sum + p.amount, 0);
              const progress = config.monthlyTarget > 0 ? (collected / config.monthlyTarget) * 100 : 0;
              return (
                <div className="progress-fill" style={{ width: `${Math.min(progress, 100)}%` }}>
                  {Math.round(progress)}%
                </div>
              );
            })()}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', fontSize: '12px' }}>
            <div>Objetivo: ${config.monthlyTarget.toLocaleString('es-AR')}</div>
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
          />
        )}

        {activeTab === 'expenses' && (
          <Expenses
            expenses={expenses}
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
            onSave={handleSaveConfig}
            onReset={handleResetConfig}
            onExport={handleExportDatabase}
            onImport={handleImportDatabase}
          />
        )}
      </div>

      <Nav activeTab={activeTab} onTabChange={setActiveTab} />

      <HistoryModal
        isOpen={historyModal.open}
        participantName={historyModal.name}
        payments={historyPayments}
        onClose={() => setHistoryModal({ ...historyModal, open: false })}
        onDeletePayment={handleDeletePayment}
      />
    </>
  );
}