import { View, Text, TouchableOpacity } from "react-native";
import { router } from "expo-router";
import { useTranslation } from "react-i18next";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Card } from "./ui/Card";
import { StatusBadge } from "./StatusBadge";
import { timeAgo } from "../lib/timeAgo";
import type { LockWithStatus } from "../types/database";

interface LockCardProps {
  lock: LockWithStatus;
  onLock: () => void;
  onUnlock: () => void;
}

export function LockCard({ lock, onLock, onUnlock }: LockCardProps) {
  const { t } = useTranslation();
  const status = lock.lock_current_status;
  const isLocked = status?.status === "lock";

  return (
    <Card variant="elevated" className="mb-3">
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={() => router.push(`/lock/${lock.id}`)}
      >
        <View className="flex-row items-center justify-between mb-3">
          <View className="flex-row items-center gap-2 flex-1">
            <View
              className={`w-10 h-10 rounded-full items-center justify-center ${
                isLocked ? "bg-locked/20" : status ? "bg-unlocked/20" : "bg-slate-700"
              }`}
            >
              <MaterialCommunityIcons
                name={isLocked ? "lock" : "lock-open"}
                size={20}
                color={isLocked ? "#22C55E" : status ? "#EF4444" : "#94A3B8"}
              />
            </View>
            <View className="flex-1">
              <Text className="text-white text-lg font-bold text-right">
                {lock.name}
              </Text>
              {status && (
                <Text className="text-slate-400 text-xs text-right">
                  {timeAgo(status.last_action_at)}
                </Text>
              )}
            </View>
          </View>
          <StatusBadge status={status?.status ?? null} />
        </View>
      </TouchableOpacity>

      <View className="flex-row gap-2">
        <TouchableOpacity
          className={`flex-1 py-3 rounded-xl items-center ${
            isLocked ? "bg-locked/10 border border-locked/30" : "bg-locked"
          }`}
          onPress={onLock}
          activeOpacity={0.7}
        >
          <Text
            className={`font-bold ${
              isLocked ? "text-locked" : "text-white"
            }`}
          >
            🔒 {t("lock.markLocked")}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          className={`flex-1 py-3 rounded-xl items-center ${
            !isLocked && status ? "bg-unlocked/10 border border-unlocked/30" : "bg-unlocked"
          }`}
          onPress={onUnlock}
          activeOpacity={0.7}
        >
          <Text
            className={`font-bold ${
              !isLocked && status ? "text-unlocked" : "text-white"
            }`}
          >
            🔓 {t("lock.markUnlocked")}
          </Text>
        </TouchableOpacity>
      </View>
    </Card>
  );
}
