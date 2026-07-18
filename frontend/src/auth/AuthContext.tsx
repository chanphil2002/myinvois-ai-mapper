import { createContext, useContext, useMemo, useState, ReactNode } from 'react';
import type { AuthResponse } from '../api/types';

interface AuthState {
  token: string | null;
  email: string | null;
  companyName: string | null;
  login: (auth: AuthResponse) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(localStorage.getItem('mytax_token'));
  const [email, setEmail] = useState<string | null>(localStorage.getItem('mytax_email'));
  const [companyName, setCompanyName] = useState<string | null>(localStorage.getItem('mytax_company'));

  const value = useMemo<AuthState>(
    () => ({
      token,
      email,
      companyName,
      login: (auth) => {
        localStorage.setItem('mytax_token', auth.token);
        localStorage.setItem('mytax_email', auth.email);
        localStorage.setItem('mytax_company', auth.companyName);
        setToken(auth.token);
        setEmail(auth.email);
        setCompanyName(auth.companyName);
      },
      logout: () => {
        localStorage.removeItem('mytax_token');
        localStorage.removeItem('mytax_email');
        localStorage.removeItem('mytax_company');
        setToken(null);
        setEmail(null);
        setCompanyName(null);
      },
    }),
    [token, email, companyName],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return ctx;
}
