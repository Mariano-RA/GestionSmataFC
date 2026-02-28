'use client';

interface NavProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export default function Nav({ activeTab, onTabChange }: NavProps) {
  const tabs = [
    { id: 'dashboard', icon: '📊', label: 'Dashboard' },
    { id: 'participants', icon: '👥', label: 'Participantes' },
    { id: 'payments', icon: '💰', label: 'Pagos' },
    { id: 'expenses', icon: '💸', label: 'Gastos' },
    { id: 'debtors', icon: '⚠️', label: 'Deudores' },
    { id: 'comparison', icon: '📈', label: 'Análisis' },
    { id: 'settings', icon: '⚙️', label: 'Config' }
  ];

  return (
    <div className="nav-bar">
      {tabs.map(tab => (
        <button
          key={tab.id}
          className={`nav-item ${activeTab === tab.id ? 'active' : ''}`}
          onClick={() => onTabChange(tab.id)}
        >
          <div className="nav-icon">{tab.icon}</div>
          {tab.label}
        </button>
      ))}
    </div>
  );
}
