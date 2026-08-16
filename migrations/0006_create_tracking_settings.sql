CREATE TABLE tracking_settings (
  id BOOLEAN PRIMARY KEY DEFAULT true,
  update_interval_ms INTEGER NOT NULL DEFAULT 20000,
  distance_interval_m INTEGER NOT NULL DEFAULT 20,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT tracking_settings_singleton CHECK (id)
);

INSERT INTO tracking_settings (id) VALUES (true);
