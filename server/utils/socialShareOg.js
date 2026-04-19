/**
 * HTML + Open Graph for Social Hub share landing pages (crawlers do not run the SPA).
 */

function escapeHtmlAttr(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/\r?\n/g, ' ');
}

function collapseWs(s) {
  return String(s ?? '')
    .replace(/\s+/g, ' ')
    .trim();
}

function truncate(s, max) {
  const t = collapseWs(s);
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1)}…`;
}

/** First comma-separated CLIENT_URL entry, no trailing slash. */
function primaryClientOrigin() {
  const raw = (process.env.CLIENT_URL || 'http://localhost:5173').split(',')[0].trim();
  return raw.replace(/\/$/, '');
}

function requestPublicOrigin(req) {
  const proto = (req.get('x-forwarded-proto') || req.protocol || 'https').split(',')[0].trim();
  const host = (req.get('x-forwarded-host') || req.get('host') || '').split(',')[0].trim();
  if (!host) return '';
  return `${proto}://${host}`;
}

/** Where uploads live (always API host). Avoids broken og:image when SHARE_PUBLIC_ORIGIN is the Pages domain. */
function apiPublicOrigin(req) {
  const fromEnv = (process.env.API_PUBLIC_ORIGIN || process.env.RENDER_EXTERNAL_URL || '')
    .trim()
    .replace(/\/$/, '');
  if (fromEnv) return fromEnv;
  return requestPublicOrigin(req);
}

/**
 * Public URL for og:url / canonical (e.g. https://claimyourlost.com/share/social/:id).
 * Prefer SHARE_PUBLIC_ORIGIN; else CLIENT_URL (first entry) when https — avoids showing the Render hostname in previews.
 */
function sharePagePublicOrigin(req) {
  const fromEnv = (process.env.SHARE_PUBLIC_ORIGIN || '').trim().replace(/\/$/, '');
  if (fromEnv) return fromEnv;
  const client = primaryClientOrigin();
  if (client && /^https:\/\//i.test(client)) {
    return client;
  }
  return requestPublicOrigin(req);
}

function isLinkPreviewCrawler(userAgent) {
  const s = String(userAgent || '').toLowerCase();
  return /facebookexternalhit|facebot|linkedinbot|whatsapp|slackbot|twitterbot|telegrambot|discordbot|pinterest|vkshare|redditbot|googlebot|bingpreview|applebot|bytespider/.test(
    s
  );
}

