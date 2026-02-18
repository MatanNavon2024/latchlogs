import { View, Text } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { timeAgo } from "../lib/timeAgo";
import type { EventWithDetails } from "../types/database";

interface EventItemProps {
  event: EventWithDetails;
}

export function EventItem({ event }: EventItemProps) {
  const { t } = useTranslation();
  const isLock = event.action === "lock";

  const sourceIcons: Record<string, string> = {
    nfc: "cellphone-nfc",
    qr: "qrcode",
    manual: "gesture-tap",
    app_clip: "cellphone",
  };

  return (
    <View className="flex-row-reverse items-center py-3 border-b border-slate-800">
      <View
        className={`w-10 h-10 rounded-full items-center justify-center ${
          isLock ? "bg-locked/20" : "bg-unlocked/20"
        }`}
      >
        <MaterialCommunityIcons
          name={isLock ? "lock" : "lock-open"}
          size={18}
          color={isLock ? "#22C55E" : "#EF4444"}
        />
      </View>

      <View className="flex-1 mr-3">
        <View className="flex-row-reverse items-center gap-1">
          <Text className="text-white font-bold text-right">
            {event.user?.display_name || "—"}
          </Text>
          <Text className="text-slate-400 text-right">
            {isLock ? t("history.locked") : t("history.unlocked")}
          </Text>
          <Text className="text-white font-bold text-right">
            {event.lock?.name || "—"}
          </Text>
        </View>
        <View className="flex-row-reverse items-center gap-2 mt-1">
          <Text className="text-slate-500 text-xs">
            {timeAgo(event.created_at)}
          </Text>
          <MaterialCommunityIcons
            name={(sourceIcons[event.source] || "gesture-tap") as any}
            size={12}
            color="#64748B"
          />
          <Text className="text-slate-500 text-xs">
            {t(`source.${event.source}`)}
          </Text>
        </View>
      </View>
    </View>
  );
}
