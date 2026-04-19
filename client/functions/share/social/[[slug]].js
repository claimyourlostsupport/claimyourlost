/**
 * Real route handler for GET /share/social/:postId (Open Graph proxy to Render).
 * Cloudflare needs a matching Function file; root _middleware alone + narrow _routes.json can still 404.
 *
 * [[slug]] = one or more path segments after /share/social/ (we only use the first 24-char hex id).
 */

const HARDCODED_API_ORIGIN = '';

function resolveApiOrigin(env) {
  const a = String(env.SOCIAL_SHARE_API_ORIGIN || '').trim().replace(/\/$/, '');
  const b = String(env.VITE_API_URL || '').trim().replace(/\/$/, '');
  const c = String(HARDCODED_API_ORIGIN || '').trim().replace(/\/$/, '');
  return a || (/^https:\/\//i.test(b) ? b : '') || c;
}

function firstIdFromSlug(slug) {
  if (slug == null) return '';
  const parts = Array.isArray(slug) ? slug : String(slug).split('/');
  const raw = parts.filter(Boolean)[0] || '';
  return String(raw).replace(/\/$/, '');
}

export async function onRequestGet({ request, params, env }) {
  const id = firstIdFromSlug(params.slug);
  if (!id || !/^[a-f0-9]{24}$/i.test(id)) {
    return new Response('Not found', { status: 404, headers: { 'content-type': 'text/plain; charset=utf-8' } });
  }

  const apiOrigin = resolveApiOrigin(env);
  if (!apiOrigin) {
    return new Response(
      [
        'Share preview: set SOCIAL_SHARE_API_ORIGIN to your Render API URL (Cloudflare Pages → Variables),',
        'or set HARDCODED_API_ORIGIN in this file, then redeploy.',
      ].join(' '),
      { status: 503, headers: { 'content-type': 'text/plain; charset=utf-8' } }
    );
  }

  const target = `${apiOrigin}/share/social/${id}`;
  const upstream = await fetch(target, {
    method: 'GET',
    redirect: 'follow',
    headers: {
      Accept: request.headers.get('Accept') || 'text/html,application/xhtml+xml;q=0.9,*/*;q=0.8',
      'User-Agent': request.headers.get('User-Agent') || 'ClaimYourLost-Pages-ShareProxy/1.0',
    },
  });

  const headers = new Headers();
  const ct = upstream.headers.get('content-type');
  if (ct) headers.set('content-type', ct);
  headers.set('cache-control', upstream.headers.get('cache-control') || 'public, max-age=300');

  return new Response(upstream.body, {
    status: upstream.status,
    headers,
  });
}
