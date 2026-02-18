import { useState, useCallback } from "react";
import { supabase } from "../lib/supabase";
import type { EventWithDetails } from "../types/database";

const PAGE_SIZE = 30;

interface UseEventsOptions {
  lockId?: string;
  userId?: string;
  startDate?: string;
  endDate?: string;
}

export function useEvents(options: UseEventsOptions = {}) {
  const [events, setEvents] = useState<EventWithDetails[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);

  const fetchEvents = useCallback(
    async (reset = false) => {
      setLoading(true);
      const currentPage = reset ? 0 : page;

      let query = supabase
        .from("events")
        .select("*, lock:locks(name)")
        .order("created_at", { ascending: false })
        .range(
          currentPage * PAGE_SIZE,
          (currentPage + 1) * PAGE_SIZE - 1
        );

      if (options.lockId) query = query.eq("lock_id", options.lockId);
      if (options.userId) query = query.eq("user_id", options.userId);
      if (options.startDate)
        query = query.gte("created_at", options.startDate);
      if (options.endDate) query = query.lte("created_at", options.endDate);

      const { data, error } = await query;

      if (error) {
        console.warn("Events fetch error:", error.message);
        setLoading(false);
        return;
      }

      if (data) {
        // Fetch display names for unique user_ids
        const userIds = [...new Set(data.map((e: any) => e.user_id))];
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, display_name")
          .in("id", userIds);

        const profileMap = new Map(
          (profiles ?? []).map((p: any) => [p.id, p])
        );

        const mapped = data.map((e: any) => ({
          ...e,
          lock: Array.isArray(e.lock) ? e.lock[0] : e.lock,
          user: profileMap.get(e.user_id) ?? { display_name: "" },
        }));

        if (reset) {
          setEvents(mapped);
        } else {
          setEvents((prev) => [...prev, ...mapped]);
        }
        setHasMore(data.length === PAGE_SIZE);
        setPage(reset ? 1 : currentPage + 1);
      }
      setLoading(false);
    },
    [options.lockId, options.userId, options.startDate, options.endDate, page]
  );

  const loadMore = useCallback(() => {
    if (!loading && hasMore) fetchEvents(false);
  }, [loading, hasMore, fetchEvents]);

  const refresh = useCallback(() => fetchEvents(true), [fetchEvents]);

  return { events, loading, hasMore, loadMore, refresh };
}

export async function recordEvent(
  lockId: string,
  action: "lock" | "unlock",
  source: "nfc" | "qr" | "manual" | "app_clip"
) {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Not authenticated");

  const { data, error } = await supabase
    .from("events")
    .insert({
      lock_id: lockId,
      user_id: user.id,
      action,
      source,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}
