CREATE TABLE IF NOT EXISTS location_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  location GEOGRAPHY(Point, 4326) NOT NULL,
  accuracy DOUBLE PRECISION,
  altitude DOUBLE PRECISION,
  speed DOUBLE PRECISION,
  heading DOUBLE PRECISION,
  battery_level DOUBLE PRECISION,
  recorded_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS location_history_employee_id_idx ON location_history (employee_id);
CREATE INDEX IF NOT EXISTS location_history_recorded_at_idx ON location_history (recorded_at);
CREATE INDEX IF NOT EXISTS location_history_employee_recorded_idx ON location_history (employee_id, recorded_at);
CREATE INDEX IF NOT EXISTS location_history_location_gix ON location_history USING GIST (location);
