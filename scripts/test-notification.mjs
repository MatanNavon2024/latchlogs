#!/usr/bin/env node

/**
 * Test script: records a lock/unlock event for "דודן" and sends
 * a push notification TO the acting user (so you can see it yourself).
 *
 * Usage:
 *   node scripts/test-notification.mjs <email> <password> [lock|unlock]
 */

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://iwmxqnbqlktrwxtuzwjq.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml3bXhxbmJxbGt0cnd4dHV6d2pxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE0MzcwMjksImV4cCI6MjA4NzAxMzAyOX0.kPjO5aPJp2d2QQiSfjWLK4h0uKPT3JIt_y9spV1WbNM";

const LOCK_NAME = "דלת הזזה";

const [email, password, actionArg] = process.argv.slice(2);
const action = actionArg === "unlock" ? "unlock" : "lock";

if (!email || !password) {
  console.error("Usage: node scripts/test-notification.mjs <email> <password> [lock|unlock]");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function main() {
  // 1. Sign in
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (authError) {
    console.error("❌ Login failed:", authError.message);
    process.exit(1);
  }
  const user = authData.user;
  console.log(`✅ Logged in as ${user.email} (${user.id})`);

  // 2. Find the lock
  const { data: allLocks, error: listErr } = await supabase
    .from("locks")
    .select("id, name, group_id");

  if (listErr) {
    console.error("❌ Failed to fetch locks:", listErr.message);
    process.exit(1);
  }

  if (!allLocks?.length) {
    console.error("❌ No locks found for this user.");
    process.exit(1);
  }

  const lock = allLocks.find((l) => l.name.includes(LOCK_NAME));
  if (!lock) {
    console.log("📋 Available locks:");
    allLocks.forEach((l) => console.log(`   - "${l.name}" (${l.id})`));
    console.error(`\n❌ Lock "${LOCK_NAME}" not found. Update LOCK_NAME in the script.`);
    process.exit(1);
  }
  console.log(`🔒 Found lock: "${lock.name}" (${lock.id})`);

  // 3. Record the event
  const { data: event, error: eventErr } = await supabase
    .from("events")
    .insert({
      lock_id: lock.id,
      user_id: user.id,
      action,
      source: "manual",
    })
    .select("id, created_at")
    .single();

  if (eventErr) {
    console.error("❌ Failed to record event:", eventErr.message);
    process.exit(1);
  }
  console.log(`📝 Event recorded: ${action} at ${event.created_at}`);

  // 4. Get user's own push token
  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, push_token")
    .eq("id", user.id)
    .single();

  if (!profile?.push_token) {
    console.error("❌ No push token found. Enable notifications in the app first.");
    process.exit(1);
  }

  const actorName = profile.display_name || "Test";
  const actionHe = action === "lock" ? "נעל/ה" : "פתח/ה";

  // 5. Send push notification TO yourself
  const message = {
    to: profile.push_token,
    sound: "default",
    title: `🔔 ${lock.name}`,
    body: `${actorName} ${actionHe} את ${lock.name}`,
    data: { lockId: lock.id, action },
  };

  console.log(`📲 Sending push to token: ${profile.push_token.slice(0, 30)}...`);

  const res = await fetch("https://exp.host/--/api/v2/push/send", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(message),
  });

  const result = await res.json();
  if (result.data?.status === "ok") {
    console.log("✅ Push notification sent! Check your phone.");
  } else {
    console.log("⚠️  Push response:", JSON.stringify(result, null, 2));
  }
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
