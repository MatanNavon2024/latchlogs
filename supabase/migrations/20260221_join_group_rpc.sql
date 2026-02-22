-- RPC function to join a group by invite code
-- Uses SECURITY DEFINER to bypass RLS (user can't read groups they're not a member of)
CREATE OR REPLACE FUNCTION join_group_by_invite(p_invite_code TEXT)
RETURNS JSON AS $$
DECLARE
  v_group RECORD;
  v_existing RECORD;
  v_count INT;
BEGIN
  SELECT id, name, max_members, plan INTO v_group
  FROM groups WHERE invite_code = p_invite_code;

  IF v_group IS NULL THEN
    RAISE EXCEPTION 'Invalid invite code';
  END IF;

  SELECT id INTO v_existing
  FROM group_members WHERE group_id = v_group.id AND user_id = auth.uid();

  IF v_existing IS NOT NULL THEN
    RETURN json_build_object('group_id', v_group.id, 'group_name', v_group.name, 'already_member', true);
  END IF;

  SELECT count(*) INTO v_count FROM group_members WHERE group_id = v_group.id;
  IF v_count >= v_group.max_members THEN
    RAISE EXCEPTION 'Group has reached maximum members';
  END IF;

  INSERT INTO group_members (group_id, user_id, role)
  VALUES (v_group.id, auth.uid(), 'member');

  RETURN json_build_object('group_id', v_group.id, 'group_name', v_group.name, 'role', 'member');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
