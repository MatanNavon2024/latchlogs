-- ============================================================
-- FIX: Drop broken trigger + recreate ALL functions & policies
-- Run this in Supabase SQL Editor
-- ============================================================

-- Drop broken trigger (may not exist)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS handle_new_user();

-- Recreate updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS profiles_updated_at ON profiles;
CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Helper: check if user belongs to the group that owns a lock
CREATE OR REPLACE FUNCTION user_in_lock_group(p_user_id UUID, p_lock_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1
    FROM group_members gm
    JOIN locks l ON l.group_id = gm.group_id
    WHERE gm.user_id = p_user_id
      AND l.id = p_lock_id
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Helper: check if user is a member of a given group
CREATE OR REPLACE FUNCTION user_in_group(p_user_id UUID, p_group_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM group_members
    WHERE user_id = p_user_id AND group_id = p_group_id
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Helper: get user role in a group
CREATE OR REPLACE FUNCTION user_group_role(p_user_id UUID, p_group_id UUID)
RETURNS TEXT AS $$
  SELECT role FROM group_members
  WHERE user_id = p_user_id AND group_id = p_group_id
  LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ============================================================
-- ENABLE RLS (safe to run again)
-- ============================================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE locks ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- DROP ALL EXISTING POLICIES (clean slate)
-- ============================================================

DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can view profiles of group members" ON profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;

DROP POLICY IF EXISTS "Members can view their groups" ON groups;
DROP POLICY IF EXISTS "Authenticated users can create groups" ON groups;
DROP POLICY IF EXISTS "Admins can update their groups" ON groups;

DROP POLICY IF EXISTS "Members can view group membership" ON group_members;
DROP POLICY IF EXISTS "Admins can add members" ON group_members;
DROP POLICY IF EXISTS "Admins can update member roles" ON group_members;
DROP POLICY IF EXISTS "Admins can remove members" ON group_members;

DROP POLICY IF EXISTS "Group members can view locks" ON locks;
DROP POLICY IF EXISTS "Admins can create locks" ON locks;
DROP POLICY IF EXISTS "Admins can update locks" ON locks;
DROP POLICY IF EXISTS "Admins can delete locks" ON locks;

DROP POLICY IF EXISTS "Group members can view events" ON events;
DROP POLICY IF EXISTS "Members and admins can record events" ON events;

-- ============================================================
-- RECREATE ALL POLICIES
-- ============================================================

-- PROFILES (allow group members to see each other's profiles)
CREATE POLICY "Users can view profiles of group members"
  ON profiles FOR SELECT
  USING (
    auth.uid() = id
    OR EXISTS (
      SELECT 1 FROM group_members gm1
      JOIN group_members gm2 ON gm1.group_id = gm2.group_id
      WHERE gm1.user_id = auth.uid()
        AND gm2.user_id = profiles.id
    )
  );

CREATE POLICY "Users can insert their own profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- GROUPS
CREATE POLICY "Members can view their groups"
  ON groups FOR SELECT
  USING (user_in_group(auth.uid(), id) OR auth.uid() = created_by);

CREATE POLICY "Authenticated users can create groups"
  ON groups FOR INSERT
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Admins can update their groups"
  ON groups FOR UPDATE
  USING (user_group_role(auth.uid(), id) = 'admin');

-- GROUP_MEMBERS
CREATE POLICY "Members can view group membership"
  ON group_members FOR SELECT
  USING (user_in_group(auth.uid(), group_id));

CREATE POLICY "Admins can add members"
  ON group_members FOR INSERT
  WITH CHECK (
    user_group_role(auth.uid(), group_id) = 'admin'
    OR auth.uid() = user_id
  );

CREATE POLICY "Admins can update member roles"
  ON group_members FOR UPDATE
  USING (user_group_role(auth.uid(), group_id) = 'admin');

CREATE POLICY "Admins can remove members"
  ON group_members FOR DELETE
  USING (
    user_group_role(auth.uid(), group_id) = 'admin'
    OR auth.uid() = user_id
  );

-- LOCKS
CREATE POLICY "Group members can view locks"
  ON locks FOR SELECT
  USING (user_in_group(auth.uid(), group_id));

CREATE POLICY "Admins can create locks"
  ON locks FOR INSERT
  WITH CHECK (user_group_role(auth.uid(), group_id) = 'admin');

CREATE POLICY "Admins can update locks"
  ON locks FOR UPDATE
  USING (user_group_role(auth.uid(), group_id) = 'admin');

CREATE POLICY "Admins can delete locks"
  ON locks FOR DELETE
  USING (user_group_role(auth.uid(), group_id) = 'admin');

-- EVENTS
CREATE POLICY "Group members can view events"
  ON events FOR SELECT
  USING (user_in_lock_group(auth.uid(), lock_id));

CREATE POLICY "Members and admins can record events"
  ON events FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND user_in_lock_group(auth.uid(), lock_id)
    AND user_group_role(
      auth.uid(),
      (SELECT group_id FROM locks WHERE id = lock_id)
    ) IN ('admin', 'member')
  );

-- ============================================================
-- REALTIME (safe to run again)
-- ============================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'events'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE events;
  END IF;
END $$;
