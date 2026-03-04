import { useUser } from '@/context/UserContext';

/**
 * Hook para obtener información del usuario actual
 * 
 * Uso:
 * const currentUser = useCurrentUser();
 * console.log(currentUser?.name); // "Administrador"
 * console.log(currentUser?.teams); // [{ id: 1, name: 'Smata FC', ... }]
 */
export function useCurrentUser() {
  const { user } = useUser();
  return user;
}
