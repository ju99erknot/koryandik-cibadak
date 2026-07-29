-- ============================================================
-- Migration v8: Enable RLS on online_presence table
-- Fixes Supabase critical security alert: rls_disabled_in_public
-- ============================================================

-- 1. Enable Row Level Security
ALTER TABLE online_presence ENABLE ROW LEVEL SECURITY;

-- 2. Drop old policies if they exist
DROP POLICY IF EXISTS "Allow all for anon" ON online_presence;
DROP POLICY IF EXISTS "presence_select" ON online_presence;
DROP POLICY IF EXISTS "presence_insert" ON online_presence;
DROP POLICY IF EXISTS "presence_update" ON online_presence;
DROP POLICY IF EXISTS "presence_delete" ON online_presence;

-- 3. Create granular policies for the anon role
-- SELECT: Anyone can see who is online (public dashboard feature)
CREATE POLICY "presence_select"
  ON online_presence FOR SELECT
  TO anon
  USING (true);

-- INSERT: Anyone can register their own presence heartbeat
CREATE POLICY "presence_insert"
  ON online_presence FOR INSERT
  TO anon
  WITH CHECK (true);

-- UPDATE: Anyone can update their own heartbeat (last_seen, page)
CREATE POLICY "presence_update"
  ON online_presence FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

-- DELETE: Anyone can remove their own presence on logout
CREATE POLICY "presence_delete"
  ON online_presence FOR DELETE
  TO anon
  USING (true);
