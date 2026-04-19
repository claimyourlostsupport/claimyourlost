/**
 * Runs on (almost) all requests. Proxies /share/social/:mongoId to your API OG HTML.
 * Needs _routes.json include "/*" so this Worker actually runs; narrow include + no matching route file → 404.
 *
 * Cloudflare Pages → Variables: SOCIAL_SHARE_API_ORIGIN (and/or https VITE_API_URL).
 */

const HARDCODED_API_ORIGIN = '';

export async function onRequest(context) {
  const { request, env } = context;

  if (request.method !== 'GET' && request.method !== 'HEAD') {
    return context.next();
  }

  const url = new URL(request.url);
  const m = url.pathname.match(/^\/share\/social\/([a-f0-9]{24})\/?$/i);
  if (!m) {
    return context.next();
  }

  const id = m[1];
  const fromBinding = String(env.SOCIAL_SHARE_API_ORIGIN || '').trim().replace(/\/$/, '');
  const fromVite = String(env.VITE_API_URL || '').trim().replace(/\/$/, '');
  const fromHardcode = String(HARDCODED_API_ORIGIN || '').trim().replace(/\/$/, '');
  const apiOrigin =
    fromBinding || (/^https:\/\//i.test(fromVite) ? fromVite : '') || fromHardcode;

  if (!apiOrigin) {
    return new Response(
      [
        'Share preview: set SOCIAL_SHARE_API_ORIGIN to your Render API URL (Cloudflare Pages → Variables),',
        'or set HARDCODED_API_ORIGIN in client/functions/_middleware.js, then redeploy.',
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
  headers.set(
    'cache-control',
    upstream.headers.get('cache-control') || 'public, max-age=300'
  );

  return new Response(upstream.body, {
    status: upstream.status,
    headers,
  });
}
