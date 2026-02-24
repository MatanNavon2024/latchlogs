import { useState, useEffect, useCallback, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Animated,
  PanResponder,
  Dimensions,
  ActivityIndicator,
  I18nManager,
} from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { supabase } from "../../src/lib/supabase";
import { recordEvent } from "../../src/hooks/useEvents";
import { timeAgo } from "../../src/lib/timeAgo";
import type { LockWithStatus } from "../../src/types/database";

const SCREEN_WIDTH = Dimensions.get("window").width;
const TRACK_PADDING = 24;
const TRACK_WIDTH = SCREEN_WIDTH - TRACK_PADDING * 2;
const THUMB_SIZE = 64;
const SLIDE_THRESHOLD = TRACK_WIDTH - THUMB_SIZE - 16;

export default function ClipQuickAction() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();

  const [lock, setLock] = useState<LockWithStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(false);

  const translateX = useRef(new Animated.Value(0)).current;
  const slideComplete = useRef(false);
  const handleToggleRef = useRef<() => void>(() => {});

  const fetchLock = useCallback(async () => {
    if (!id) return;
    const { data } = await supabase
      .from("locks")
      .select("*, lock_current_status(*)")
      .eq("id", id)
      .single();

    if (data) {
      setLock({
        ...data,
        lock_current_status: Array.isArray(data.lock_current_status)
          ? data.lock_current_status[0] ?? null
          : data.lock_current_status ?? null,
      } as LockWithStatus);
    }
    setLoading(false);
  }, [id]);

  useEffect(() => {
    fetchLock();
  }, [fetchLock]);

  const isLocked = lock?.lock_current_status?.status === "lock";

  const handleToggle = useCallback(async () => {
    if (!id || toggling) return;
    setToggling(true);
    const newAction = isLocked ? "unlock" : "lock";
    try {
      await recordEvent(id, newAction, "nfc");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      await fetchLock();
    } catch {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
    translateX.setValue(0);
    slideComplete.current = false;
    setToggling(false);
  }, [id, isLocked, toggling, fetchLock, translateX]);

  useEffect(() => {
    handleToggleRef.current = handleToggle;
  }, [handleToggle]);

  const isRTL = I18nManager.isRTL;
  const dir = isRTL ? -1 : 1;

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      },
      onPanResponderMove: (_, gestureState) => {
        const raw = gestureState.dx * dir;
        const clamped = Math.max(0, Math.min(raw, SLIDE_THRESHOLD));
        translateX.setValue(clamped * dir);

        if (clamped >= SLIDE_THRESHOLD * 0.9 && !slideComplete.current) {
          slideComplete.current = true;
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        const raw = gestureState.dx * dir;
        if (raw >= SLIDE_THRESHOLD * 0.85) {
          Animated.spring(translateX, {
            toValue: SLIDE_THRESHOLD * dir,
            useNativeDriver: true,
            speed: 20,
          }).start(() => {
            handleToggleRef.current();
          });
        } else {
          slideComplete.current = false;
          Animated.spring(translateX, {
            toValue: 0,
            useNativeDriver: true,
            speed: 20,
          }).start();
        }
      },
    })
  ).current;

  const statusColor = isLocked ? "#22C55E" : "#EF4444";
  const statusText = isLocked ? "נעול" : "פתוח";
  const actionText = isLocked ? "החלק לפתיחה" : "החלק לנעילה";
  const slideColor = isLocked ? "#EF4444" : "#22C55E";

  const progressOpacity = translateX.interpolate({
    inputRange: isRTL ? [-SLIDE_THRESHOLD, 0] : [0, SLIDE_THRESHOLD],
    outputRange: isRTL ? [0, 1] : [1, 0],
    extrapolate: "clamp",
  });

  const progressWidth = translateX.interpolate({
    inputRange: isRTL ? [-SLIDE_THRESHOLD, 0] : [0, SLIDE_THRESHOLD],
    outputRange: isRTL ? [TRACK_WIDTH, 0] : [0, TRACK_WIDTH],
    extrapolate: "clamp",
  });

  if (loading) {
    return (
      <View className="flex-1 bg-slate-900 items-center justify-center">
        <ActivityIndicator size="large" color="#3B82F6" />
      </View>
    );
  }

  if (!lock) {
    return (
      <View className="flex-1 bg-slate-900 items-center justify-center">
        <MaterialCommunityIcons
          name="lock-question"
          size={64}
          color="#475569"
        />
        <Text className="text-slate-400 text-lg mt-4">מנעול לא נמצא</Text>
        <TouchableOpacity className="mt-6" onPress={() => router.back()}>
          <Text className="text-brand text-base">חזור</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View
      className="flex-1 bg-slate-900"
      style={{ paddingTop: insets.top, paddingBottom: insets.bottom }}
    >
      {/* Close button */}
      <View className="flex-row justify-end px-5 pt-3">
        <TouchableOpacity
          className="w-10 h-10 rounded-full bg-slate-800 items-center justify-center"
          onPress={() => {
            if (router.canGoBack()) {
              router.back();
            } else {
              router.replace("/");
            }
          }}
        >
          <MaterialCommunityIcons name="close" size={22} color="#94A3B8" />
        </TouchableOpacity>
      </View>

      {/* Content */}
      <View className="flex-1 items-center justify-center px-6">
        {/* Lock icon */}
        <View
          className="w-32 h-32 rounded-full items-center justify-center mb-6"
          style={{ backgroundColor: `${statusColor}20` }}
        >
          <MaterialCommunityIcons
            name={isLocked ? "lock" : "lock-open"}
            size={64}
            color={statusColor}
          />
        </View>

        {/* Lock name */}
        <Text className="text-white text-2xl font-bold mb-2">{lock.name}</Text>

        {/* Status */}
        <View
          className="px-5 py-2 rounded-full mb-3"
          style={{ backgroundColor: `${statusColor}20` }}
        >
          <Text className="text-lg font-bold" style={{ color: statusColor }}>
            {statusText}
          </Text>
        </View>

        {/* Last action time */}
        {lock.lock_current_status?.last_action_at && (
          <Text className="text-slate-500 text-sm">
            {timeAgo(lock.lock_current_status.last_action_at)}
          </Text>
        )}
      </View>

      {/* Slide to toggle */}
      <View style={{ paddingHorizontal: TRACK_PADDING, paddingBottom: 32 }}>
        <View
          className="rounded-full overflow-hidden"
          style={{
            height: THUMB_SIZE + 12,
            backgroundColor: "#1E293B",
            borderWidth: 1,
            borderColor: "#334155",
          }}
        >
          {/* Progress fill */}
          <Animated.View
            style={{
              position: "absolute",
              top: 0,
              bottom: 0,
              [isRTL ? "right" : "left"]: 0,
              width: progressWidth,
              borderRadius: 9999,
              backgroundColor: `${slideColor}15`,
            }}
          />

          {/* Label */}
          <Animated.View
            className="absolute inset-0 items-center justify-center"
            style={{ opacity: progressOpacity }}
          >
            <Text className="text-slate-400 text-base font-semibold tracking-wide">
              {toggling ? "מעדכן..." : actionText}
            </Text>
          </Animated.View>

          {/* Thumb */}
          <Animated.View
            {...panResponder.panHandlers}
            style={{
              position: "absolute",
              top: 6,
              start: 6,
              width: THUMB_SIZE,
              height: THUMB_SIZE,
              borderRadius: THUMB_SIZE / 2,
              backgroundColor: slideColor,
              alignItems: "center",
              justifyContent: "center",
              transform: [{ translateX }],
              shadowColor: slideColor,
              shadowOffset: { width: 0, height: 0 },
              shadowOpacity: 0.5,
              shadowRadius: 12,
              elevation: 8,
            }}
          >
            {toggling ? (
              <ActivityIndicator color="white" />
            ) : (
              <MaterialCommunityIcons
                name={isLocked ? "lock-open" : "lock"}
                size={28}
                color="white"
              />
            )}
          </Animated.View>
        </View>

        {/* NFC hint */}
        <View className="flex-row items-center justify-center mt-4 gap-2">
          <MaterialCommunityIcons
            name="cellphone-nfc"
            size={16}
            color="#475569"
          />
          <Text className="text-slate-600 text-xs">פעולה מהירה NFC</Text>
        </View>
      </View>
    </View>
  );
}
