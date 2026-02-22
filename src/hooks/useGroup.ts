import { useState, useCallback, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { useAuthStore } from "../stores/authStore";
import type { GroupMember, Profile } from "../types/database";

interface MemberWithProfile extends GroupMember {
  profiles?: Profile;
}

export function useGroupMembers(groupId?: string) {
  const [members, setMembers] = useState<MemberWithProfile[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchMembers = useCallback(async () => {
    if (!groupId) {
      setMembers([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const { data, error } = await supabase
      .from("group_members")
      .select("*")
      .eq("group_id", groupId)
      .order("joined_at");

    if (error) {
      console.warn("Members fetch error:", error.message);
      setLoading(false);
      return;
    }

    if (data && data.length > 0) {
      const userIds = data.map((m: any) => m.user_id);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, display_name, avatar_url, push_token, created_at, updated_at")
        .in("id", userIds);

      const profileMap = new Map(
        (profiles ?? []).map((p: any) => [p.id, p])
      );

      setMembers(
        data.map((m: any) => ({
          ...m,
          profiles: profileMap.get(m.user_id) ?? undefined,
        }))
      );
    } else {
      setMembers([]);
    }
    setLoading(false);
  }, [groupId]);

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  return { members, loading, refetch: fetchMembers };
}

export async function createGroup(name: string) {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Not authenticated");

  const { data: group, error: groupError } = await supabase
    .from("groups")
    .insert({ name, created_by: user.id })
    .select()
    .single();

  if (groupError) throw groupError;

  // Add creator as admin
  const { error: memberError } = await supabase
    .from("group_members")
    .insert({ group_id: group.id, user_id: user.id, role: "admin" });

  if (memberError) throw memberError;

  return group;
}

export async function joinGroupByCode(inviteCode: string) {
  const { data, error } = await supabase.rpc("join_group_by_invite", {
    p_invite_code: inviteCode,
  });

  if (error) throw new Error(error.message);

  return data;
}

export async function updateMemberRole(
  memberId: string,
  role: "admin" | "member" | "guest"
) {
  const { error } = await supabase
    .from("group_members")
    .update({ role })
    .eq("id", memberId);

  if (error) throw error;
}

export async function removeMember(memberId: string) {
  const { error } = await supabase
    .from("group_members")
    .delete()
    .eq("id", memberId);

  if (error) throw error;
}
