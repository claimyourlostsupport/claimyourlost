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

**SPA routing:** The repo includes `client/public/_redirects` so client routes work on Pages. Rebuild after pulling latest.

### Social Hub link previews (Facebook + your domain)

Facebook reads Open Graph tags from the **exact URL** people share. The catch-all `_redirects` rule would send `/share/social/*` to `index.html`, so `https://claimyourlost.com/share/social/...` would **not** include post images unless you proxy that path.

1. The repo includes **`client/functions/share/social/[[slug]].js`** (proxies `/share/social/:id` to your API) and **`client/public/_routes.json`** (invokes Functions for `/share/social/*` only). See [Functions routing](https://developers.cloudflare.com/pages/platform/functions/routing/).
2. In **Cloudflare Pages → Settings → Environment variables** (Production), add:

   | Variable | Example |
   |----------|---------|
   | `SOCIAL_SHARE_API_ORIGIN` | `https://claimyourlost-2.onrender.com` (your API origin, no trailing slash) |

   Redeploy Pages after saving.

3. Set **`VITE_PUBLIC_SITE_URL`** to your public site, e.g. `https://claimyourlost.com`, and rebuild the client so “Share” uses `https://claimyourlost.com/share/social/:id` instead of the Render hostname.

4. On **Render** (API), set:

   | Variable | Example |
   |----------|---------|
   | `SHARE_PUBLIC_ORIGIN` | `https://claimyourlost.com` |
   | `API_PUBLIC_ORIGIN` | `https://claimyourlost-2.onrender.com` (same as API URL; used for `og:image` when uploads live on the API) |

5. In [Meta Sharing Debugger](https://developers.facebook.com/tools/debug/), paste your **claimyourlost.com** share URL and use **Scrape Again** to refresh the cache.

#### “Variables cannot be added to a Worker that only has static assets”

Cloudflare shows this when you are **not** on a **Pages** project that bundles **Functions**, or the deployment is still “static files only.”

1. In **Workers & Pages**, use the entry that is connected to **Git** (your repo), with **Build configuration** (root `client`, output `dist`). That is your **Pages** site. Do **not** use a separate **Worker** that only hosts assets — that Worker cannot have runtime variables.
2. Open **that Pages project** → **Settings** → **Variables and Secrets** (under **Production**). If the UI still blocks variables, trigger a **new production deploy** from the latest `main` so `client/functions/` is included; the first deploy **with** Functions creates a real Worker runtime.
3. **Workaround:** Edit `client/functions/share/social/[[slug]].js` and set `HARDCODED_API_ORIGIN` to your Render API URL (e.g. `https://claimyourlost-2.onrender.com`), commit, redeploy Pages. `VITE_PUBLIC_SITE_URL` for share links is still set at **build time** in the same Pages **Variables** screen (or your build will keep using the API hostname for shares until that is set).

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
