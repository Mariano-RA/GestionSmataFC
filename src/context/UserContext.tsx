'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { logger } from '@/lib/logger';

export interface Team {
  id: number;
  name: string;
  description?: string;
  active: boolean;
  role?: string;
}

export interface CurrentUser {
  id: number;
  email: string;
  name: string;
  globalRole: 'super_admin' | 'admin' | 'user';
  teams: (Team & { role: string })[];
  preferredTeamId?: number | null;
  actionCount?: number;
}

interface UserContextType {
  user: CurrentUser | null;
  currentTeamId: number | null;
  setCurrentTeamId: (teamId: number) => void;
  setPreferredTeam: (teamId: number) => Promise<void>;
  loading: boolean;
  error: string | null;
  logout: () => void;
  isAuthenticated: boolean;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [currentTeamId, setCurrentTeamId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  // Cargar usuario al montar
  useEffect(() => {
    const loadUser = async () => {
      try {
        // Leer accessToken del localStorage
        const token = localStorage.getItem('accessToken');
        
        if (!token) {
          // No autenticado - redirigir a login si no está en /login
          setIsAuthenticated(false);
          setLoading(false);
          if (pathname !== '/login') {
            router.push('/login');
          }
          return;
        }

        // Fetch usuario actual con JWT token
        const response = await fetch('/api/auth/me', {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          credentials: 'include', // Incluir cookies (refresh token)
        });

        if (!response.ok) {
          if (response.status === 401) {
            // Token expired o inválido - limpiar y redirigir
            localStorage.removeItem('accessToken');
            localStorage.removeItem('userId');
            setIsAuthenticated(false);
            setLoading(false);
            if (pathname !== '/login') {
              router.push('/login');
            }
            return;
          }
          throw new Error('Failed to fetch current user');
        }

        const userData = await response.json();
        setUser({...userData.user, teams: userData.teams });
        setIsAuthenticated(true);

        // Establecer equipo preferido, o el primer equipo si no hay preferido
        if (userData.user.preferredTeamId && userData.teams.some(t => t.id === userData.user.preferredTeamId)) {
          setCurrentTeamId(userData.user.preferredTeamId);
        } else if (userData.teams && userData.teams.length > 0) {
          setCurrentTeamId(userData.teams[0].id);
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Error loading user';
        setError(message);
        setIsAuthenticated(false);
        logger.error('Error fetching current user:', err);
        
        // Si hay error, limpiar localStorage y redirigir a login
        localStorage.removeItem('accessToken');
        localStorage.removeItem('userId');
        if (pathname !== '/login') {
          router.push('/login');
        }
      } finally {
        setLoading(false);
      }
    };

    loadUser();
  }, [router, pathname]);

  const logout = async () => {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      });
    } catch (err) {
      logger.error('Error calling logout endpoint', err);
    }

    setUser(null);
    setCurrentTeamId(null);
    setIsAuthenticated(false);
    localStorage.removeItem('userId');
    localStorage.removeItem('accessToken');
    router.push('/login');
  };

  const setPreferredTeam = async (teamId: number) => {
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch('/api/auth/preferred-team', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ teamId }),
      });

      if (!response.ok) {
        throw new Error('Failed to update preferred team');
      }

      // Actualizar el usuario en el contexto
      if (user) {
        setUser({ ...user, preferredTeamId: teamId });
      }
      setCurrentTeamId(teamId);
    } catch (err) {
      logger.error('Error setting preferred team:', err);
      throw err;
    }
  };

  // No mostrar contexto si está en login
  if (pathname === '/login') {
    return <>{children}</>;
  }

  return (
    <UserContext.Provider value={{ user, currentTeamId, setCurrentTeamId, setPreferredTeam, loading, error, logout, isAuthenticated }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error('useUser must be used within UserProvider');
  }
  return context;
}
