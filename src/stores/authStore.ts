import { create } from "zustand";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";
import type { Profile, Group, GroupMember } from "../types/database";

interface AuthState {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  groups: Group[];
  activeGroupId: string | null;
  activeRole: GroupMember["role"] | null;
  loading: boolean;

  setSession: (session: Session | null) => void;
  fetchProfile: () => Promise<void>;
  fetchGroups: () => Promise<void>;
  setActiveGroup: (groupId: string) => void;
  updateProfile: (updates: Partial<Profile>) => Promise<void>;
  signOut: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  session: null,
  user: null,
  profile: null,
  groups: [],
  activeGroupId: null,
  activeRole: null,
  loading: true,

  setSession: (session) => {
    set({ session, user: session?.user ?? null, loading: false });
    if (session?.user) {
      get().fetchProfile();
      get().fetchGroups();
    } else {
      set({ profile: null, groups: [], activeGroupId: null, activeRole: null });
    }
  },

  fetchProfile: async () => {
    const { user } = get();
    if (!user) return;

    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    if (data) set({ profile: data });
  },

  fetchGroups: async () => {
    const { user, activeGroupId } = get();
    if (!user) return;

    const { data: memberships } = await supabase
      .from("group_members")
      .select("group_id, role")
      .eq("user_id", user.id);

    if (memberships && memberships.length > 0) {
      const groupIds = memberships.map((m: any) => m.group_id);
      const { data: groupsData } = await supabase
        .from("groups")
        .select("*")
        .in("id", groupIds);

      const groups = (groupsData ?? []) as Group[];

      const firstGroupId = groups[0]?.id ?? null;
      const newActiveId = activeGroupId && groups.find((g) => g.id === activeGroupId)
        ? activeGroupId
        : firstGroupId;

      const activeRole = memberships.find(
        (m: any) => m.group_id === newActiveId
      )?.role as GroupMember["role"] | undefined;

      set({
        groups,
        activeGroupId: newActiveId,
        activeRole: activeRole ?? null,
      });
    }
  },

  setActiveGroup: (groupId) => {
    const { user } = get();
    set({ activeGroupId: groupId });

    if (user) {
      supabase
        .from("group_members")
        .select("role")
        .eq("group_id", groupId)
        .eq("user_id", user.id)
        .single()
        .then(({ data }) => {
          if (data) set({ activeRole: data.role as GroupMember["role"] });
        });
    }
  },

  updateProfile: async (updates) => {
    const { user } = get();
    if (!user) return;

    const { data } = await supabase
      .from("profiles")
      .update(updates)
      .eq("id", user.id)
      .select()
      .single();

    if (data) set({ profile: data });
  },

  signOut: async () => {
    await supabase.auth.signOut();
    set({
      session: null,
      user: null,
      profile: null,
      groups: [],
      activeGroupId: null,
      activeRole: null,
    });
  },
}));
