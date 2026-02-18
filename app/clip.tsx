import { useState, useEffect } from "react";
import { View, Text, TouchableOpacity, ActivityIndicator } from "react-native";
import { useLocalSearchParams } from "expo-router";
import * as Haptics from "expo-haptics";
import { supabase } from "../src/lib/supabase";
import { recordEvent } from "../src/hooks/useEvents";
import type { LockWithStatus } from "../src/types/database";

export default function ClipScreen() {
  const { lockId } = useLocalSearchParams<{ lockId: string }>();
  const [lock, setLock] = useState<LockWithStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [recording, setRecording] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!lockId) return;

    supabase
      .from("locks")
      .select("*, lock_current_status(*)")
      .eq("id", lockId)
      .single()
      .then(({ data }) => {
        if (data) {
          setLock({
            ...data,
            lock_current_status: Array.isArray(data.lock_current_status)
              ? data.lock_current_status[0] ?? null
              : data.lock_current_status ?? null,
          } as LockWithStatus);
        }
        setLoading(false);
      });
  }, [lockId]);

  const handleAction = async (action: "lock" | "unlock") => {
    if (!lockId) return;
    setRecording(true);
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      await recordEvent(lockId, action, "app_clip");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setDone(true);
    } catch {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
    setRecording(false);
  };

  if (loading) {
    return (
      <View className="flex-1 bg-slate-900 items-center justify-center">
        <ActivityIndicator size="large" color="#3B82F6" />
      </View>
    );
  }

  if (done) {
    return (
      <View className="flex-1 bg-slate-900 items-center justify-center px-8">
        <Text className="text-6xl mb-4">✓</Text>
        <Text className="text-white text-2xl font-bold mb-2">תועד!</Text>
        <Text className="text-slate-400 text-base">
          אפשר לסגור את המסך
        </Text>
      </View>
    );
  }

  const status = lock?.lock_current_status;
  const isLocked = status?.status === "lock";

  return (
    <View className="flex-1 bg-slate-900 items-center justify-center px-8">
      {/* Lock name */}
      <Text className="text-slate-400 text-base mb-2">LatchLog</Text>
      <Text className="text-white text-3xl font-bold mb-4">
        {lock?.name || "—"}
      </Text>

      {/* Current status */}
      <View
        className={`px-5 py-2 rounded-full mb-10 ${
          isLocked ? "bg-locked/20" : status ? "bg-unlocked/20" : "bg-slate-700"
        }`}
      >
        <Text
          className={`text-lg font-bold ${
            isLocked
              ? "text-locked"
              : status
              ? "text-unlocked"
              : "text-slate-400"
          }`}
        >
          {isLocked ? "🔒 נעול" : status ? "🔓 פתוח" : "—"}
        </Text>
      </View>

      {/* Action buttons — big and easy to tap */}
      <View className="w-full gap-4">
        <TouchableOpacity
          className="w-full py-6 rounded-2xl items-center bg-locked"
          onPress={() => handleAction("lock")}
          disabled={recording}
          activeOpacity={0.7}
        >
          {recording ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text className="text-white text-2xl font-bold">🔒 נעילה</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          className="w-full py-6 rounded-2xl items-center bg-unlocked"
          onPress={() => handleAction("unlock")}
          disabled={recording}
          activeOpacity={0.7}
        >
          {recording ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text className="text-white text-2xl font-bold">🔓 פתיחה</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}
