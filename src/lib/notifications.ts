import * as Notifications from "expo-notifications";
import Constants from "expo-constants";
import { Platform } from "react-native";
import { supabase } from "./supabase";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export async function registerForPushNotifications(): Promise<string | null> {
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== "granted") {
    return null;
  }

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "default",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
    });
  }

  const projectId = Constants.expoConfig?.extra?.eas?.projectId;
  const tokenData = await Notifications.getExpoPushTokenAsync({
    projectId,
  });
  const token = tokenData.data;

  // Save token to profile
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    await supabase
      .from("profiles")
      .update({ push_token: token })
      .eq("id", user.id);
  }

  return token;
}

export async function sendPushToGroupMembers(
  lockId: string,
  action: "lock" | "unlock",
  actorUserId: string
) {
  const { data: lock } = await supabase
    .from("locks")
    .select("name, group_id")
    .eq("id", lockId)
    .single();

  if (!lock) return;

  const { data: actorProfile } = await supabase
    .from("profiles")
    .select("display_name")
    .eq("id", actorUserId)
    .single();

  const actorName = actorProfile?.display_name || "משתמש";
  const actionText = action === "lock" ? "נעל" : "פתח";

  const { data: members } = await supabase
    .from("group_members")
    .select("user_id")
    .eq("group_id", lock.group_id)
    .neq("user_id", actorUserId);

  if (!members || members.length === 0) return;

  const userIds = members.map((m: any) => m.user_id);
  const { data: profiles } = await supabase
    .from("profiles")
    .select("push_token")
    .in("id", userIds)
    .not("push_token", "is", null);

  const tokens = (profiles ?? [])
    .map((p: any) => p.push_token)
    .filter(Boolean);

  if (tokens.length === 0) return;

  const messages = tokens.map((token: string) => ({
    to: token,
    sound: "default",
    title: lock.name,
    body: `${actorName} ${actionText} את ${lock.name}`,
    data: { lockId, action },
  }));

  await fetch("https://exp.host/--/api/v2/push/send", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(messages),
  });
}

export function addNotificationReceivedListener(
  callback: (notification: Notifications.Notification) => void
) {
  return Notifications.addNotificationReceivedListener(callback);
}

export function addNotificationResponseListener(
  callback: (response: Notifications.NotificationResponse) => void
) {
  return Notifications.addNotificationResponseReceivedListener(callback);
}
