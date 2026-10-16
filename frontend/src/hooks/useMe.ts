import { useQuery } from '@tanstack/react-query';
import { getMe } from '../api/endpoints';
import { useAuth } from '../auth/AuthContext';

/** The signed-in user's account (incl. role) — from the server, so admin UI can't be spoofed client-side. */
export function useMe() {
  const { token } = useAuth();
  const { data } = useQuery({ queryKey: ['me', token], queryFn: getMe, enabled: !!token, staleTime: 60_000 });
  return { me: data, isAdmin: data?.role === 'ADMIN' };
}
