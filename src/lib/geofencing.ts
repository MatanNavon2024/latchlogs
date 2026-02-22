import * as Location from "expo-location";
import * as TaskManager from "expo-task-manager";
import * as Notifications from "expo-notifications";
import { supabase } from "./supabase";
import { recordEvent } from "../hooks/useEvents";
import type { Lock } from "../types/database";

const GEOFENCE_TASK = "LATCHLOG_GEOFENCE_TASK";

TaskManager.defineTask(GEOFENCE_TASK, async ({ data, error }) => {
  if (error) {
    console.warn("Geofence task error:", error.message);
    return;
  }

  const { eventType, region } = data as {
    eventType: Location.GeofencingEventType;
    region: Location.LocationRegion;
  };

  if (eventType !== Location.GeofencingEventType.Exit) return;

  const lockId = region.identifier;

  try {
    const { data: statusData } = await supabase
      .from("lock_current_status")
      .select("status, lock_id")
      .eq("lock_id", lockId)
      .single();

    if (!statusData || statusData.status === "lock") return;

    const { data: lock } = await supabase
      .from("locks")
      .select("name")
      .eq("id", lockId)
      .single();

    const lockName = lock?.name ?? "המנעול";

    await Notifications.scheduleNotificationAsync({
      content: {
        title: "שכחת לנעול? 🔓",
        body: `נראה שעזבת את האזור ו${lockName} עדיין פתוח`,
        data: { lockId, action: "lock_reminder" },
        categoryIdentifier: "LOCK_REMINDER",
        sound: "default",
      },
      trigger: null,
    });
  } catch (err) {
    console.warn("Geofence handler error:", err);
  }
});

export async function requestLocationPermissions(): Promise<boolean> {
  const { status: foreground } =
    await Location.requestForegroundPermissionsAsync();
  if (foreground !== "granted") return false;

  const { status: background } =
    await Location.requestBackgroundPermissionsAsync();
  return background === "granted";
}

export async function registerLockGeofences(locks: Lock[]): Promise<void> {
  const hasPermission = await Location.getBackgroundPermissionsAsync();
  if (hasPermission.status !== "granted") return;

  const regions: Location.LocationRegion[] = locks
    .filter((l) => l.latitude != null && l.longitude != null)
    .map((l) => ({
      identifier: l.id,
      latitude: l.latitude!,
      longitude: l.longitude!,
      radius: l.geofence_radius ?? 100,
      notifyOnEnter: false,
      notifyOnExit: true,
    }));

  if (regions.length === 0) {
    await unregisterGeofences();
    return;
  }

  await Location.startGeofencingAsync(GEOFENCE_TASK, regions);
}

export async function unregisterGeofences(): Promise<void> {
  const isRegistered = await TaskManager.isTaskRegisteredAsync(GEOFENCE_TASK);
  if (isRegistered) {
    await Location.stopGeofencingAsync(GEOFENCE_TASK);
  }
}

export async function setupLockReminderCategory(): Promise<void> {
  await Notifications.setNotificationCategoryAsync("LOCK_REMINDER", [
    {
      identifier: "MARK_LOCKED",
      buttonTitle: "סמן כנעול 🔒",
      options: { opensAppToForeground: false },
    },
    {
      identifier: "DISMISS",
      buttonTitle: "התעלם",
      options: { opensAppToForeground: false, isDestructive: true },
    },
  ]);
}

export function addLockReminderResponseListener() {
  return Notifications.addNotificationResponseReceivedListener(
    async (response) => {
      const { actionIdentifier, notification } = response;
      const data = notification.request.content.data as {
        lockId?: string;
        action?: string;
      };

      if (data?.action !== "lock_reminder") return;
      if (actionIdentifier !== "MARK_LOCKED") return;
      if (!data.lockId) return;

      try {
        await recordEvent(data.lockId, "lock", "geofence");
      } catch (err) {
        console.warn("Failed to record geofence lock event:", err);
      }
    }
  );
}
