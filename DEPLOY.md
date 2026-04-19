# Full deployment guide (GitHub + Cloudflare + API)

Cloudflare only serves the **React frontend** after a build. The **Express API** and **MongoDB** must run elsewhere. Follow the order below.

## What runs where

| Piece | Where |
|--------|--------|
| Website (HTML/JS/CSS) | **Cloudflare Pages** (build from `client/`) |
| API (Express) | **Render**, **Railway**, **Fly.io**, or a VPS |
| Database | **MongoDB Atlas** (free tier) |

---

## Part 1 — MongoDB Atlas

1. Go to [mongodb.com/atlas](https://www.mongodb.com/atlas) and create a free cluster.
2. **Database Access** → add a user (username + password).
3. **Network Access** → **Allow access from anywhere** `0.0.0.0/0` (needed for Render etc.).
4. **Clusters** → **Connect** → **Drivers** → copy the connection string.
5. Replace `<password>` with your DB user password. Example:
   `mongodb+srv://user:PASS@cluster0.xxxxx.mongodb.net/claimyourlost?retryWrites=true&w=majority`

Keep this string for **Part 2** (`MONGODB_URI`). Never commit it to Git.

---

## Part 2 — Deploy the API (Render example)

Use a Node host; [Render](https://render.com) is straightforward on the free tier.

1. Sign up at Render (GitHub login is fine).
2. **New** → **Web Service** → connect the **same GitHub repo** as Cloudflare.
3. Configure:
   - **Name:** e.g. `claimyourlost-api`
   - **Region:** choose closest to users
   - **Branch:** `main` (or your default branch)
   - **Root Directory:** `server`
   - **Runtime:** Node
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
4. **Environment** → add:

   | Key | Value |
   |-----|--------|
   | `MONGODB_URI` | Your Atlas connection string |
   | `JWT_SECRET` | Long random string (e.g. 32+ chars) |
   | `NODE_ENV` | `production` |
   | `CLIENT_URL` | Your **Cloudflare Pages URL** when you have it (step 3), e.g. `https://claimyourlost.pages.dev` — update after first Pages deploy |

5. **Create Web Service**. Wait until it shows **Live**.
6. Copy the service URL, e.g. `https://claimyourlost-api.onrender.com` — this is your **API origin** (no `/api` suffix).

**Uploads:** On free Render, disk is often ephemeral. Images may disappear after restarts. For production, plan **S3/R2** later; for testing this is OK.

---

## Part 3 — Cloudflare Pages (frontend from GitHub)

1. [Cloudflare Dashboard](https://dash.cloudflare.com/) → **Workers & Pages** → **Create** → **Pages** → **Connect to Git**.
2. Select your repository.
3. **Set up builds:**

   | Setting | Value |
   |---------|--------|
   | **Production branch** | `main` (or yours) |
   | **Framework preset** | Vite (or None) |
   | **Root directory** | `client` |
   | **Build command** | `npm install && npm run build` |
   | **Build output directory** | `dist` |

4. **Environment variables** (Production) — **required before the first successful build** if you want the site to talk to the API:

   | Variable | Example value |
   |----------|----------------|
   | `VITE_API_URL` | `https://claimyourlost-api.onrender.com` ← **your Render URL, no trailing slash** |
   | `VITE_PUBLIC_SITE_URL` | `https://your-project.pages.dev` (set after you know the Pages URL; optional for share links) |
   | `VITE_PAYPAL_SUPPORT_URL` | Your PayPal.me link (optional) |

5. **Save and Deploy**.

6. When the build finishes, open the **`.pages.dev`** URL Cloudflare gives you.

7. Go back to **Render** → your Web Service → **Environment** → set `CLIENT_URL` to that exact Pages URL (e.g. `https://claimyourlost-xxxxx.pages.dev`) → **Save** (Render will redeploy).

**SPA routing + share links:** Production builds write **`dist/_redirects`** via `vite.config.js`. The first rule sends **`/share/social/*`** to your **API** with a **302** (using **`VITE_API_URL`** at build time) so crawlers always receive real Open Graph HTML; the last rule keeps the SPA fallback. See [Cloudflare Pages redirects](https://developers.cloudflare.com/pages/configuration/redirects/).

### Social Hub link previews (Facebook / WhatsApp / LinkedIn)

1. **Cloudflare Pages** → **Environment variables** (Production): set **`VITE_API_URL`** to your full API origin, e.g. `https://claimyourlost-2.onrender.com` (no trailing slash). Every **production build** must see this so `_redirects` includes the share line.
2. Set **`VITE_PUBLIC_SITE_URL`** to `https://claimyourlost.com` so in-app “Share” uses your domain in the pasted link (optional if users only share from the live site; the client also uses `window.location.origin` when it is HTTPS).
3. On **Render** (API), set **`CLIENT_URL`** to `https://claimyourlost.com` so **`og:url` / canonical** in share HTML point at your domain. Use **`API_PUBLIC_ORIGIN`** (same as your Render URL) if `og:image` must load from `/uploads` on the API.
4. After deploy, open `https://claimyourlost.com/share/social/<postId>` — you should get a short **302** to Render, then HTML with meta tags; the app then redirects to `/social-hub/<postId>`. In [Meta Sharing Debugger](https://developers.facebook.com/tools/debug/), use **Scrape Again** on the **claimyourlost.com** URL.

**Note:** Pages **Functions** are **not** required for `/share/social/*` anymore (avoids intermittent Cloudflare **404** on that path).

---

## Part 4 — Verify

1. Open your Pages URL → home should load (not only the title).
2. Browser **F12** → **Network**: requests should go to `https://YOUR-API.onrender.com/items/...` (or `/auth/...`), not `404` on `/src/main.jsx`.
3. Register/login and create a test post.

---

## Common mistakes

| Problem | Fix |
|---------|-----|
| Blank white page | You must deploy **built** output: Cloudflare should run `npm run build` in `client/` with root `client`, output `dist`. Do not serve raw repo without build. |
| `index.html` references `/src/main.jsx` | Build failed or wrong folder; check Pages build logs. |
| API calls fail / CORS | Set `CLIENT_URL` on the server to your **exact** Pages URL (`https://...`). |
| API 404 | `VITE_API_URL` must be the **Render (or other) origin** only, e.g. `https://api.onrender.com` — not `/api` alone in production. |

---

## Local check before pushing

From the repo root:

```bash
cd client
npm install
set VITE_API_URL=https://YOUR-API-URL
npm run build
```

(`export VITE_API_URL=...` on macOS/Linux.)

Open `client/dist/index.html` in an editor: it should reference `/assets/index-....js`, not `/src/main.jsx`.

---

## Secrets

- Never commit `server/.env` or Atlas passwords. `.gitignore` should ignore `.env`.
- If you ever committed secrets, rotate them in Atlas/Render/GitHub and use `git filter-repo` or new repo if needed.

---

## Optional: custom domain on Cloudflare

Pages → your project → **Custom domains** → add domain and follow DNS steps. Then set `CLIENT_URL` and `VITE_PUBLIC_SITE_URL` to `https://yourdomain.com` and redeploy both API and Pages.
