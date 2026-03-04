'use client';

import { useEffect, useState } from 'react';

interface Team {
  id: number;
  name: string;
  description?: string;
  active: boolean;
}

interface TeamSelectorProps {
  onTeamChange: (teamId: number) => void;
  currentTeamId?: number;
}

export default function TeamSelector({ onTeamChange, currentTeamId }: TeamSelectorProps) {
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadTeams();
  }, []);

  const loadTeams = async () => {
    try {
      const res = await fetch('/api/teams?active=true');
      if (!res.ok) throw new Error('Error al cargar equipos');
      const data = await res.json();
      setTeams(data);
      
      // Si hay equipos y no hay uno seleccionado, seleccionar el primero
      if (data.length > 0 && !currentTeamId) {
        onTeamChange(data[0].id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-500">Cargando equipos...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-red-500 text-sm">
        {error}
      </div>
    );
  }

  if (teams.length === 0) {
    return (
      <div className="text-gray-500 text-sm">
        No hay equipos disponibles
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <label htmlFor="team-select" className="text-sm font-medium text-gray-700 dark:text-gray-300">
        Equipo:
      </label>
      <select
        id="team-select"
        value={currentTeamId || ''}
        onChange={(e) => onTeamChange(Number(e.target.value))}
        className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg 
                   bg-white dark:bg-gray-800 text-gray-900 dark:text-white
                   focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        <option value="">Seleccionar equipo</option>
        {teams.map((team) => (
          <option key={team.id} value={team.id}>
            {team.name}
          </option>
        ))}
      </select>
    </div>
  );
}
