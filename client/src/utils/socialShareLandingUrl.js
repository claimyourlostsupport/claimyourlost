/**
 * URL that serves real Open Graph HTML (API `/share/social/:id`), then redirects to the SPA.
 * Production: set `VITE_API_URL` to the full API origin (see DEPLOY.md).
 */
export function socialShareLandingUrl(postId) {
  const id = String(postId || '').trim();
  if (!id) return '';
  const base = import.meta.env.VITE_API_URL ?? '/api';
  if (typeof base === 'string' && base.startsWith('http')) {
    return `${base.replace(/\/$/, '')}/share/social/${id}`;
  }
  if (typeof window !== 'undefined') {
    const origin = window.location.origin;
    const prefix = base.startsWith('/') ? base : '/api';
    return `${origin}${prefix.replace(/\/$/, '')}/share/social/${id}`;
  }
  return '';
}
