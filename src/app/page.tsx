'use client';

import { useState, useCallback } from 'react';
import { useUser } from '@/context/UserContext';
import { useApi } from '@/hooks/useApi';
import { useTeamData } from '@/hooks/useTeamData';
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
import MonthlyProgressBar from '@/components/MonthlyProgressBar';
import { getCurrentMonth, addMonths } from '@/lib/utils';

export default function Home() {
  const { user, currentTeamId, loading, isAuthenticated } = useUser();
  const { request } = useApi();

  const [activeTab, setActiveTab] = useState('dashboard');
  const [currentMonth, setCurrentMonth] = useState(getCurrentMonth);
  const [historyModal, setHistoryModal] = useState({ open: false, id: 0, name: '' });
  const [toastMessages, setToastMessages] = useState<ToastMessage[]>([]);

  const addToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'info') => {
    const id = Date.now().toString();
    setToastMessages(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToastMessages(prev => prev.filter(m => m.id !== id));
    }, 3000);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToastMessages(prev => prev.filter(m => m.id !== id));
  }, []);

  const teamData = useTeamData(
    request,
    currentTeamId,
    currentMonth,
    addToast
  );

  const {
    participants,
    payments,
    expenses,
    config,
    globalConfig,
    monthlyConfigs,
    dataLoading,
    monthlyObjective,
    monthlyShare,
    getRequiredAmount,
    handleAddParticipant,
    handleRemoveParticipant,
    handleUpdateParticipant,
    handleToggleParticipant,
    handleAddPayment,
    handleDeletePayment,
    handleUpdatePayment,
    handleAddExpense,
    handleUpdateExpense,
    handleDeleteExpense,
    handleSaveConfig,
    handleResetConfig,
  } = teamData;

  const handleExportDatabase = useCallback(() => {
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
  }, [participants, payments, expenses, config]);

  const handleImportDatabase = useCallback(
    async (file: File) => {
      try {
        const content = await file.text();
        const data = JSON.parse(content) as {
          participants?: unknown[];
          payments?: unknown[];
          expenses?: unknown[];
          config?: unknown;
        };
        const result = await request<{ imported: { participants: number; payments: number; expenses: number; config: boolean } }>(
          '/api/backup/import',
          {
            method: 'POST',
            body: {
              teamId: currentTeamId!,
              participants: data.participants ?? [],
              payments: data.payments ?? [],
              expenses: data.expenses ?? [],
              config: data.config,
            },
            disableAutoParams: true,
          }
        );
        if (result != null) {
          const { imported } = result;
          addToast(
            `Importado: ${imported.participants} participantes, ${imported.payments} pagos, ${imported.expenses} gastos${imported.config ? ', config' : ''}`,
            'success'
          );
          await teamData.loadAllData();
        }
      } catch (error) {
        addToast('Error al importar: ' + (error instanceof Error ? error.message : 'Unknown error'), 'error');
      }
    },
    [request, currentTeamId, addToast, teamData.loadAllData]
  );

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

  const activeParticipants = participants.filter(p => p.active).length || 1;
  const getMonthlyShareForHistory = (month: string) => {
    const objective = getMonthlyObjectiveForHistory(month);
    return activeParticipants > 0 ? objective / activeParticipants : 0;
  };

  const historyMonths = Array.from(
    new Set([
      ...historyPayments.map(p => p.date.slice(0, 7)),
      ...monthlyConfigsSorted.filter(cfg => cfg.month <= currentMonth).map(cfg => cfg.month),
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
      debtAccumulated: runningDebt,
    };
  });

  return (
    <>
      <Header />
      <Toast messages={toastMessages} onRemove={removeToast} />

      <div className="container">
        <MonthlyProgressBar
          payments={payments}
          currentMonth={currentMonth}
          monthlyObjective={monthlyObjective}
        />

        {activeTab === 'dashboard' && (
          <Dashboard
            currentMonth={currentMonth}
            onMonthChange={delta => setCurrentMonth(addMonths(currentMonth, delta))}
            participants={participants}
            payments={payments}
            expenses={expenses}
            config={config}
            getRequiredAmount={getRequiredAmount}
          />
        )}

        {activeTab === 'participants' && (
          <Participants
            participants={participants}
            payments={payments}
            currentMonth={currentMonth}
            getRequiredAmount={getRequiredAmount}
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
            expenseCategories={config.expenseCategories}
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
            getRequiredAmount={getRequiredAmount}
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
        onClose={() => setHistoryModal(prev => ({ ...prev, open: false }))}
        onDeletePayment={handleDeletePayment}
      />
    </>
  );
}
