const express = require('express');
const cors = require('cors');
const cron = require('node-cron');
const rateLimit = require('express-rate-limit');
const { runMigrations } = require('./migrations/run');
const { syncStravaActivities } = require('./services/strava');
const authRoutes = require('./routes/auth');
const dashboardRoutes = require('./routes/dashboard');
const configRoutes = require('./routes/config');

const app = express();
const PORT = process.env.PORT || 3001;

app.set('trust proxy', 1);

app.use(cors({
  origin: process.env.NODE_ENV === 'production'
    ? ['https://ebike.supervarelas.com']
    : ['http://localhost:3000', 'http://localhost:5173'],
  credentials: true,
}));

app.use(express.json());

app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
}));

app.use('/api/auth', authRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/config', configRoutes);

app.get('/api/health', (req, res) => res.json({ ok: true }));

app.use((err, req, res, next) => {
  console.error('[Error]', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Hourly Strava sync
cron.schedule('0 * * * *', () => {
  console.log('[Cron] Running hourly Strava sync...');
  syncStravaActivities().catch(console.error);
});

async function start() {
  try {
    await runMigrations();
    console.log('[DB] Migrations complete');

    app.listen(PORT, () => {
      console.log(`[Server] Running on port ${PORT}`);
    });

    // Initial sync on startup
    setTimeout(() => {
      syncStravaActivities().catch(console.error);
    }, 3000);

  } catch (err) {
    console.error('[Startup] Fatal error:', err);
    process.exit(1);
  }
}

start();
