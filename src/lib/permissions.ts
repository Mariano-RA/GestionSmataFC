/**
 * Sistema de Control de Permisos
 * Define qué puede hacer cada rol de usuario
 */

export type GlobalRole = 'super_admin' | 'admin' | 'user';
export type TeamRole = 'admin' | 'viewer';

/**
 * Verifica si un usuario super admin puede acceder al panel de administración
 */
export function canAccessAdminPanel(globalRole: GlobalRole): boolean {
  return globalRole === 'super_admin';
}

/**
 * Verifica si un usuario puede crear equipos
 */
export function canCreateTeam(globalRole: GlobalRole): boolean {
  return globalRole === 'super_admin';
}

/**
 * Verifica si un usuario puede editar un equipo
 */
export function canEditTeam(globalRole: GlobalRole, userTeamRole?: TeamRole): boolean {
  if (globalRole === 'super_admin') return true;
  if (globalRole === 'admin' && userTeamRole === 'admin') return true;
  return false;
}

/**
 * Verifica si un usuario puede eliminar un equipo
 */
export function canDeleteTeam(globalRole: GlobalRole): boolean {
  return globalRole === 'super_admin';
}

/**
 * Verifica si un usuario puede gestionar usuarios
 */
export function canManageUsers(globalRole: GlobalRole): boolean {
  return globalRole === 'super_admin';
}

/**
 * Verifica si un usuario puede ver los logs del sistema
 */
export function canViewSystemLogs(globalRole: GlobalRole): boolean {
  return globalRole === 'super_admin';
}

/**
 * Verifica si un usuario puede ver datos de un equipo específico
 */
export function canViewTeam(
  globalRole: GlobalRole,
  userTeamRole?: TeamRole
): boolean {
  if (globalRole === 'super_admin') return true;
  if (globalRole === 'admin' && (userTeamRole === 'admin' || userTeamRole === 'viewer')) return true;
  if (globalRole === 'user' && (userTeamRole === 'admin' || userTeamRole === 'viewer')) return true;
  return false;
}

/**
 * Verifica si un usuario puede editar datos de un equipo específico
 */
export function canEditTeamData(
  globalRole: GlobalRole,
  userTeamRole?: TeamRole
): boolean {
  if (globalRole === 'super_admin') return true;
  if (globalRole === 'admin' && userTeamRole === 'admin') return true;
  if (globalRole === 'user' && userTeamRole === 'admin') return true;
  return false;
}

/**
 * Verifica si un usuario puede eliminar datos de un equipo específico
 */
export function canDeleteTeamData(
  globalRole: GlobalRole,
  userTeamRole?: TeamRole
): boolean {
  if (globalRole === 'super_admin') return true;
  if (globalRole === 'admin' && userTeamRole === 'admin') return true;
  if (globalRole === 'user' && userTeamRole === 'admin') return true;
  return false;
}

/**
 * Obtiene la descripción del rol global para mostrar en UI
 */
export function getGlobalRoleLabel(globalRole: GlobalRole): string {
  const labels: Record<GlobalRole, string> = {
    super_admin: '👑 Super Administrador',
    admin: '🔑 Administrador',
    user: '👤 Usuario',
  };
  return labels[globalRole];
}

/**
 * Obtiene la descripción del rol de equipo para mostrar en UI
 */
export function getTeamRoleLabel(teamRole: TeamRole): string {
  const labels: Record<TeamRole, string> = {
    admin: '🔑 Administrador',
    viewer: '👁️ Observador',
  };
  return labels[teamRole];
}

/**
 * Matriz de permisos por rol
 */
export const PERMISSIONS_MATRIX = {
  super_admin: {
    // Gestión de usuarios
    createUser: true,
    editUser: true,
    deleteUser: true,
    viewUsers: true,
    changeUserRole: true,

    // Gestión de equipos
    createTeam: true,
    editTeam: true,
    deleteTeam: true,
    viewTeams: true,

    // Asignación de usuarios a equipos
    assignUserToTeam: true,
    removeUserFromTeam: true,

    // Datos de equipos específicos
    viewTeamData: true,
    editTeamData: true,
    deleteTeamData: true,

    // Logs y auditoría
    viewAllLogs: true,
    exportLogs: true,

    // Panel de administración
    accessAdminPanel: true,
    viewSystemStats: true,
  },

  admin: {
    // Solo para equipos asignados como admin
    viewTeamData: true,
    editTeamData: true,
    deleteTeamData: true,

    // Logs de sus equipos
    viewTeamLogs: true,

    // No puede gestionar usuarios globales
    createUser: false,
    editUser: false,
    deleteUser: false,
    viewUsers: false,
    changeUserRole: false,

    // No puede gestionar equipos globalmente
    createTeam: false,
    editTeam: false,
    deleteTeam: false,
    viewTeams: false,

    // No puede asignar usuarios
    assignUserToTeam: false,
    removeUserFromTeam: false,

    // No puede ver logs globales
    viewAllLogs: false,
    exportLogs: false,

    // No puede acceder a admin panel
    accessAdminPanel: false,
    viewSystemStats: false,
  },

  user: {
    // Solo para equipos asignados como admin
    viewTeamData: true,
    editTeamData: false, // Usuarios normales solo leen si son asignados
    deleteTeamData: false,

    // Logs de sus equipos
    viewTeamLogs: false,

    // No puede hacer nada global
    createUser: false,
    editUser: false,
    deleteUser: false,
    viewUsers: false,
    changeUserRole: false,

    createTeam: false,
    editTeam: false,
    deleteTeam: false,
    viewTeams: false,

    assignUserToTeam: false,
    removeUserFromTeam: false,

    viewAllLogs: false,
    exportLogs: false,

    accessAdminPanel: false,
    viewSystemStats: false,
  },
};
