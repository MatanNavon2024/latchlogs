import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface RecordEventBody {
  lock_id: string;
  action: "lock" | "unlock";
  source: "nfc" | "qr" | "manual" | "app_clip";
  device_id?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing auth header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body: RecordEventBody = await req.json();
    const { lock_id, action, source, device_id } = body;

    if (!lock_id || !action || !source) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: lock_id, action, source" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!["lock", "unlock"].includes(action)) {
      return new Response(JSON.stringify({ error: "Invalid action" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify user has access to this lock's group and has member/admin role
    const { data: lock, error: lockError } = await supabase
      .from("locks")
      .select("id, group_id, name")
      .eq("id", lock_id)
      .single();

    if (lockError || !lock) {
      return new Response(JSON.stringify({ error: "Lock not found or access denied" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: membership } = await supabase
      .from("group_members")
      .select("role")
      .eq("group_id", lock.group_id)
      .eq("user_id", user.id)
      .single();

    if (!membership || membership.role === "guest") {
      return new Response(JSON.stringify({ error: "Insufficient permissions" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Insert event
    const { data: event, error: insertError } = await supabase
      .from("events")
      .insert({
        lock_id,
        user_id: user.id,
        action,
        source,
        device_id: device_id || null,
      })
      .select("id, created_at")
      .single();

    if (insertError) {
      return new Response(JSON.stringify({ error: "Failed to record event" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Trigger push notifications to other group members (fire and forget)
    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: members } = await serviceClient
      .from("group_members")
      .select("user_id, profiles(push_token, display_name)")
      .eq("group_id", lock.group_id)
      .neq("user_id", user.id);

    if (members) {
      const { data: actorProfile } = await serviceClient
        .from("profiles")
        .select("display_name")
        .eq("id", user.id)
        .single();

      const actorName = actorProfile?.display_name || "Someone";
      const actionHe = action === "lock" ? "נעל/ה" : "פתח/ה";

      const pushTokens = members
        .map((m: any) => m.profiles?.push_token)
        .filter(Boolean);

      if (pushTokens.length > 0) {
        // Send via Expo push API
        await fetch("https://exp.host/--/api/v2/push/send", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(
            pushTokens.map((token: string) => ({
              to: token,
              title: lock.name,
              body: `${actorName} ${actionHe} את ${lock.name}`,
              data: { lock_id, action, event_id: event.id },
              sound: "default",
            }))
          ),
        }).catch(() => {});
      }
    }

    return new Response(
      JSON.stringify({
        event_id: event.id,
        lock_id,
        status: action,
        recorded_at: event.created_at,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
