CREATE TABLE IF NOT EXISTS activity_overrides (
  id SERIAL PRIMARY KEY,
  activity_id INTEGER UNIQUE REFERENCES activities(id) ON DELETE CASCADE,
  value DECIMAL(10,3),
  points_awarded DECIMAL(10,2),
  name VARCHAR(255),
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE activity_types ADD COLUMN IF NOT EXISTS points_increment DECIMAL(8,3);
