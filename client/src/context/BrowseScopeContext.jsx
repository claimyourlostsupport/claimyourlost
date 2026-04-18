import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api } from '../api/client.js';
import { CLIENT_STORAGE_RESET_EVENT } from '../utils/clearPersistedClientState.js';

const BOOT_KEY = 'cyl_browse_bootstrapped';
const SCOPE_KEY = 'cyl_browse_scope';
const COUNTRY_KEY = 'cyl_browse_country';

/** @type {Promise<{ scope: 'country' | 'world'; country: string }> | null} */
let inflightBootstrap = null;

function readPersisted() {
  try {
    if (localStorage.getItem(BOOT_KEY) !== '1') return null;
    const scope = localStorage.getItem(SCOPE_KEY) === 'country' ? 'country' : 'world';
    const country = String(localStorage.getItem(COUNTRY_KEY) || '').trim();
    return { scope, country };
  } catch {
    return null;
  }
}

function persist(scope, country) {
  try {
    localStorage.setItem(BOOT_KEY, '1');
    localStorage.setItem(SCOPE_KEY, scope);
    localStorage.setItem(COUNTRY_KEY, country);
  } catch {
    /* ignore */
  }
}

async function detectCountryFromGps() {
  if (!navigator.geolocation || !window.isSecureContext) {
    return { scope: 'world', country: '' };
  }
  const pos = await new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: false,
      timeout: 20000,
      maximumAge: 120000,
    });
  });
  const la = pos.coords.latitude;
  const ln = pos.coords.longitude;
  const { data } = await api.get('/items/reverse-geocode', {
    params: { lat: la, lng: ln },
  });
  const c = data?.country != null ? String(data.country).trim() : '';
  if (c) {
    return { scope: 'country', country: c };
  }
  return { scope: 'world', country: '' };
}

function runFirstVisitBootstrap() {
  if (!inflightBootstrap) {
    inflightBootstrap = (async () => {
      try {
        return await detectCountryFromGps();
      } catch {
        return { scope: 'world', country: '' };
      }
    })().finally(() => {
      inflightBootstrap = null;
    });
  }
  return inflightBootstrap;
}

const BrowseScopeContext = createContext(null);

export function BrowseScopeProvider({ children }) {
  const initial = typeof window !== 'undefined' ? readPersisted() : null;
  const [scope, setScopeState] = useState(() => initial?.scope ?? 'world');
  const [country, setCountryState] = useState(() => initial?.country ?? '');
  const [bootstrapping, setBootstrapping] = useState(() => !initial);

  useEffect(() => {
    const saved = readPersisted();
    if (saved) {
      setScopeState(saved.scope);
      setCountryState(saved.country);
      setBootstrapping(false);
      return;
    }

    setBootstrapping(true);
    runFirstVisitBootstrap().then((next) => {
      persist(next.scope, next.country);
      setScopeState(next.scope);
      setCountryState(next.country);
      setBootstrapping(false);
    });
  }, []);

  useEffect(() => {
    function onClientStorageReset() {
      setBootstrapping(true);
      runFirstVisitBootstrap().then((next) => {
        persist(next.scope, next.country);
        setScopeState(next.scope);
        setCountryState(next.country);
        setBootstrapping(false);
      });
    }
    window.addEventListener(CLIENT_STORAGE_RESET_EVENT, onClientStorageReset);
    return () => window.removeEventListener(CLIENT_STORAGE_RESET_EVENT, onClientStorageReset);
  }, []);

  const setScope = useCallback((next) => {
    const s = next === 'country' ? 'country' : 'world';
    setScopeState(s);
    persist(s, country);
  }, [country]);

  const setCountry = useCallback((nextCountry) => {
    const c = String(nextCountry ?? '').trim();
    setCountryState(c);
    persist(scope, c);
  }, [scope]);

  const setCountryAndFocus = useCallback((nextCountry) => {
    const c = String(nextCountry ?? '').trim();
    setScopeState('country');
    setCountryState(c);
    persist('country', c);
  }, []);

  const value = useMemo(
    () => ({
      scope,
      country,
      bootstrapping,
      setScope,
      setCountry,
      setCountryAndFocus,
    }),
    [scope, country, bootstrapping, setScope, setCountry, setCountryAndFocus]
  );

  return <BrowseScopeContext.Provider value={value}>{children}</BrowseScopeContext.Provider>;
}

export function useBrowseScope() {
  const ctx = useContext(BrowseScopeContext);
  if (!ctx) {
    throw new Error('useBrowseScope must be used within BrowseScopeProvider');
  }
  return ctx;
}