/** Turn stored mediaUrl into an absolute URL for og:image / og:video. */
function absoluteMediaUrl(req, mediaUrl) {
  const u = String(mediaUrl || '').trim();
  if (!u) return '';
  if (/^https?:\/\//i.test(u)) return u;
  const origin = apiPublicOrigin(req);
  if (!origin) return '';
  const path = u.startsWith('/') ? u : `/${u}`;
  return `${origin}${path}`;
}

/** Crawlers expect https; Render may report http internally. */
function ogReadyMediaUrl(url) {
  const s = String(url || '').trim();
  if (!s) return '';
  return s.replace(/^http:\/\//i, 'https://');
}

/** Facebook-friendly size for Cloudinary *image* delivery. */
function cloudinaryImageOgUrl(url) {
  const s = String(url || '');
  if (!s.includes('res.cloudinary.com') || !s.includes('/image/upload/')) return s;
  try {
    const u = new URL(s);
    const [prefix, rest] = u.pathname.split('/image/upload/');
    if (!rest || rest.startsWith('c_')) return s;
    u.pathname = `${prefix}/image/upload/c_fill,w_1200,h_630,q_auto,f_auto/${rest}`;
    return u.toString();
  } catch {
    return s;
  }
}

/**
 * Cloudinary video → JPG frame URL for link previews (og:image).
 * @param {string} videoUrl
 */
function cloudinaryVideoThumbnailUrl(videoUrl) {
  const s = String(videoUrl || '');
  if (!s.includes('res.cloudinary.com') || !s.includes('/video/upload/')) return '';
  try {
    const u = new URL(s);
    const [prefix, rest] = u.pathname.split('/video/upload/');
    if (!rest) return '';
    const withoutExt = rest.replace(/\.[^/.]+$/, '');
    u.pathname = `${prefix}/video/upload/so_0,c_fill,w_1200,h_630,q_auto,f_jpg/${withoutExt}.jpg`;
    return u.toString();
  } catch {
    return '';
  }
}

/**
 * @param {object} opts
 * @param {object} opts.post SocialPost lean doc
 * @param {import('express').Request} opts.req
 */
export function renderSocialSharePage({ post, req }) {
  const clientOrigin = primaryClientOrigin();
  const spaUrl = `${clientOrigin}/social-hub/${post._id}`;
  const shareHost = sharePagePublicOrigin(req);
  const sharePageUrl = shareHost ? `${shareHost}/share/social/${post._id}` : `${clientOrigin}/social-hub/${post._id}`;

  const ua = req.get('user-agent');
  const crawler = isLinkPreviewCrawler(ua);

  const descriptionRaw = String(post.description || '').trim();
  const city = String(post.city || '').trim();
  const country = String(post.country || '').trim();
  const place = [city, country].filter(Boolean).join(', ');

  let summary = descriptionRaw;
  if (place) {
    summary = summary ? `${summary} · ${place}` : place;
  }
  if (!summary) summary = 'A post from Social Hub on ClaimYourLost — lost & found community updates.';

  const ogDescription = truncate(summary, 280);
  const titleCore = descriptionRaw ? truncate(descriptionRaw, 72) : 'Social Hub post';
  const ogTitle = `${titleCore} · ClaimYourLost`;

  const mediaType = post.mediaType === 'video' ? 'video' : 'image';
  const mediaAbs = absoluteMediaUrl(req, post.mediaUrl);

  let ogImage = '';
  if (mediaType === 'image' && mediaAbs) {
    ogImage = cloudinaryImageOgUrl(mediaAbs);
  } else if (mediaType === 'video') {
    ogImage = cloudinaryVideoThumbnailUrl(post.mediaUrl) || '';
  }
  ogImage = ogReadyMediaUrl(ogImage);

  let videoSecure =
    mediaType === 'video' && mediaAbs && /^https:\/\//i.test(mediaAbs) ? mediaAbs : '';
  videoSecure = ogReadyMediaUrl(videoSecure);
  let videoType = '';
  if (videoSecure) {
    const low = videoSecure.toLowerCase();
    if (/\.mp4(\?|$)/.test(low)) videoType = 'video/mp4';
    else if (/\.webm(\?|$)/.test(low)) videoType = 'video/webm';
    else if (/\.mov(\?|$)/.test(low)) videoType = 'video/quicktime';
    else videoType = 'video/mp4';
  }

  const ogType = videoSecure ? 'video.other' : 'article';

  const spaUrlJs = JSON.stringify(spaUrl);
  const safeTitle = escapeHtmlAttr(ogTitle);
  const safeDesc = escapeHtmlAttr(ogDescription);
  const safeShareUrl = escapeHtmlAttr(sharePageUrl);
  const safeImage = ogImage ? escapeHtmlAttr(ogImage) : '';
  const safeVideo = videoSecure ? escapeHtmlAttr(videoSecure) : '';

  const ogForType = String(ogImage || '');
  const ogImageType = safeImage
    ? /\.png(\?|$)/i.test(ogForType)
      ? 'image/png'
      : /\.webp(\?|$)/i.test(ogForType)
        ? 'image/webp'
        : 'image/jpeg'
    : '';

  const imageTags = safeImage
    ? `
    <meta property="og:image" content="${safeImage}" />
    <meta property="og:image:secure_url" content="${safeImage}" />
    <meta property="og:image:type" content="${escapeHtmlAttr(ogImageType)}" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    <meta property="og:image:alt" content="${safeTitle}" />
    <meta name="twitter:image" content="${safeImage}" />`
    : '';

  const videoTags =
    safeVideo && videoType
      ? `
    <meta property="og:video" content="${safeVideo}" />
    <meta property="og:video:secure_url" content="${safeVideo}" />
    <meta property="og:video:type" content="${escapeHtmlAttr(videoType)}" />`
      : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${safeTitle}</title>
  <meta name="description" content="${safeDesc}" />
  <link rel="canonical" href="${safeShareUrl}" />

  <meta property="og:site_name" content="ClaimYourLost" />
  <meta property="og:type" content="${escapeHtmlAttr(ogType)}" />
  <meta property="og:title" content="${safeTitle}" />
  <meta property="og:description" content="${safeDesc}" />
  <meta property="og:url" content="${safeShareUrl}" />
  <meta property="og:locale" content="en_US" />
${imageTags}
${videoTags}

  <meta name="twitter:card" content="${safeImage ? 'summary_large_image' : 'summary'}" />
  <meta name="twitter:title" content="${safeTitle}" />
  <meta name="twitter:description" content="${safeDesc}" />
${crawler ? '' : `  <meta http-equiv="refresh" content="0;url=${escapeHtmlAttr(spaUrl)}" />
  <script>location.replace(${spaUrlJs});</script>`}
</head>
<body style="font-family:system-ui,sans-serif;padding:1.25rem;max-width:32rem;margin:0 auto;color:#334155">
  <p style="font-size:0.9rem">Opening this Social Hub post in ClaimYourLost…</p>
  <p style="font-size:0.85rem">If you are not redirected, <a href="${escapeHtmlAttr(spaUrl)}">open the post</a>.</p>
</body>
</html>`;
}
