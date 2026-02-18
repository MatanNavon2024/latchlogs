-- LatchLog Initial Schema
-- Requires: pgcrypto extension (enabled by default in Supabase)

-- ============================================================
-- TABLES
-- ============================================================

CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL DEFAULT '',
  avatar_url TEXT,
  push_token TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  invite_code TEXT UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(6), 'hex'),
  plan TEXT NOT NULL DEFAULT 'free' CHECK (plan IN ('free', 'pro')),
  max_locks INT NOT NULL DEFAULT 2,
  max_members INT NOT NULL DEFAULT 3,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE group_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'member', 'guest')),
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(group_id, user_id)
);

CREATE TABLE locks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  nfc_tag_id TEXT UNIQUE,
  qr_code_id TEXT UNIQUE NOT NULL DEFAULT gen_random_uuid()::TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lock_id UUID NOT NULL REFERENCES locks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  action TEXT NOT NULL CHECK (action IN ('lock', 'unlock')),
  source TEXT NOT NULL CHECK (source IN ('nfc', 'qr', 'manual', 'app_clip')),
  device_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- INDEXES
-- ============================================================

CREATE INDEX idx_events_lock_id_created ON events(lock_id, created_at DESC);
CREATE INDEX idx_events_user_id ON events(user_id);
CREATE INDEX idx_group_members_user_id ON group_members(user_id);
CREATE INDEX idx_group_members_group_id ON group_members(group_id);
CREATE INDEX idx_locks_group_id ON locks(group_id);
CREATE INDEX idx_groups_invite_code ON groups(invite_code);

-- ============================================================
-- VIEW: current lock status (latest event per lock)
-- ============================================================

CREATE VIEW lock_current_status AS
SELECT DISTINCT ON (lock_id)
  lock_id,
  action AS status,
  user_id AS last_user_id,
  source AS last_source,
  created_at AS last_action_at
FROM events
ORDER BY lock_id, created_at DESC;

-- ============================================================
-- FUNCTIONS
-- ============================================================

-- Auto-create profile on user signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data ->> 'display_name', ''));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Auto-update updated_at on profiles
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Helper: check if a user belongs to the group that owns a lock
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

-- Helper: check if a user is a member of a given group
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
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE locks ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;

-- PROFILES
CREATE POLICY "Users can view their own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- GROUPS
CREATE POLICY "Members can view their groups"
  ON groups FOR SELECT
  USING (user_in_group(auth.uid(), id));

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
    OR auth.uid() = user_id -- users can join themselves via invite
  );

CREATE POLICY "Admins can update member roles"
  ON group_members FOR UPDATE
  USING (user_group_role(auth.uid(), group_id) = 'admin');

CREATE POLICY "Admins can remove members"
  ON group_members FOR DELETE
  USING (
    user_group_role(auth.uid(), group_id) = 'admin'
    OR auth.uid() = user_id -- users can leave
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
-- REALTIME
-- ============================================================

ALTER PUBLICATION supabase_realtime ADD TABLE events;
