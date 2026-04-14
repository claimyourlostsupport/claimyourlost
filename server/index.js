import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

import { connectDB } from './config/db.js';
import authRoutes from './routes/auth.js';
import itemRoutes from './routes/items.js';
import claimRoutes from './routes/claims.js';
import messageRoutes from './routes/messages.js';
import notificationRoutes from './routes/notifications.js';
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
const PORT = process.env.PORT || 5000;

const clientUrls = (process.env.CLIENT_URL || 'http://localhost:5173')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

function isDevLanViteOrigin(origin) {
  if (process.env.NODE_ENV === 'production') return false;
  return /^http:\/\/(192\.168\.\d{1,3}\.\d{1,3}|10\.\d{1,3}\.\d{1,3}\.\d{1,3})(:\d+)?$/.test(origin || '');
}

app.use(
  cors({
    origin(origin, cb) {
      if (!origin) return cb(null, true);
      if (clientUrls.includes(origin)) return cb(null, true);
      if (isDevLanViteOrigin(origin)) return cb(null, true);
      cb(null, false);
    },
    credentials: true,
  })
);
app.use(express.json({ limit: '2mb' }));

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use('/auth', authRoutes);
app.use('/items', itemRoutes);
app.use('/claims', claimRoutes);
app.use('/messages', messageRoutes);
app.use('/notifications', notificationRoutes);

app.get('/health', (_req, res) => {
  res.json({ ok: true, service: 'claimyourlost-api' });
});

/** Browsers opening the API host root see this instead of a generic 404. The website UI is deployed separately. */
app.get('/', (_req, res) => {
  res.json({
    ok: true,
    service: 'claimyourlost-api',
    message: 'API is running. This URL serves JSON only — the public site is hosted elsewhere.',
    health: '/health',
    routes: ['/auth', '/items', '/claims', '/messages', '/notifications'],
  });
});

app.use((_req, res) => {
  res.status(404).json({ error: 'Not found' });
});

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: err.message || 'Server error' });
});

async function start() {
  const onRender = process.env.RENDER === 'true' || Boolean(process.env.RENDER_EXTERNAL_URL);
  console.log(
    `[startup] NODE_ENV=${process.env.NODE_ENV || '(unset)'} PORT=${PORT} MONGODB_URI=${process.env.MONGODB_URI ? 'set' : 'MISSING'} RENDER=${onRender}`
  );

  const requireAtlas = process.env.NODE_ENV === 'production' || onRender;
  if (requireAtlas && !process.env.MONGODB_URI) {
    console.error(
      '[startup] MONGODB_URI is required. In Render: Web Service → Environment → add MONGODB_URI (your Atlas connection string).'
    );
    process.exit(1);
  }

  if (process.env.NODE_ENV === 'production' && !process.env.JWT_SECRET) {
    console.warn('Warning: JWT_SECRET is not set. Set a strong secret in production.');
  }

  // Bind immediately so platforms like Render see an open port (PORT env). MongoDB connects after.
  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`ClaimYourLost API listening on 0.0.0.0:${PORT}`);
  });
  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.error(
        `Port ${PORT} is already in use. Close the other app (e.g. old node server) or set PORT in server/.env and match client/vite.config.js proxy target.`
      );
    } else {
      console.error(err);
    }
    process.exit(1);
  });

  try {
    await connectDB();
  } catch (e) {
    console.error('MongoDB connection failed:', e);
    process.exit(1);
  }
}

start().catch((e) => {
  console.error(e);
  process.exit(1);
});
