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
      SELECT w.id,
        TO_CHAR(w.week_start, 'YYYY-MM-DD') AS week_start,
        TO_CHAR(w.week_end,   'YYYY-MM-DD') AS week_end,
        w.points_earned, w.goal_met, w.suspension_lifted, w.finalized_at, w.created_at,
        COUNT(a.id) AS activity_count
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
      SELECT
        a.id, a.week_id, a.activity_type_id, a.source,
        TO_CHAR(a.activity_date, 'YYYY-MM-DD') AS activity_date,
        COALESCE(o.value,          a.value)          AS value,
        COALESCE(o.points_awarded, a.points_awarded)  AS points_awarded,
        COALESCE(o.name,           a.name)            AS name,
        COALESCE(o.note,           a.note)            AS note,
        at.name AS type_name, at.unit
      FROM activities a
      LEFT JOIN activity_types at ON at.id = a.activity_type_id
      LEFT JOIN activity_overrides o ON o.activity_id = a.id
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
