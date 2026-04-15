const router = require('express').Router();
const { pool } = require('../migrations/run');
const { requireAuth } = require('../middleware/auth');
const { getCurrentWeekData, finalizePastWeeks } = require('../services/weeks');
const { syncStravaActivities } = require('../services/strava');

// GET /api/dashboard/current-week
router.get('/current-week', requireAuth, async (req, res, next) => {
  try {
    res.json(await getCurrentWeekData());
  } catch (err) { next(err); }
});

// GET /api/dashboard/weeks
router.get('/weeks', requireAuth, async (req, res, next) => {
  try {
    await finalizePastWeeks();
    const { rows: config } = await pool.query('SELECT points_goal FROM weekly_config WHERE id = 1');
    const goal = config[0]?.points_goal || 100;
    const { rows: weeks } = await pool.query(`
      SELECT w.*, COUNT(a.id) AS activity_count
      FROM weeks w
      LEFT JOIN activities a ON a.week_id = w.id
      GROUP BY w.id
      ORDER BY w.week_start DESC
    `);
    res.json({ weeks, goal });
  } catch (err) { next(err); }
});

// GET /api/dashboard/weeks/:id/activities
router.get('/weeks/:id/activities', requireAuth, async (req, res, next) => {
  try {
    const { rows } = await pool.query(`
      SELECT a.*, at.name AS type_name, at.unit
      FROM activities a
      LEFT JOIN activity_types at ON at.id = a.activity_type_id
      WHERE a.week_id = $1
      ORDER BY a.activity_date DESC, a.created_at DESC
    `, [req.params.id]);
    res.json(rows);
  } catch (err) { next(err); }
});

// POST /api/dashboard/sync
router.post('/sync', requireAuth, async (req, res, next) => {
  try {
    await syncStravaActivities();
    res.json({ ok: true });
  } catch (err) { next(err); }
});

module.exports = router;
