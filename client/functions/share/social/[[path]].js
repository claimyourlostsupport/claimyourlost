/**
 * Proxies GET /share/social/:postId to Render Open Graph HTML.
 * File name [[path]] avoids Windows/git edge cases with [id].js on some setups.
 *
 * Env (optional): SOCIAL_SHARE_API_ORIGIN, SHARE_PROXY_API_URL, or https VITE_API_URL.
 * Last resort: replace HARDCODED_API_ORIGIN with your Render URL if deploy env is empty.
 */

const HARDCODED_API_ORIGIN = 'https://claimyourlost-2.onrender.com';

function pickApiOrigin(env) {
  const a = String(env.SOCIAL_SHARE_API_ORIGIN || '').trim().replace(/\/$/, '');
  const b = String(env.SHARE_PROXY_API_URL || '').trim().replace(/\/$/, '');
  const c = String(env.VITE_API_URL || '').trim().replace(/\/$/, '');
  const h = String(HARDCODED_API_ORIGIN || '').trim().replace(/\/$/, '');
  return a || b || (/^https:\/\//i.test(c) ? c : '') || h;
}

function firstMongoId(pathParam) {
  if (pathParam == null) return '';
  const s = Array.isArray(pathParam) ? pathParam.join('/') : String(pathParam);
  const id = s.split('/').filter(Boolean)[0] || '';
  return id.replace(/\/$/, '');
}

export async function onRequest(context) {
  const { request, env } = context;
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    return new Response('Method not allowed', { status: 405 });
  }

  const id = firstMongoId(context.params.path);
  if (!id || !/^[a-f0-9]{24}$/i.test(id)) {
    return new Response('Not found', { status: 404, headers: { 'content-type': 'text/plain; charset=utf-8' } });
  }

  const apiOrigin = pickApiOrigin(env);
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
