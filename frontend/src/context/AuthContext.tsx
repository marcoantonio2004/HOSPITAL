import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { auth } from '../services/api';

interface User {
  id_usuario: number;
  username: string;
  nombre: string;
  rol: string;
  id_medico?: number | null;
  debe_cambiar_password?: boolean;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  loggingOut: boolean;
  login: (username: string, password: string, onValidCredentials?: () => Promise<void>) => Promise<any>;
  logout: (onBeforeLogout?: () => Promise<void>) => Promise<void>;
  effectiveRole: string;
  setEffectiveRole: (role: string) => void;
  updateCurrentUser: (updated: Partial<User>) => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);
  const [roleOverride, setRoleOverride] = useState<string | null>(null);

  useEffect(() => {
    checkAuth();
  }, []);

  async function checkAuth() {
    try {
      const res = await auth.me();
      if (res.success && res.data) {
        setUser({
          id_usuario: res.data.id_usuario,
          username: res.data.username,
          nombre: res.data.medico_nombre || res.data.username,
          rol: res.data.rol_nombre,
          id_medico: res.data.id_medico,
          debe_cambiar_password: Boolean(res.data.debe_cambiar_password),
        });
      }
    } catch {
      // No autenticado
    } finally {
      setLoading(false);
    }
  }

  async function login(username: string, password: string, onValidCredentials?: () => Promise<void>) {
    const res = await auth.login(username, password);
    if (res.success) {
      if (onValidCredentials) {
        await onValidCredentials();
      }
      if ('startViewTransition' in document) {
        (document as any).startViewTransition(() => {
          setUser(res.data.user);
          setRoleOverride(null);
        });
      } else {
        setUser(res.data.user);
        setRoleOverride(null);
      }
      return res.data.user;
    } else {
      throw new Error(res.error || 'Error al iniciar sesión');
    }
  }

  async function logout(onBeforeLogout?: () => Promise<void>) {
    if (loggingOut) return;
    setLoggingOut(true);
    try {
      if (onBeforeLogout) {
        await onBeforeLogout();
      }
      await auth.logout();
      if ('startViewTransition' in document) {
        (document as any).startViewTransition(() => {
          setUser(null);
          setRoleOverride(null);
        });
      } else {
        setUser(null);
        setRoleOverride(null);
      }
    } finally {
      setLoggingOut(false);
    }
  }

  const rawRole = (user?.rol || 'admin').toLowerCase();
  const effectiveRole = (rawRole === 'admin' && roleOverride) ? roleOverride : rawRole;

  function setEffectiveRole(role: string) {
    if (rawRole === 'admin') {
      setRoleOverride(role.toLowerCase());
    }
  }

  function updateCurrentUser(updated: Partial<User>) {
    setUser((prev) => (prev ? { ...prev, ...updated } : null));
  }

  async function refreshUser() {
    await checkAuth();
  }

  return (
    <AuthContext.Provider value={{ user, loading, loggingOut, login, logout, effectiveRole, setEffectiveRole, updateCurrentUser, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
