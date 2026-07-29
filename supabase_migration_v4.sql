-- ============================================================
-- Koryandik Cibadak — Migration v4
-- Tambahan tabel app_settings untuk pengaturan aplikasi dinamis.
-- ============================================================

CREATE TABLE IF NOT EXISTS app_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  description TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_app_settings_key ON app_settings (key);

CREATE OR REPLACE FUNCTION update_app_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_app_settings_updated_at ON app_settings;

CREATE TRIGGER update_app_settings_updated_at
  BEFORE UPDATE ON app_settings
  FOR EACH ROW EXECUTE FUNCTION update_app_settings_updated_at();

INSERT INTO app_settings (key, value, description)
VALUES
  ('submission_deadline_default', '{"day": 15, "type": "monthly"}'::jsonb, 'Default deadline untuk kategori jika tidak didefinisikan.'),
  ('deadline_reminder_days', '{"before": 7, "after": 2}'::jsonb, 'Jarak hari untuk notifikasi pengingat deadline.'),
  ('default_theme', '{"mode": "light"}'::jsonb, 'Tema default untuk aplikasi.'),
  ('announcement_banner_enabled', '{"enabled": true}'::jsonb, 'Menentukan apakah banner pengumuman global aktif.');
