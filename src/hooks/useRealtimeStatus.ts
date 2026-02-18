import { useEffect } from "react";
import { supabase } from "../lib/supabase";
import { useAuthStore } from "../stores/authStore";

export function useRealtimeStatus(
  onEvent: (event: {
    lock_id: string;
    action: "lock" | "unlock";
    user_id: string;
    source: string;
    created_at: string;
  }) => void
) {
  const activeGroupId = useAuthStore((s) => s.activeGroupId);

  useEffect(() => {
    if (!activeGroupId) return;

    const channel = supabase
      .channel(`realtime-status-${activeGroupId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "events",
        },
        (payload) => {
          onEvent(payload.new as any);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeGroupId, onEvent]);
}
