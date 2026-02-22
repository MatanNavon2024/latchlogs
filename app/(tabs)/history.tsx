import { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  RefreshControl,
} from "react-native";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { EventItem } from "../../src/components/EventItem";
import { useEvents } from "../../src/hooks/useEvents";
import { useLocks } from "../../src/hooks/useLocks";
import { useAuthStore } from "../../src/stores/authStore";
import type { EventWithDetails, Lock } from "../../src/types/database";

export default function HistoryScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const activeGroupId = useAuthStore((s) => s.activeGroupId);
  const [filterLockId, setFilterLockId] = useState<string | undefined>();

  const { events, loading, hasMore, loadMore, refresh } = useEvents({
    lockId: filterLockId,
    groupId: activeGroupId ?? undefined,
  });
  const { locks } = useLocks();

  useEffect(() => {
    refresh();
  }, [filterLockId]);

  const renderItem = useCallback(
    ({ item }: { item: EventWithDetails }) => <EventItem event={item} />,
    []
  );

  return (
    <View className="flex-1 bg-slate-900" style={{ paddingTop: insets.top }}>
      {/* Header */}
      <View className="px-5 py-4">
        <Text className="text-white text-2xl font-bold text-right">
          {t("history.title")}
        </Text>
      </View>

      {/* Filter chips */}
      <View className="px-4 pb-2">
        <FlatList
          horizontal
          inverted
          showsHorizontalScrollIndicator={false}
          data={[{ id: undefined, name: t("history.allLocks") }, ...locks]}
          keyExtractor={(item) => item.id ?? "all"}
          renderItem={({ item }) => (
            <TouchableOpacity
              className={`px-4 py-2 rounded-full mr-2 ${
                filterLockId === item.id
                  ? "bg-brand"
                  : "bg-slate-800 border border-slate-700"
              }`}
              onPress={() =>
                setFilterLockId(
                  item.id === filterLockId ? undefined : item.id
                )
              }
            >
              <Text
                className={`text-sm font-bold ${
                  filterLockId === item.id ? "text-white" : "text-slate-300"
                }`}
              >
                {item.name}
              </Text>
            </TouchableOpacity>
          )}
        />
      </View>

      {/* Events list */}
      <FlatList
        data={events}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 100 }}
        refreshControl={
          <RefreshControl
            refreshing={loading}
            onRefresh={refresh}
            tintColor="#3B82F6"
          />
        }
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        ListEmptyComponent={
          !loading ? (
            <View className="items-center justify-center py-20">
              <MaterialCommunityIcons
                name="history"
                size={64}
                color="#475569"
              />
              <Text className="text-slate-400 text-lg mt-4">
                {t("history.empty")}
              </Text>
            </View>
          ) : null
        }
        ListFooterComponent={
          hasMore && events.length > 0 ? (
            <View className="py-4 items-center">
              <Text className="text-slate-500 text-sm">
                {t("common.loading")}
              </Text>
            </View>
          ) : null
        }
      />
    </View>
  );
}
