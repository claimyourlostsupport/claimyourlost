/**
 * URL that serves Open Graph HTML at `/share/social/:id`, then redirects to the SPA.
 * Prefer your real site domain (Cloudflare Pages + `functions/share/social/[id].js` proxy).
 */
export function socialShareLandingUrl(postId) {
  const id = String(postId || '').trim();
  if (!id) return '';

  const site = String(import.meta.env.VITE_PUBLIC_SITE_URL || '').trim();
  if (/^https?:\/\//i.test(site)) {
    return `${site.replace(/\/$/, '')}/share/social/${id}`;
  }

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
