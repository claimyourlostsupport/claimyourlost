import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { CLIENT_STORAGE_RESET_EVENT } from '../utils/clearPersistedClientState.js';

const STORAGE_KEY = 'cyl_favorites_v1';

function readStored() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(arr)) return [];
    return arr
      .filter((x) => x && (x.kind === 'item' || x.kind === 'social') && String(x.id || '').trim())
      .map((x) => ({ kind: x.kind, id: String(x.id).trim() }));
  } catch {
    return [];
  }
}

function writeStored(list) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch {
    /* ignore */
  }
}

const FavoritesContext = createContext(null);

export function FavoritesProvider({ children }) {
  const [favorites, setFavorites] = useState(() =>
    typeof window !== 'undefined' ? readStored() : []
  );

  useEffect(() => {
    function onReset() {
      setFavorites([]);
    }
    window.addEventListener(CLIENT_STORAGE_RESET_EVENT, onReset);
    return () => window.removeEventListener(CLIENT_STORAGE_RESET_EVENT, onReset);
  }, []);

  /** Call after a successful like/dislike API response. `reaction` is 'like' | 'dislike' | ''. */
  const applyReaction = useCallback((kind, id, reaction) => {
    const sid = String(id || '').trim();
    if (!sid || (kind !== 'item' && kind !== 'social')) return;

    setFavorites((prev) => {
      const without = prev.filter((e) => !(e.kind === kind && e.id === sid));
      const next = reaction === 'like' ? [{ kind, id: sid }, ...without] : without;
      writeStored(next);
      return next;
    });
  }, []);

  const removeEntry = useCallback((kind, id) => {
    const sid = String(id || '').trim();
    if (!sid) return;
    setFavorites((prev) => {
      const next = prev.filter((e) => !(e.kind === kind && e.id === sid));
      writeStored(next);
      return next;
    });
  }, []);

  const value = useMemo(
    () => ({
      favorites,
      applyReaction,
      removeEntry,
    }),
    [favorites, applyReaction, removeEntry]
  );

  return <FavoritesContext.Provider value={value}>{children}</FavoritesContext.Provider>;
}

export function useFavorites() {
  const ctx = useContext(FavoritesContext);
  if (!ctx) throw new Error('useFavorites must be used within FavoritesProvider');
  return ctx;
}
