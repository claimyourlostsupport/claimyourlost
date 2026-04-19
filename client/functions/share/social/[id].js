/**
 * Cloudflare Pages: serve Open Graph HTML for Social Hub shares on your real domain.
 * Without this, `/* -> /index.html` would return the SPA and Facebook would only show the site default.
 *
 * Pages → Settings → Environment variables (Production):
 *   SOCIAL_SHARE_API_ORIGIN = https://YOUR-API.onrender.com  (no trailing slash)
 * Optional duplicate of your API URL if you prefer not to expose VITE_ to Functions.
 */

export async function onRequestGet({ request, params, env }) {
  const id = params?.id;
  if (!id || !/^[a-f0-9]{24}$/i.test(String(id))) {
    return new Response('Not found', { status: 404, headers: { 'content-type': 'text/plain; charset=utf-8' } });
  }

  const fromBinding = String(env.SOCIAL_SHARE_API_ORIGIN || '').trim().replace(/\/$/, '');
  const fromVite = String(env.VITE_API_URL || '').trim().replace(/\/$/, '');
  const apiOrigin = fromBinding || (/^https:\/\//i.test(fromVite) ? fromVite : '');

  if (!apiOrigin) {
    return new Response(
      [
        'Share preview is not configured on Pages.',
        'Add environment variable SOCIAL_SHARE_API_ORIGIN = your API origin (e.g. https://claimyourlost-2.onrender.com),',
        'then redeploy.',
      ].join(' '),
      { status: 503, headers: { 'content-type': 'text/plain; charset=utf-8' } }
    );
  }

  const target = `${apiOrigin}/share/social/${id}`;
  const upstream = await fetch(target, {
    redirect: 'follow',
    headers: {
      'User-Agent': request.headers.get('User-Agent') || 'ClaimYourLost-Pages-ShareProxy/1.0',
      Accept: 'text/html,application/xhtml+xml;q=0.9,*/*;q=0.8',
    },
  });

  const ct = upstream.headers.get('content-type') || 'text/html; charset=utf-8';
  const cc = upstream.headers.get('cache-control') || 'public, max-age=300';

  return new Response(upstream.body, {
    status: upstream.status,
    headers: {
      'content-type': ct,
      'cache-control': cc,
    },
  });
}
