const router = require('express').Router();
const { pool } = require('../migrations/run');
const { requireAuth, requireRole } = require('../middleware/auth');
const { getWeekDates, ensureWeek, recalcWeekPoints } = require('../services/weeks');
const { calcPoints } = require('../services/points');

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
    const { name, strava_type, points_per_unit, unit, minimum_value, points_increment } = req.body;
    const { rows } = await pool.query(
      'INSERT INTO activity_types (name, strava_type, points_per_unit, unit, minimum_value, points_increment) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [name, strava_type || null, points_per_unit, unit, minimum_value ?? 0, points_increment ?? null]
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
    const { points_per_unit, unit, minimum_value, points_increment, enabled } = req.body;
    const { rows } = await pool.query(`
      UPDATE activity_types SET
        points_per_unit  = COALESCE($1, points_per_unit),
        unit             = COALESCE($2, unit),
        minimum_value    = COALESCE($3, minimum_value),
        points_increment = $4,
        enabled          = COALESCE($5, enabled)
      WHERE id = $6
      RETURNING *
    `, [points_per_unit ?? null, unit ?? null, minimum_value ?? null, points_increment ?? null, enabled ?? null, req.params.id]);
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

    const points = calcPoints(value, type);

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

// GET /api/config/activities (admin) — returns original + override fields separately
router.get('/activities', requireAuth, requireRole('admin'), async (req, res, next) => {
  try {
    const { rows } = await pool.query(`
      SELECT
        a.id, a.strava_id, a.week_id, a.activity_type_id, a.source,
        TO_CHAR(a.activity_date, 'YYYY-MM-DD') AS activity_date,
        a.value            AS original_value,
        a.points_awarded   AS original_points,
        a.name             AS original_name,
        a.note             AS original_note,
        at.name AS type_name, at.unit, at.points_per_unit, at.minimum_value, at.points_increment,
        TO_CHAR(w.week_start, 'YYYY-MM-DD') AS week_start,
        o.id               AS override_id,
        o.value            AS override_value,
        o.points_awarded   AS override_points,
        o.name             AS override_name,
        o.note             AS override_note
      FROM activities a
      LEFT JOIN activity_types at ON at.id = a.activity_type_id
      LEFT JOIN weeks w ON w.id = a.week_id
      LEFT JOIN activity_overrides o ON o.activity_id = a.id
      ORDER BY a.activity_date DESC, a.created_at DESC
      LIMIT 200
    `);
    res.json(rows);
  } catch (err) { next(err); }
});

// PUT /api/config/activities/:id (admin) — saves an override, never touches the original
router.put('/activities/:id', requireAuth, requireRole('admin'), async (req, res, next) => {
  try {
    const { value, name, note } = req.body;

    const { rows: [activity] } = await pool.query(`
      SELECT a.*, at.points_per_unit, at.minimum_value, at.points_increment
      FROM activities a
      LEFT JOIN activity_types at ON at.id = a.activity_type_id
      WHERE a.id = $1
    `, [req.params.id]);
    if (!activity) return res.status(404).json({ error: 'Not found' });

    const newValue = value !== undefined ? parseFloat(value) : parseFloat(activity.original_value ?? activity.value);
    const points = calcPoints(newValue, activity);

    const { rows: [override] } = await pool.query(`
      INSERT INTO activity_overrides (activity_id, value, points_awarded, name, note, updated_at)
      VALUES ($1, $2, $3, $4, $5, NOW())
      ON CONFLICT (activity_id) DO UPDATE SET
        value          = EXCLUDED.value,
        points_awarded = EXCLUDED.points_awarded,
        name           = EXCLUDED.name,
        note           = EXCLUDED.note,
        updated_at     = NOW()
      RETURNING *
    `, [req.params.id, newValue, points, name ?? null, note ?? null]);

    await recalcWeekPoints(activity.week_id);
    res.json(override);
  } catch (err) { next(err); }
});

// DELETE /api/config/activities/:id/override (admin) — clears override, restores original
router.delete('/activities/:id/override', requireAuth, requireRole('admin'), async (req, res, next) => {
  try {
    await pool.query('DELETE FROM activity_overrides WHERE activity_id = $1', [req.params.id]);
    const { rows: [activity] } = await pool.query('SELECT week_id FROM activities WHERE id = $1', [req.params.id]);
    if (activity) await recalcWeekPoints(activity.week_id);
    res.json({ ok: true });
  } catch (err) { next(err); }
});

// DELETE /api/config/activities/:id (admin) — fully removes activity (manual credits only; Strava will re-sync)
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
