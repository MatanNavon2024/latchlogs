-- Fix: Allow group members to see each other's profiles
-- (needed for history to show display names)

DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;

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
