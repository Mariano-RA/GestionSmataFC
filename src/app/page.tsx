'use client';

import React, { useState, useCallback } from 'react';
import { useUser } from '@/context/UserContext';
import { useApi } from '@/hooks/useApi';
import { TeamDataProvider, useTeamDataContext } from '@/context/TeamDataContext';
import Header from '@/components/Header';
import Nav from '@/components/Nav';
import Toast, { type ToastMessage } from '@/components/Toast';
import {
  DashboardContainer,
  ParticipantsContainer,
  PaymentsContainer,
  ExpensesContainer,
  DebtorsContainer,
  ComparisonContainer,
  SettingsContainer,
  HistoryModalContainer,
  MonthlyProgressBarContainer,
} from '@/containers';
import { getCurrentMonth } from '@/lib/utils';

type HistoryModalState = { open: boolean; id: number; name: string };

function HomeContent({
  activeTab,
  setActiveTab,
  historyModal,
  setHistoryModal,
}: {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  historyModal: HistoryModalState;
  setHistoryModal: React.Dispatch<React.SetStateAction<HistoryModalState>>;
}) {
  const data = useTeamDataContext();

  if (data.dataLoading) {
    return <div style={{ padding: '20px', textAlign: 'center' }}>Cargando datos...</div>;
  }

  return (
    <>
      <div className={activeTab === 'participants' ? 'container container--wide' : 'container'}>
        <MonthlyProgressBarContainer />

        {activeTab === 'dashboard' && <DashboardContainer />}
        {activeTab === 'participants' && (
          <ParticipantsContainer
            onShowHistory={(id, name) => setHistoryModal({ open: true, id, name })}
          />
        )}
        {activeTab === 'payments' && <PaymentsContainer />}
        {activeTab === 'expenses' && <ExpensesContainer />}
        {activeTab === 'debtors' && <DebtorsContainer />}
        {activeTab === 'comparison' && <ComparisonContainer />}
        {activeTab === 'settings' && <SettingsContainer />}
      </div>

      <Nav activeTab={activeTab} onTabChange={setActiveTab} />

      <HistoryModalContainer
        isOpen={historyModal.open}
        participantId={historyModal.id}
        participantName={historyModal.name}
        onClose={() => setHistoryModal(prev => ({ ...prev, open: false }))}
      />
    </>
  );
}

export default function Home() {
  const { user, currentTeamId, isAuthenticated } = useUser();
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

  if (!user || !currentTeamId || !isAuthenticated) {
    return <div style={{ padding: '20px', textAlign: 'center' }}>Cargando usuario y equipo...</div>;
  }

  return (
    <>
      <Header />
      <Toast messages={toastMessages} onRemove={removeToast} />

      <TeamDataProvider
        request={request}
        currentTeamId={currentTeamId}
        currentMonth={currentMonth}
        setCurrentMonth={setCurrentMonth}
        addToast={addToast}
      >
        <HomeContent
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          historyModal={historyModal}
          setHistoryModal={setHistoryModal}
        />
      </TeamDataProvider>
    </>
  );
}
