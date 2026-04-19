/**
 * URL that serves Open Graph HTML at `/share/social/:id`, then redirects to the SPA.
 * Uses your real domain in the link (not the Render API host) when possible.
 */
function isLocalDevOrigin(origin) {
  if (!origin) return true;
  try {
    const h = new URL(origin).hostname;
    return h === 'localhost' || h === '127.0.0.1';
  } catch {
    return true;
  }
}

export function socialShareLandingUrl(postId) {
  const id = String(postId || '').trim();
  if (!id) return '';

  const site = String(import.meta.env.VITE_PUBLIC_SITE_URL || '').trim();
  if (/^https?:\/\//i.test(site)) {
    return `${site.replace(/\/$/, '')}/share/social/${id}`;
  }

  if (typeof window !== 'undefined') {
    const origin = window.location.origin;
    if (!isLocalDevOrigin(origin) && /^https:/i.test(origin)) {
      return `${origin.replace(/\/$/, '')}/share/social/${id}`;
    }
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
