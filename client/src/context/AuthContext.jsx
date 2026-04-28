import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api } from '../api/client.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem('token'));
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(!!localStorage.getItem('token'));

  const logout = useCallback(() => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
  }, []);

  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }
    localStorage.setItem('token', token);
    (async () => {
      try {
        const { user: u } = await api('/api/auth/me');
        setUser(u);
      } catch {
        logout();
      } finally {
        setLoading(false);
      }
    })();
  }, [token, logout]);

  const login = useCallback(async (email, password) => {
    const data = await api('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    setToken(data.token);
    setUser(data.user);
    return data;
  }, []);

  const loginWithGoogle = useCallback(async (credential) => {
    const data = await api('/api/auth/google', {
      method: 'POST',
      body: JSON.stringify({ credential }),
    });
    setToken(data.token);
    setUser(data.user);
    return data;
  }, []);

  const signup = useCallback(async (name, email, password) => {
    const data = await api('/api/auth/signup', {
      method: 'POST',
      body: JSON.stringify({ name, email, password }),
    });
    setToken(data.token);
    setUser(data.user);
    return data;
  }, []);

  const updateProfile = useCallback(async ({ name, avatar }) => {
    const data = await api('/api/auth/me', {
      method: 'PATCH',
      body: JSON.stringify({ name, avatar }),
    });
    setUser(data.user);
    return data;
  }, []);

  const uploadAvatar = useCallback(async (file) => {
    const fd = new FormData();
    fd.append('avatar', file);
    const data = await api('/api/auth/avatar', { method: 'POST', body: fd });
    setUser(data.user);
    return data;
  }, []);

  const value = useMemo(
    () => ({
      token,
      user,
      loading,
      login,
      loginWithGoogle,
      signup,
      updateProfile,
      uploadAvatar,
      logout,
      setUser,
    }),
    [token, user, loading, login, loginWithGoogle, signup, updateProfile, uploadAvatar, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth outside provider');
  return ctx;
}
