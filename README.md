# ClaimYourLost

Production-oriented lost & found web app: **post** lost/found items (with optional photo & GPS), **search** (keyword, type, category, date range, **nearby**), **map** (OpenStreetMap + Leaflet), **claims**, **chat** (HTTP polling), **auto-match notifications**, and **phone OTP** (mock or **Twilio**).

| Area | Stack |
|------|--------|
| Frontend | React 18, Vite, Tailwind, React Router, Axios, Leaflet / react-leaflet |
| Backend | Node 18+, Express, MongoDB (Mongoose), JWT, Multer (local images), optional Twilio SMS |
| Monorepo | `client/`, `server/`, root scripts |

---

## Prerequisites

- **Node.js** 18+
- **MongoDB** (local or Atlas)

---

## Quick start

### 1. Install dependencies

From the **repository root**:

```bash
npm run install:all
npm install
```

(`npm install` at root adds `concurrently` for `npm run dev`.)

### 2. Configure environment

**Server** — copy and edit:

```bash
cd server
cp .env.example .env
```

Set at least `MONGODB_URI` and `JWT_SECRET`.

**Client** (optional):

```bash
cd client
cp .env.example .env
```

Default `VITE_API_URL=/api` works with the Vite dev proxy.

### 3. Run MongoDB

Ensure `mongod` is running (or Atlas URI is reachable).

### 4. Start app (two options)

**Option A — one command (root):**

```bash
npm run dev
```

Starts API on **:5000** and Vite on **:5173**.

**Option B — two terminals:**

```bash
cd server && npm run dev
cd client && npm run dev
```

Open **http://localhost:5173**.

---

## Feature checklist

| Feature | Notes |
|--------|--------|
| Auth | `POST /auth/request-otp`, `POST /auth/login`; JWT in `Authorization: Bearer` |
| Mock OTP | No Twilio env → any **6-digit** code after requesting OTP |
| Twilio OTP | Set `TWILIO_*` + optional `DEFAULT_COUNTRY_CODE` (e.g. `91`) |
| Items | CRUD-style: create + list + get; images in `server/uploads/` |
| Search | Keyword + lost/found + category + **from/to date** + **nearby 25 km** (browser GPS) |
| Map | `/map` — pins for items with lat/lng; “Near me” + nearby count |
| Claims | One claim per user per item; owner vs claimant chat rules |
| Chat | Poll messages every few seconds |
| Matching | On new post, opposite type + same category + similar title + location → notifications |
| Notifications | Dashboard + header bell + mark read |
| 404 | Unknown routes show a friendly not-found page |

---

## API summary

| Method | Path | Auth |
|--------|------|------|
| POST | `/auth/request-otp` | No |
| POST | `/auth/login` | No |
| GET | `/items`, `/items/search`, `/items/map`, `/items/near`, `/items/:id` | No |
| GET | `/items/mine` | Yes |
| POST | `/items` | Yes (multipart) |
| GET/POST | `/claims/*`, `/messages/*` | Yes (see routes) |
| GET | `/notifications`, `/notifications/unread-count` | Yes |
| PATCH/POST | `/notifications/:id/read`, `/notifications/read-all` | Yes |

See route files under `server/routes/` for full behavior.

---

## Production build

**Client:**

```bash
cd client
npm run build
```

Serve `client/dist` behind your CDN or static host.

**Env:**

- Set `VITE_API_URL` to your public API URL (e.g. `https://api.example.com`).
- Set `server` `CLIENT_URL` to your frontend origin for CORS.
- Set a strong `JWT_SECRET`.
- Use Twilio in production for real OTPs, or keep mock mode only for private demos.

---

## Security notes

- Regex search input is **escaped** to reduce ReDoS / injection in MongoDB `$regex`.
- OTPs in Twilio mode live in an **in-memory store** (replace with Redis for multi-instance).
- Uploads are **local**; for production use S3-compatible storage and virus scanning as needed.
- Listing photos are **resized to at most 200×200 px** (JPEG, fit inside) on upload; the UI shows them at **200×200 px** (`IMAGE_MAX_EDGE` is capped at 200).

---

## License

Use and modify for your project (e.g. ClaimYourLost / claimyourlost.com).
