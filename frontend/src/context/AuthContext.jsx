import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { authApi, TOKEN_KEY } from '../lib/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [admin, setAdmin] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const boot = async () => {
      try {
        // Existing session first…
        if (localStorage.getItem(TOKEN_KEY)) {
          try {
            setAdmin(await authApi.me());
            return;
          } catch {
            localStorage.removeItem(TOKEN_KEY);
          }
        }
        // …otherwise sign in silently — the panel always opens directly.
        const { token, admin: user } = await authApi.autoLogin();
        localStorage.setItem(TOKEN_KEY, token);
        setAdmin(user);
      } catch {
        // Backend unreachable or auto-login disabled — the UI still opens;
        // individual API calls surface their own errors.
      } finally {
        setLoading(false);
      }
    };
    boot();
  }, []);

  // Kept for the manual /login route (used only when AUTO_LOGIN is off).
  const login = useCallback(async (email, password) => {
    const { token, admin: user } = await authApi.login({ email, password });
    localStorage.setItem(TOKEN_KEY, token);
    setAdmin(user);
    return user;
  }, []);

  const register = useCallback(async (payload) => {
    const { token, admin: user } = await authApi.register(payload);
    localStorage.setItem(TOKEN_KEY, token);
    setAdmin(user);
    return user;
  }, []);

  return (
    <AuthContext.Provider value={{ admin, setAdmin, loading, login, register, isAuthed: !!admin }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
};
