import { useUser } from '@/context/UserContext';

interface TeamAccess {
  hasAccess: boolean;
  role?: string;
  canEdit: boolean;
  canDelete: boolean;
}

/**
 * Hook para validar acceso del usuario a un equipo específico
 * 
 * Uso:
 * const access = useTeamAccess(1);
 * if (access.hasAccess) {
 *   console.log('Tienes acceso al equipo');
 *   console.log('Rol:', access.role); // 'admin' o 'viewer'
 *   console.log('¿Puedes editar?', access.canEdit); // true si es admin
 * }
 */
export function useTeamAccess(teamId: number): TeamAccess {
  const { user } = useUser();

  if (!user) {
    return {
      hasAccess: false,
      canEdit: false,
      canDelete: false,
    };
  }

  const team = user.teams.find((t) => t.id === teamId);

  if (!team) {
    return {
      hasAccess: false,
      canEdit: false,
      canDelete: false,
    };
  }

  const isAdmin = team.role === 'admin';

  return {
    hasAccess: true,
    role: team.role,
    canEdit: isAdmin,
    canDelete: isAdmin,
  };
}
