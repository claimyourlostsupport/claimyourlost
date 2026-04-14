# Start here — I can’t log in for you (nobody can)

**Anyone who says they will “deploy for you” using your passwords is a scam.**  
Only **you** can sign in to GitHub, MongoDB Atlas, Render, and Cloudflare.

The project now includes **`render.yaml`** so the **API** is one Blueprint away. You only copy‑paste a few values.

---

## Step 0 — Push this repo to GitHub (if not already)

On your PC, in the project folder, commit and push **including** `render.yaml` and `START-HERE.md`.

---

## Step 1 — MongoDB Atlas (~10 minutes)

1. Open **[mongodb.com/cloud/atlas/register](https://www.mongodb.com/cloud/atlas/register)** and create a free account.
2. Create a **free M0 cluster** (any region).
3. **Database Access** → **Add New Database User** → note **username** and **password**.
4. **Network Access** → **Add IP Address** → **Allow Access from Anywhere** (`0.0.0.0/0`) → Confirm.  
   (Needed so Render can connect.)
5. **Database** → **Connect** → **Drivers** → copy the connection string.  
   Replace `<password>` with your database user password.  
   Example ends with `...mongodb.net/claimyourlost?...`  
   Keep this string — it is your **`MONGODB_URI`**.

---

## Step 2 — Deploy the API on Render using Blueprint

1. Open **[dashboard.render.com](https://dashboard.render.com)** → sign up with **GitHub**.
2. **New** → **Blueprint**.
3. Connect the **same GitHub repo** as this project.
4. Render reads **`render.yaml`** from the repo root. Continue.
5. When asked for **environment variables**, enter:

   | Name | What to paste |
   |------|----------------|
   | `MONGODB_URI` | Full Atlas string from Step 1 |
   | `JWT_SECRET` | Any long random text (e.g. 40+ letters/numbers) |
   | `CLIENT_URL` | For now use `https://example.com` — you **will change this** in Step 4 after Cloudflare gives you a real URL |

6. **Apply** / create. Wait until the service is **Live**.
7. Copy the **public URL** of the service, e.g. `https://claimyourlost-api.onrender.com`  
   This is your **API URL** (no `/api` at the end).

---

## Step 3 — Cloudflare Pages (frontend)

1. Open **[dash.cloudflare.com](https://dash.cloudflare.com)** → **Workers & Pages** → **Create** → **Pages** → **Connect to Git**.
2. Select the **same repository**.
3. Configure the build:

   | Setting | Value |
   |--------|--------|
   | **Root directory** | `client` |
   | **Build command** | `npm install && npm run build` |
   | **Build output directory** | `dist` |

4. **Environment variables** (Production):

   | Name | Value |
   |------|--------|
   | `VITE_API_URL` | Your Render URL from Step 2, e.g. `https://claimyourlost-api.onrender.com` |

5. **Save and Deploy**. Wait for the build to finish.
6. Open the **`.pages.dev`** URL Cloudflare shows. The app should load (not only the title).

---

## Step 4 — Point the API at your real site (CORS)

1. Copy your **exact** Cloudflare Pages URL, e.g. `https://claimyourlost.pages.dev`.
2. In **Render** → your **Web Service** → **Environment** → set **`CLIENT_URL`** to that **exact** URL (replace the placeholder from Step 2).
3. **Save** — Render redeploys. Wait until it is Live again.

---

## Step 5 — Test

- Open your Pages URL → browse listings, try **Log in** / register.
- If the page is blank: **F12** → **Console** / **Network** — failed requests often show a wrong `VITE_API_URL` or `CLIENT_URL`.

---

## Need more detail?

See **`DEPLOY.md`** in this repo.

---

## Quick reference

| What | Where it lives |
|------|----------------|
| Website | Cloudflare Pages (`client` → build → `dist`) |
| API | Render (`server/` via `render.yaml`) |
| Database | MongoDB Atlas |
| Secrets | Only in Render / Cloudflare / Atlas dashboards — **never** in Git |
