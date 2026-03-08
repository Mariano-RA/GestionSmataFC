'use client';

import { useUser } from '@/context/UserContext';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import DarkModeToggle from './DarkModeToggle';

export default function Header() {
  const router = useRouter();
  const { user, currentTeamId, setCurrentTeamId, setPreferredTeam, logout } = useUser();
  const [savingPreferred, setSavingPreferred] = useState(false);

  const handleTeamChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newTeamId = Number(e.target.value);
    setCurrentTeamId(newTeamId);
  };

  const handleSetPreferred = async () => {
    if (!currentTeamId) return;
    setSavingPreferred(true);
    try {
      await setPreferredTeam(currentTeamId);
    } catch (error) {
      console.error('Error setting preferred team:', error);
    } finally {
      setSavingPreferred(false);
    }
  };

  if (!user) {
    return (
      <div className="header">
        <h1>⚽ Gestion SMATA ⚽</h1>
      </div>
    );
  }

  return (
    <div className="header">
      <div className="app-header-row">
        <div className="app-header-top">
          <h1 style={{ margin: 0 }}>⚽ Gestion SMATA ⚽</h1>
          <div className="app-header-actions">
            <div className="header-dark-toggle">
              <DarkModeToggle />
            </div>

            {/* Admin Link */}
            {user?.globalRole === 'super_admin' && (
              <button
                onClick={() => router.push('/admin')}
                className="header-admin-btn"
                title="Panel de administración"
              >
                🔧 Panel Admin
              </button>
            )}

            {/* User Menu */}
            <div className="user-menu-wrap">
              <div className="user-info-block">
                <div className="user-name">
                  {user.name}
                </div>
                <div className="user-email">
                  {user.email}
                </div>
              </div>
              <button
                onClick={logout}
                className="header-logout-btn"
                title="Cerrar sesión"
              >
                Salir
              </button>
            </div>
          </div>
        </div>

        <div className="app-header-bottom">
          {user.teams.length > 1 && (
            <div className="team-selector-wrap">
              <span className="team-selector-label">Equipo:</span>
              <select
                value={currentTeamId || ''}
                onChange={handleTeamChange}
                className="team-selector-input"
              >
                {user.teams.map(team => (
                  <option key={team.id} value={team.id} style={{ background: 'white', color: 'black' }}>
                    ⚽ {team.name}
                  </option>
                ))}
              </select>
              <button
                onClick={handleSetPreferred}
                disabled={savingPreferred}
                title={user.preferredTeamId === currentTeamId ? 'Este es tu equipo preferido' : 'Establecer como equipo preferido'}
                className={`preferred-team-btn ${user.preferredTeamId === currentTeamId ? 'is-active' : ''}`}
              >
                {savingPreferred ? '⏳' : user.preferredTeamId === currentTeamId ? '⭐' : '☆'}
              </button>
            </div>
          )}
          {user.teams.length === 1 && (
            <div className="single-team-chip">
              <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Equipo Actual:</span>
              <span style={{ fontSize: '13px', color: 'var(--heading)', fontWeight: '700' }}>⚽ {user.teams[0].name}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
