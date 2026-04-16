const { pool } = require('../migrations/run');
const { getWeekDates, ensureWeek, recalcWeekPoints } = require('./weeks');
const { calcPoints } = require('./points');

async function getAccessToken() {
  const resp = await fetch('https://www.strava.com/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: process.env.STRAVA_CLIENT_ID,
      client_secret: process.env.STRAVA_CLIENT_SECRET,
      refresh_token: process.env.STRAVA_REFRESH_TOKEN,
      grant_type: 'refresh_token',
    }),
  });
  const data = await resp.json();
  if (!data.access_token) {
    throw new Error(`Strava token refresh failed: ${JSON.stringify(data)}`);
  }
  return data.access_token;
}

async function syncStravaActivities() {
  const token = await getAccessToken();

  // Fetch the past 14 days to catch any missed activities
  const after = Math.floor(Date.now() / 1000) - 14 * 24 * 60 * 60;
  const resp = await fetch(
    `https://www.strava.com/api/v3/athlete/activities?after=${after}&per_page=100`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  const activities = await resp.json();

  if (!Array.isArray(activities)) {
    console.error('[Strava] Unexpected response:', activities);
    return;
  }

  const { rows: types } = await pool.query(
    'SELECT * FROM activity_types WHERE strava_type IS NOT NULL AND enabled = true'
  );
  // Map lowercase strava type → activity type row
  const typeMap = Object.fromEntries(
    types.map(t => [t.strava_type.toLowerCase(), t])
  );

  let synced = 0;
  for (const act of activities) {
    const stravaType = (act.sport_type || act.type || '').toLowerCase();
    const type = typeMap[stravaType];
    if (!type) continue;

    // Convert Strava units to our unit
    let value;
    if (type.unit === 'mile')   value = (act.distance || 0) / 1609.344;
    else if (type.unit === 'km')     value = (act.distance || 0) / 1000;
    else if (type.unit === 'minute') value = (act.moving_time || 0) / 60;
    else if (type.unit === 'hour')   value = (act.moving_time || 0) / 3600;
    else continue;

    value = Math.round(value * 100) / 100;
    const points = calcPoints(value, type);
    if (points === 0) continue;

    const activityDate = act.start_date_local.slice(0, 10);
    const { weekStart, weekEnd } = getWeekDates(new Date(activityDate + 'T12:00:00Z'));
    const week = await ensureWeek(weekStart, weekEnd);

    await pool.query(`
      INSERT INTO activities
        (strava_id, week_id, activity_type_id, activity_date, value, points_awarded, name, source)
      VALUES ($1, $2, $3, $4, $5, $6, $7, 'strava')
      ON CONFLICT (strava_id) DO UPDATE SET
        week_id          = EXCLUDED.week_id,
        activity_type_id = EXCLUDED.activity_type_id,
        activity_date    = EXCLUDED.activity_date,
        value            = EXCLUDED.value,
        points_awarded   = EXCLUDED.points_awarded,
        name             = EXCLUDED.name
    `, [act.id, week.id, type.id, activityDate, value, points, act.name]);

    await recalcWeekPoints(week.id);
    synced++;
  }

  console.log(`[Strava] Synced ${synced} activities`);
}

module.exports = { syncStravaActivities };
