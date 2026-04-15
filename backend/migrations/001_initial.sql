CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role VARCHAR(20) NOT NULL DEFAULT 'athlete',
  display_name VARCHAR(100),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS activity_types (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) UNIQUE NOT NULL,
  strava_type VARCHAR(50),
  points_per_unit DECIMAL(8,2) NOT NULL,
  unit VARCHAR(20) NOT NULL,
  minimum_value DECIMAL(8,2) NOT NULL DEFAULT 0,
  enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS weeks (
  id SERIAL PRIMARY KEY,
  week_start DATE NOT NULL UNIQUE,
  week_end DATE NOT NULL,
  points_earned DECIMAL(10,2) DEFAULT 0,
  goal_met BOOLEAN,
  suspension_lifted BOOLEAN DEFAULT false,
  finalized_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS activities (
  id SERIAL PRIMARY KEY,
  strava_id BIGINT UNIQUE,
  week_id INTEGER REFERENCES weeks(id),
  activity_type_id INTEGER REFERENCES activity_types(id),
  activity_date DATE NOT NULL,
  value DECIMAL(10,3) NOT NULL,
  points_awarded DECIMAL(10,2) NOT NULL,
  name VARCHAR(255),
  note TEXT,
  source VARCHAR(20) NOT NULL DEFAULT 'strava',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS weekly_config (
  id INTEGER PRIMARY KEY DEFAULT 1,
  points_goal INTEGER NOT NULL DEFAULT 100,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO weekly_config (id, points_goal) VALUES (1, 100) ON CONFLICT DO NOTHING;

INSERT INTO activity_types (name, strava_type, points_per_unit, unit, minimum_value) VALUES
  ('Run',             'Run',           10, 'mile',   1),
  ('Walk',            'Walk',           5, 'mile',   1),
  ('Ride',            'Ride',           8, 'mile',   2),
  ('Weight Training', 'WeightTraining',15, 'minute', 30),
  ('Soccer',          'Soccer',        12, 'minute', 45),
  ('Hike',            'Hike',           8, 'mile',   1),
  ('Manual Credit',   NULL,            10, 'minute',  1)
ON CONFLICT (name) DO NOTHING;
