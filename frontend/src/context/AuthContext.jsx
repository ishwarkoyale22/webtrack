import { createContext, useContext, useEffect, useState } from 'react';
import { authApi } from '../lib/api';

const AuthContext = createContext(null);

/**
 * WebTrack has no login screen — it's a single-admin local tool. This just
 * fetches the admin's profile on boot (name/email/settings shown around the
 * UI) without gating access to anything.
 */
export function AuthProvider({ children }) {
  const [admin, setAdmin] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    authApi
      .me()
      .then(setAdmin)
      .catch(() => {
        // Backend unreachable — the UI still opens; individual API calls
        // surface their own errors.
      })
      .finally(() => setLoading(false));
  }, []);

  return <AuthContext.Provider value={{ admin, setAdmin, loading }}>{children}</AuthContext.Provider>;
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
};
