/**
 * All ClaimYourLost keys in localStorage. Used when the server DB was wiped or the session
 * is invalid so the browser matches a clean server (auth, favorites, browse scope, search prefs).
 */
const APP_LOCAL_KEYS = [
  'cyl_token',
  'cyl_user',
  'cyl_favorites_v1',
  'cyl_browse_bootstrapped',
  'cyl_browse_scope',
  'cyl_browse_country',
  'cyl_search_location_prefs',
];

export const CLIENT_STORAGE_RESET_EVENT = 'cyl-client-storage-reset';

export function clearPersistedClientState() {
  for (const k of APP_LOCAL_KEYS) {
    try {
      localStorage.removeItem(k);
    } catch {
      /* ignore */
    }
  }
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(CLIENT_STORAGE_RESET_EVENT));
  }
}
