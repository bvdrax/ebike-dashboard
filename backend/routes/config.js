const router = require('express').Router();
const { pool } = require('../migrations/run');
const { requireAuth, requireRole } = require('../middleware/auth');
const { getWeekDates, ensureWeek, recalcWeekPoints } = require('../services/weeks');

// GET /api/config/activity-types
router.get('/activity-types', requireAuth, async (req, res, next) => {
  try {
    const { rows } = await pool.query('SELECT * FROM activity_types ORDER BY id');
    res.json(rows);
  } catch (err) { next(err); }
});

// POST /api/config/activity-types (admin)
router.post('/activity-types', requireAuth, requireRole('admin'), async (req, res, next) => {
  try {
    const { name, strava_type, points_per_unit, unit, minimum_value } = req.body;
    const { rows } = await pool.query(
      'INSERT INTO activity_types (name, strava_type, points_per_unit, unit, minimum_value) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [name, strava_type || null, points_per_unit, unit, minimum_value ?? 0]
    );
    res.json(rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Activity type name already exists' });
    next(err);
  }
});

// PUT /api/config/activity-types/:id (admin)
router.put('/activity-types/:id', requireAuth, requireRole('admin'), async (req, res, next) => {
  try {
    const { points_per_unit, unit, minimum_value, enabled } = req.body;
    const { rows } = await pool.query(`
      UPDATE activity_types SET
        points_per_unit = COALESCE($1, points_per_unit),
        unit            = COALESCE($2, unit),
        minimum_value   = COALESCE($3, minimum_value),
        enabled         = COALESCE($4, enabled)
      WHERE id = $5
      RETURNING *
    `, [points_per_unit ?? null, unit ?? null, minimum_value ?? null, enabled ?? null, req.params.id]);
    if (!rows[0]) return res.status(404).json({ error: 'Not found' });
    res.json(rows[0]);
  } catch (err) { next(err); }
});

// GET /api/config/weekly
router.get('/weekly', requireAuth, async (req, res, next) => {
  try {
    const { rows } = await pool.query('SELECT points_goal, max_points_per_day FROM weekly_config WHERE id = 1');
    res.json(rows[0] || { points_goal: 100, max_points_per_day: null });
  } catch (err) { next(err); }
});

// PUT /api/config/weekly (admin)
router.put('/weekly', requireAuth, requireRole('admin'), async (req, res, next) => {
  try {
    const { points_goal, max_points_per_day } = req.body;
    const { rows } = await pool.query(
      'UPDATE weekly_config SET points_goal = $1, max_points_per_day = $2, updated_at = NOW() WHERE id = 1 RETURNING *',
      [points_goal, max_points_per_day ?? null]
    );
    res.json(rows[0]);
  } catch (err) { next(err); }
});

// POST /api/config/credits (admin)
router.post('/credits', requireAuth, requireRole('admin'), async (req, res, next) => {
  try {
    const { activity_type_id, activity_date, value, name, note } = req.body;
    const { rows: [type] } = await pool.query(
      'SELECT * FROM activity_types WHERE id = $1 AND enabled = true',
      [activity_type_id]
    );
    if (!type) return res.status(404).json({ error: 'Activity type not found' });

    const points = parseFloat(value) < parseFloat(type.minimum_value)
      ? 0
      : Math.round(parseFloat(value) * parseFloat(type.points_per_unit));

    const { weekStart, weekEnd } = getWeekDates(new Date(activity_date + 'T12:00:00Z'));
    const week = await ensureWeek(weekStart, weekEnd);
    const activityName = name || `Manual: ${type.name}`;

    const { rows: [activity] } = await pool.query(
      `INSERT INTO activities (week_id, activity_type_id, activity_date, value, points_awarded, name, note, source)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'manual') RETURNING *`,
      [week.id, activity_type_id, activity_date, value, points, activityName, note || null]
    );

    await recalcWeekPoints(week.id);
    res.json({ points_awarded: points, activity });
  } catch (err) { next(err); }
});

// POST /api/config/weeks/:id/lift-suspension (admin)
router.post('/weeks/:id/lift-suspension', requireAuth, requireRole('admin'), async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      'UPDATE weeks SET suspension_lifted = true WHERE id = $1 RETURNING *',
      [req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Week not found' });
    res.json(rows[0]);
  } catch (err) { next(err); }
});

// GET /api/config/activities (admin)
router.get('/activities', requireAuth, requireRole('admin'), async (req, res, next) => {
  try {
    const { rows } = await pool.query(`
      SELECT a.*, at.name AS type_name, at.unit, at.points_per_unit, at.minimum_value,
             TO_CHAR(w.week_start, 'YYYY-MM-DD') AS week_start
      FROM activities a
      LEFT JOIN activity_types at ON at.id = a.activity_type_id
      LEFT JOIN weeks w ON w.id = a.week_id
      ORDER BY a.activity_date DESC, a.created_at DESC
      LIMIT 200
    `);
    res.json(rows);
  } catch (err) { next(err); }
});

// PUT /api/config/activities/:id (admin) — edit name, note, value
router.put('/activities/:id', requireAuth, requireRole('admin'), async (req, res, next) => {
  try {
    const { value, name, note } = req.body;

    const { rows: [current] } = await pool.query(`
      SELECT a.*, at.points_per_unit, at.minimum_value
      FROM activities a
      LEFT JOIN activity_types at ON at.id = a.activity_type_id
      WHERE a.id = $1
    `, [req.params.id]);
    if (!current) return res.status(404).json({ error: 'Not found' });

    const newValue = value !== undefined ? parseFloat(value) : parseFloat(current.value);
    const points = newValue < parseFloat(current.minimum_value)
      ? 0
      : Math.round(newValue * parseFloat(current.points_per_unit));

    const { rows: [updated] } = await pool.query(`
      UPDATE activities SET
        value          = $1,
        points_awarded = $2,
        name           = COALESCE($3, name),
        note           = $4
      WHERE id = $5
      RETURNING *
    `, [newValue, points, name ?? null, note ?? null, req.params.id]);

    await recalcWeekPoints(current.week_id);
    res.json(updated);
  } catch (err) { next(err); }
});

// DELETE /api/config/activities/:id (admin)
router.delete('/activities/:id', requireAuth, requireRole('admin'), async (req, res, next) => {
  try {
    const { rows: [activity] } = await pool.query(
      'DELETE FROM activities WHERE id = $1 RETURNING *',
      [req.params.id]
    );
    if (!activity) return res.status(404).json({ error: 'Not found' });
    await recalcWeekPoints(activity.week_id);
    res.json({ ok: true });
  } catch (err) { next(err); }
});

module.exports = router;
