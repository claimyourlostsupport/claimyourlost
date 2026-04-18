import { createContext, useContext, useMemo, useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { api, setAuthToken } from '../api/client';
import {
  clearPersistedClientState,
  CLIENT_STORAGE_RESET_EVENT,
} from '../utils/clearPersistedClientState.js';

const AuthContext = createContext(null);

const STORAGE_KEY = 'cyl_token';
const USER_KEY = 'cyl_user';

function stripForStorage(u) {
  return {
    id: u.id,
    phone: u.phone,
    nickname: u.nickname || '',
    hasPassword: Boolean(u.hasPassword),
  };
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const raw = localStorage.getItem(USER_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  });
  const [token, setToken] = useState(() => localStorage.getItem(STORAGE_KEY) || '');
  const [loading, setLoading] = useState(true);

  const persistUser = useCallback((u) => {
    const stored = stripForStorage(u);
    localStorage.setItem(USER_KEY, JSON.stringify(stored));
    setUser((prev) => ({ ...stored, isNewUser: Boolean(prev?.isNewUser) }));
  }, []);

  const replaceUser = useCallback((u) => {
    const stored = stripForStorage(u);
    localStorage.setItem(USER_KEY, JSON.stringify(stored));
    setUser(stored);
  }, []);

  const dismissNewUserPrompt = useCallback(() => {
    setUser((prev) => {
      if (!prev) return prev;
      const next = stripForStorage(prev);
      localStorage.setItem(USER_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  /** JWT rejected or account gone — wipe localStorage; event listener below syncs React state.
   * Do not use 404 here: misconfigured proxies/CDNs often return 404 for API routes; that must not log users out. */
  const invalidateSessionIfNeeded = useCallback((err) => {
    const status = err?.response?.status;
    if (status === 401) {
      clearPersistedClientState();
    }
  }, []);

  useEffect(() => {
    function onClientStorageReset() {
      setToken('');
      setUser(null);
      setAuthToken(null);
    }
    window.addEventListener(CLIENT_STORAGE_RESET_EVENT, onClientStorageReset);
    return () => window.removeEventListener(CLIENT_STORAGE_RESET_EVENT, onClientStorageReset);
  }, []);

  useEffect(() => {
    if (token) {
      setAuthToken(token);
    } else {
      setAuthToken(null);
    }
    setLoading(false);
  }, [token]);

  useEffect(() => {
    if (!token) return;
    const ac = new AbortController();
    (async () => {
      try {
        const { data } = await api.get('/auth/me', { signal: ac.signal });
        if (data?.user) persistUser(data.user);
      } catch (err) {
        if (ac.signal.aborted || axios.isCancel?.(err)) return;
        if (err?.code === 'ERR_CANCELED' || err?.name === 'CanceledError') return;
        invalidateSessionIfNeeded(err);
      }
    })();
    return () => ac.abort();
  }, [token, persistUser, invalidateSessionIfNeeded]);

  const login = async (phone, otp) => {
    const { data } = await api.post('/auth/login', { phone, otp });
    localStorage.setItem(STORAGE_KEY, data.token);
    const base = stripForStorage(data.user);
    localStorage.setItem(USER_KEY, JSON.stringify(base));
    setToken(data.token);
    setUser({ ...base, isNewUser: Boolean(data.user.isNewUser) });
    setAuthToken(data.token);
    return data;
  };

  const loginWithPassword = useCallback(async (phone, password) => {
    const { data } = await api.post('/auth/login-password', { phone, password });
    localStorage.setItem(STORAGE_KEY, data.token);
    const base = stripForStorage(data.user);
    localStorage.setItem(USER_KEY, JSON.stringify(base));
    setToken(data.token);
    setUser({ ...base, isNewUser: Boolean(data.user.isNewUser) });
    setAuthToken(data.token);
    return data;
  }, []);

  const refreshUser = async () => {
    try {
      const { data } = await api.get('/auth/me');
      if (data?.user) persistUser(data.user);
      return data;
    } catch (err) {
      invalidateSessionIfNeeded(err);
      throw err;
    }
  };

  const updateProfile = async (payload) => {
    try {
      const { data } = await api.patch('/auth/me', payload);
      if (data?.user) replaceUser(data.user);
      return data;
    } catch (err) {
      invalidateSessionIfNeeded(err);
      throw err;
    }
  };

  const setPassword = useCallback(
    async ({ password, currentPassword }) => {
      try {
        const { data } = await api.post('/auth/password', { password, currentPassword });
        if (data?.user) replaceUser(data.user);
        return data;
      } catch (err) {
        invalidateSessionIfNeeded(err);
        throw err;
      }
    },
    [replaceUser, invalidateSessionIfNeeded]
  );

  const requestOtp = async (phone) => {
    return api.post('/auth/request-otp', { phone });
  };

  const logout = () => {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(USER_KEY);
    setToken('');
    setUser(null);
    setAuthToken(null);
  };

  const value = useMemo(
    () => ({
      user,
      token,
      isAuthenticated: Boolean(token && user),
      loading,
      login,
      loginWithPassword,
      logout,
      requestOtp,
      refreshUser,
      updateProfile,
      setPassword,
      dismissNewUserPrompt,
    }),
    [user, token, loading, dismissNewUserPrompt, setPassword, loginWithPassword]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
