import { useState, useCallback, useRef, useEffect } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Dimensions,
  RefreshControl,
  ScrollView,
  ViewToken,
} from "react-native";
import { router } from "expo-router";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Toast } from "../../src/components/ui/Toast";
import { useLocks } from "../../src/hooks/useLocks";
import { useEvents, recordEvent } from "../../src/hooks/useEvents";
import { useAuthStore } from "../../src/stores/authStore";
import { timeAgo } from "../../src/lib/timeAgo";
import type { LockWithStatus, EventWithDetails } from "../../src/types/database";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const CARD_PADDING = 24;

export default function HomeScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { locks, loading, refetch } = useLocks();
  const activeGroupId = useAuthStore((s) => s.activeGroupId);
  const groups = useAuthStore((s) => s.groups);
  const activeGroup = groups.find((g) => g.id === activeGroupId);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [toast, setToast] = useState({ visible: false, message: "" });
  const flatListRef = useRef<FlatList>(null);

  const currentLock = locks[currentIndex] ?? null;

  const { events, refresh: refreshEvents } = useEvents({
    lockId: currentLock?.id,
  });

  useEffect(() => {
    if (currentLock?.id) refreshEvents();
  }, [currentLock?.id]);

  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      if (viewableItems.length > 0 && viewableItems[0].index != null) {
        setCurrentIndex(viewableItems[0].index);
      }
    }
  ).current;

  const viewabilityConfig = useRef({ viewAreaCoveragePercentThreshold: 50 }).current;

  const handleToggle = useCallback(
    async (lock: LockWithStatus) => {
      const isLocked = lock.lock_current_status?.status === "lock";
      const newAction = isLocked ? "unlock" : "lock";

      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        await recordEvent(lock.id, newAction, "manual");
        setToast({
          visible: true,
          message: t("lock.recorded"),
        });
        refreshEvents();
      } catch {
        setToast({ visible: true, message: t("common.error") });
      }
    },
    [t, refreshEvents]
  );

  const handleRefresh = useCallback(async () => {
    await refetch();
    refreshEvents();
  }, [refetch, refreshEvents]);

  const renderLockCard = useCallback(
    ({ item }: { item: LockWithStatus }) => {
      const status = item.lock_current_status;
      const isLocked = status?.status === "lock";
      const hasStatus = status !== null && status !== undefined;
      const bgColor = isLocked ? "bg-locked" : hasStatus ? "bg-unlocked" : "bg-slate-700";
      const buttonBg = "bg-brand";
      const buttonText = isLocked ? t("lock.markUnlocked") : t("lock.markLocked");
      const buttonIcon = isLocked ? "lock-open" : "lock";

      return (
        <View style={{ width: SCREEN_WIDTH, paddingHorizontal: CARD_PADDING }}>
          <TouchableOpacity
            activeOpacity={0.95}
            onPress={() => router.push(`/lock/${item.id}`)}
          >
            <View className={`${bgColor} rounded-3xl px-6 py-8 items-center`}>
              {/* Lock icon */}
              <View className="w-20 h-20 rounded-full bg-white/20 items-center justify-center mb-4">
                <MaterialCommunityIcons
                  name={isLocked ? "lock" : hasStatus ? "lock-open" : "lock-question"}
                  size={40}
                  color="white"
                />
              </View>

              {/* Lock name & status */}
              <Text className="text-white/70 text-base mb-1">{item.name}</Text>
              <Text className="text-white text-2xl font-bold mb-1">
                {isLocked
                  ? `🔒 ${t("home.locked")}`
                  : hasStatus
                  ? `🔓 ${t("home.unlocked")}`
                  : "—"}
              </Text>

              {status && (
                <Text className="text-white/60 text-sm mt-1">
                  {timeAgo(status.last_action_at)}
                </Text>
              )}

              {/* Toggle button */}
              <TouchableOpacity
                className={`${buttonBg} mt-6 w-full py-4 rounded-2xl items-center`}
                onPress={() => handleToggle(item)}
                activeOpacity={0.8}
              >
                <View className="flex-row items-center gap-2">
                  <MaterialCommunityIcons
                    name={buttonIcon}
                    size={22}
                    color="white"
                  />
                  <Text className="text-white text-lg font-bold">
                    {buttonText}
                  </Text>
                </View>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </View>
      );
    },
    [handleToggle, t]
  );

  // Empty state
  if (!loading && locks.length === 0) {
    return (
      <View
        className="flex-1 bg-slate-900 items-center justify-center px-8"
        style={{ paddingTop: insets.top }}
      >
        <MaterialCommunityIcons name="lock-off" size={72} color="#475569" />
        <Text className="text-slate-400 text-lg mt-4 text-center">
          {t("home.empty")}
        </Text>
        {activeGroupId && (
          <TouchableOpacity
            className="mt-6 bg-brand px-8 py-4 rounded-2xl"
            onPress={() => router.push("/lock/create")}
          >
            <Text className="text-white font-bold text-lg">
              {t("home.addLock")}
            </Text>
          </TouchableOpacity>
        )}
        {!activeGroupId && (
          <TouchableOpacity
            className="mt-6 bg-brand px-8 py-4 rounded-2xl"
            onPress={() => router.push("/group/join")}
          >
            <Text className="text-white font-bold text-lg">
              {t("group.join")}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }

  return (
    <View className="flex-1 bg-slate-900" style={{ paddingTop: insets.top }}>
      <ScrollView
        refreshControl={
          <RefreshControl
            refreshing={loading}
            onRefresh={handleRefresh}
            tintColor="#3B82F6"
          />
        }
      >
        {/* Header */}
        <View className="px-6 pt-4 pb-2 flex-row items-center justify-between">
          <View>
            <Text className="text-white text-2xl font-bold text-right">
              {t("home.title")}
            </Text>
            {activeGroup && (
              <Text className="text-slate-400 text-sm text-right">
                {activeGroup.name}
              </Text>
            )}
          </View>
          <View className="flex-row gap-3">
            <TouchableOpacity
              onPress={() => router.push("/scan")}
              className="bg-slate-800 w-10 h-10 rounded-full items-center justify-center"
            >
              <MaterialCommunityIcons
                name="qrcode-scan"
                size={20}
                color="#94A3B8"
              />
            </TouchableOpacity>
            {activeGroupId && (
              <TouchableOpacity
                onPress={() => router.push("/lock/create")}
                className="bg-brand w-10 h-10 rounded-full items-center justify-center"
              >
                <MaterialCommunityIcons name="plus" size={22} color="white" />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Lock Pager */}
        <FlatList
          ref={flatListRef}
          data={locks}
          keyExtractor={(item) => item.id}
          renderItem={renderLockCard}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onViewableItemsChanged={onViewableItemsChanged}
          viewabilityConfig={viewabilityConfig}
          scrollEnabled={locks.length > 1}
          contentContainerStyle={{ paddingVertical: 16 }}
        />

        {/* Page dots */}
        {locks.length > 1 && (
          <View className="flex-row items-center justify-center gap-2 pb-4">
            {locks.map((lock, index) => (
              <View
                key={lock.id}
                className={`rounded-full ${
                  index === currentIndex
                    ? "w-6 h-2 bg-brand"
                    : "w-2 h-2 bg-slate-600"
                }`}
              />
            ))}
          </View>
        )}

        {/* Recent Activity */}
        <View className="px-6 pt-2 pb-4">
          <View className="flex-row items-center justify-between mb-3">
            <Text className="text-white text-lg font-bold">
              {t("history.title")}
            </Text>
            <TouchableOpacity
              onPress={() => router.push("/(tabs)/history")}
              className="flex-row items-center gap-1"
            >
              <Text className="text-brand text-sm font-bold">
                {t("history.allLocks")}
              </Text>
              <MaterialCommunityIcons
                name="chevron-left"
                size={18}
                color="#3B82F6"
              />
            </TouchableOpacity>
          </View>

          {events.length === 0 && !loading ? (
            <View className="bg-slate-800/50 rounded-2xl py-8 items-center">
              <MaterialCommunityIcons
                name="history"
                size={32}
                color="#475569"
              />
              <Text className="text-slate-500 text-sm mt-2">
                {t("history.empty")}
              </Text>
            </View>
          ) : (
            <View className="bg-slate-800/50 rounded-2xl overflow-hidden">
              {events.slice(0, 5).map((event, index) => (
                <ActivityRow
                  key={event.id}
                  event={event}
                  isLast={index === Math.min(events.length, 5) - 1}
                />
              ))}
            </View>
          )}
        </View>

        {/* Bottom spacer for tab bar */}
        <View style={{ height: 100 }} />
      </ScrollView>

      <Toast
        message={toast.message}
        visible={toast.visible}
        onHide={() => setToast({ visible: false, message: "" })}
      />
    </View>
  );
}

function ActivityRow({
  event,
  isLast,
}: {
  event: EventWithDetails;
  isLast: boolean;
}) {
  const { t } = useTranslation();
  const isLock = event.action === "lock";

  return (
    <View
      className={`flex-row items-center px-4 py-3 ${
        !isLast ? "border-b border-slate-700/50" : ""
      }`}
    >
      <View
        className={`w-8 h-8 rounded-full items-center justify-center ${
          isLock ? "bg-locked/20" : "bg-unlocked/20"
        }`}
      >
        <MaterialCommunityIcons
          name={isLock ? "lock" : "lock-open"}
          size={16}
          color={isLock ? "#22C55E" : "#EF4444"}
        />
      </View>

      <View className="flex-1 mr-3">
        <View className="flex-row items-center gap-1">
          <Text className="text-white font-bold text-sm">
            {event.user?.display_name || "—"}
          </Text>
          <Text className="text-slate-400 text-sm">
            {isLock ? t("history.locked") : t("history.unlocked")}
          </Text>
        </View>
      </View>

      <Text className="text-slate-500 text-xs">
        {timeAgo(event.created_at)}
      </Text>
    </View>
  );
}
