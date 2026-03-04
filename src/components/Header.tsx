'use client';

import { useUser } from '@/context/UserContext';
import { useRouter } from 'next/navigation';
import DarkModeToggle from './DarkModeToggle';

export default function Header() {
  const router = useRouter();
  const { user, currentTeamId, setCurrentTeamId, logout } = useUser();

  const handleTeamChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newTeamId = Number(e.target.value);
    setCurrentTeamId(newTeamId);
  };

  if (!user) {
    return (
      <div className="header">
        <h1>⚽ SMATA LIBRE ⚽</h1>
      </div>
    );
  }

  return (
    <div className="header">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <h1 style={{ margin: 0 }}>⚽ SMATA LIBRE ⚽</h1>
          
          {/* Team Selector */}
          {user.teams.length > 1 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: '600' }}>Equipo:</span>
              <select
                value={currentTeamId || ''}
                onChange={handleTeamChange}
                style={{
                  padding: '8px 12px',
                  borderRadius: '6px',
                  border: '2px solid var(--primary)',
                  background: 'var(--primary)',
                  color: 'white',
                  fontWeight: '700',
                  cursor: 'pointer',
                  fontSize: '13px',
                  boxShadow: '0 2px 6px rgba(26, 71, 42, 0.3)',
                  transition: 'all 0.2s ease',
                }}
              >
                {user.teams.map(team => (
                  <option key={team.id} value={team.id} style={{ background: 'white', color: 'black' }}>
                    ⚽ {team.name}
                  </option>
                ))}
              </select>
            </div>
          )}
          {user.teams.length === 1 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 12px', borderRadius: '6px', background: 'var(--bg-secondary)' }}>
              <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Equipo Actual:</span>
              <span style={{ fontSize: '13px', color: 'var(--primary)', fontWeight: '700' }}>⚽ {user.teams[0].name}</span>
            </div>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <DarkModeToggle />

          {/* Admin Link */}
          {user?.globalRole === 'super_admin' && (
            <button
              onClick={() => router.push('/admin')}
              style={{
                padding: '8px 12px',
                background: '#6366f1',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: '600',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
              title="Panel de administración"
            >
              🔧 Panel Admin
            </button>
          )}
          
          {/* User Menu */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            paddingLeft: '15px',
            borderLeft: '1px solid var(--border)',
          }}>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text)' }}>
                {user.name}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                {user.email}
              </div>
            </div>
            <button
              onClick={logout}
              style={{
                padding: '8px 12px',
                background: '#ff4444',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: '600',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
              title="Cerrar sesión"
            >
              Salir
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
