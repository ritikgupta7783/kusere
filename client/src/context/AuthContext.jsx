import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import api, { ensureCsrf } from '../services/api';

const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Session validation after every refresh: the HTTP-only cookie is checked by the server.
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        await ensureCsrf();
        const { data } = await api.get('/auth/me');
        if (alive) setUser(data.user);
      } catch {
        if (alive) setUser(null);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  const login = useCallback(async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password });
    setUser(data.user);
    return data;
  }, []);

  const verifyOtp = useCallback(async (email, otp) => {
    const { data } = await api.post('/auth/verify-otp', { email, otp });
    setUser(data.user);
    return data;
  }, []);

  const logout = useCallback(async () => {
    try { await api.post('/auth/logout'); } finally { setUser(null); }
  }, []);

  const value = useMemo(
    () => ({ user, setUser, loading, login, verifyOtp, logout, isAdmin: user?.role === 'ADMIN' }),
    [user, loading, login, verifyOtp, logout]
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
