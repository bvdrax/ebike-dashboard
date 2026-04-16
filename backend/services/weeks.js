const { pool } = require('../migrations/run');

// Returns ISO date strings for the Mon-Sun week containing the given date (UTC)
function getWeekDates(date = new Date()) {
  const d = new Date(date);
  const day = d.getUTCDay(); // 0=Sun
  const diffToMonday = day === 0 ? -6 : 1 - day;
  const monday = new Date(d);
  monday.setUTCDate(d.getUTCDate() + diffToMonday);
  monday.setUTCHours(0, 0, 0, 0);
  const sunday = new Date(monday);
  sunday.setUTCDate(monday.getUTCDate() + 6);
  return {
    weekStart: monday.toISOString().slice(0, 10),
    weekEnd: sunday.toISOString().slice(0, 10),
  };
}

async function ensureWeek(weekStart, weekEnd) {
  const { rows } = await pool.query(
    `INSERT INTO weeks (week_start, week_end)
     VALUES ($1, $2)
     ON CONFLICT (week_start) DO UPDATE SET week_end = EXCLUDED.week_end
     RETURNING *`,
    [weekStart, weekEnd]
  );
  return rows[0];
}

async function recalcWeekPoints(weekId) {
  const { rows: [config] } = await pool.query('SELECT max_points_per_day FROM weekly_config WHERE id = 1');
  const maxPerDay = config?.max_points_per_day || null;

  if (maxPerDay) {
    await pool.query(`
      UPDATE weeks
      SET points_earned = (
        SELECT COALESCE(SUM(daily_pts), 0)
        FROM (
          SELECT LEAST(SUM(points_awarded), $2) AS daily_pts
          FROM activities WHERE week_id = $1
          GROUP BY activity_date
        ) daily
      )
      WHERE id = $1
    `, [weekId, maxPerDay]);
  } else {
    await pool.query(`
      UPDATE weeks
      SET points_earned = (
        SELECT COALESCE(SUM(points_awarded), 0)
        FROM activities WHERE week_id = $1
      )
      WHERE id = $1
    `, [weekId]);
  }
}

// Finalize all past weeks that haven't been closed yet
async function finalizePastWeeks() {
  const today = new Date().toISOString().slice(0, 10);
  const { rows: config } = await pool.query('SELECT points_goal FROM weekly_config WHERE id = 1');
  const goal = config[0]?.points_goal || 100;

  const { rows: past } = await pool.query(
    'SELECT * FROM weeks WHERE week_end < $1 AND finalized_at IS NULL',
    [today]
  );

  for (const week of past) {
    const goalMet = parseFloat(week.points_earned) >= goal;
    await pool.query(
      'UPDATE weeks SET goal_met = $1, finalized_at = NOW() WHERE id = $2',
      [goalMet, week.id]
    );
  }
}

async function getCurrentWeekData() {
  await finalizePastWeeks();

  const { weekStart, weekEnd } = getWeekDates();
  const week = await ensureWeek(weekStart, weekEnd);
  await recalcWeekPoints(week.id);

  const { rows: [fresh] } = await pool.query(
    `SELECT *, TO_CHAR(week_start, 'YYYY-MM-DD') AS week_start, TO_CHAR(week_end, 'YYYY-MM-DD') AS week_end FROM weeks WHERE id = $1`,
    [week.id]
  );
  const { rows: config } = await pool.query('SELECT points_goal FROM weekly_config WHERE id = 1');
  const goal = config[0]?.points_goal || 100;

  const { rows: [countRow] } = await pool.query(
    'SELECT COUNT(*) AS count FROM activities WHERE week_id = $1',
    [fresh.id]
  );

  const now = new Date();
  const weekEndDate = new Date(weekEnd + 'T23:59:59Z');
  const msRemaining = weekEndDate - now;
  const daysRemaining = Math.max(0, Math.ceil(msRemaining / (1000 * 60 * 60 * 24)));

  const pointsEarned = parseFloat(fresh.points_earned) || 0;
  const pointsNeeded = Math.max(0, goal - pointsEarned);
  const pointsPerDayNeeded = daysRemaining > 0 ? pointsNeeded / daysRemaining : pointsNeeded;
  const isAtRisk = daysRemaining > 0 && pointsPerDayNeeded >= 25 && pointsNeeded > 0;

  // Ride privileges start April 21, 2025 (after first full tracked week)
  const privilegesStart = new Date('2025-04-21T00:00:00Z');
  let rideCurrentlyAllowed = true;

  if (now >= privilegesStart) {
    const prevMonday = new Date(weekStart + 'T00:00:00Z');
    prevMonday.setUTCDate(prevMonday.getUTCDate() - 7);
    const { rows: [prevWeek] } = await pool.query(
      'SELECT * FROM weeks WHERE week_start = $1',
      [prevMonday.toISOString().slice(0, 10)]
    );
    if (prevWeek && prevWeek.goal_met === false && !prevWeek.suspension_lifted) {
      rideCurrentlyAllowed = false;
    }
  }

  return {
    week: {
      ...fresh,
      points_earned: pointsEarned,
      points_needed: pointsNeeded,
      days_remaining: daysRemaining,
      is_at_risk: isAtRisk,
      is_on_track: !isAtRisk,
      points_per_day_needed: Math.ceil(pointsPerDayNeeded),
      goal,
      activity_count: parseInt(countRow.count),
    },
    ride_currently_allowed: rideCurrentlyAllowed,
  };
}

module.exports = { getWeekDates, ensureWeek, recalcWeekPoints, finalizePastWeeks, getCurrentWeekData };
