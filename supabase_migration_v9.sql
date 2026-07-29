-- Migration v9: Add avatar fields for principal and operator to schools table

ALTER TABLE schools ADD COLUMN IF NOT EXISTS principal_avatar_url TEXT;
ALTER TABLE schools ADD COLUMN IF NOT EXISTS operator_avatar_url TEXT;
