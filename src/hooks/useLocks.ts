import { useEffect, useState, useCallback } from "react";
import * as SecureStore from "expo-secure-store";
import { supabase } from "../lib/supabase";
import { useAuthStore } from "../stores/authStore";
import { registerLockGeofences } from "../lib/geofencing";
import type { LockWithStatus } from "../types/database";

export function useLocks() {
  const activeGroupId = useAuthStore((s) => s.activeGroupId);
  const [locks, setLocks] = useState<LockWithStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLocks = useCallback(async () => {
    if (!activeGroupId) {
      setLocks([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const { data, error: fetchError } = await supabase
      .from("locks")
      .select("*, lock_current_status(*)")
      .eq("group_id", activeGroupId)
      .order("created_at", { ascending: false });

    if (fetchError) {
      setError(fetchError.message);
    } else {
      setLocks(
        (data ?? []).map((lock: any) => ({
          ...lock,
          lock_current_status: Array.isArray(lock.lock_current_status)
            ? lock.lock_current_status[0] ?? null
            : lock.lock_current_status ?? null,
        }))
      );
    }
    setLoading(false);
  }, [activeGroupId]);

  useEffect(() => {
    fetchLocks();
  }, [fetchLocks]);

  useEffect(() => {
    if (locks.length > 0) {
      SecureStore.getItemAsync("geofence_enabled").then((val) => {
        if (val === "true") {
          registerLockGeofences(locks).catch(() => {});
        }
      });
    }
  }, [locks]);

  // Realtime subscription for event inserts
  useEffect(() => {
    if (!activeGroupId) return;

    const channel = supabase
      .channel(`events-${activeGroupId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "events" },
        (payload) => {
          const newEvent = payload.new as any;
          setLocks((prev) =>
            prev.map((lock) => {
              if (lock.id !== newEvent.lock_id) return lock;
              return {
                ...lock,
                lock_current_status: {
                  lock_id: newEvent.lock_id,
                  status: newEvent.action,
                  last_user_id: newEvent.user_id,
                  last_source: newEvent.source,
                  last_action_at: newEvent.created_at,
                },
              };
            })
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeGroupId]);

  return { locks, loading, error, refetch: fetchLocks };
}

export async function createLock(
  groupId: string,
  name: string,
  nfcTagId?: string,
  location?: { latitude: number; longitude: number }
) {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Not authenticated");

  const { data, error } = await supabase
    .from("locks")
    .insert({
      group_id: groupId,
      name,
      nfc_tag_id: nfcTagId || null,
      latitude: location?.latitude ?? null,
      longitude: location?.longitude ?? null,
      created_by: user.id,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateLockLocation(
  lockId: string,
  location: { latitude: number; longitude: number } | null
) {
  const { error } = await supabase
    .from("locks")
    .update({
      latitude: location?.latitude ?? null,
      longitude: location?.longitude ?? null,
    })
    .eq("id", lockId);

  if (error) throw error;
}

export async function deleteLock(lockId: string) {
  const { error } = await supabase.from("locks").delete().eq("id", lockId);
  if (error) throw error;
}
