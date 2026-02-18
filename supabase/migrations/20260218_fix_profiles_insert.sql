-- Allow group admins to create profiles for users they add to their groups
DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;

CREATE POLICY "Users can insert profiles"
  ON profiles FOR INSERT
  WITH CHECK (
    auth.uid() = id
    OR EXISTS (
      SELECT 1 FROM group_members
      WHERE user_id = auth.uid()
        AND role = 'admin'
    )
  );
