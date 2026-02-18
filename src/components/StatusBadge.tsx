import { View, Text } from "react-native";
import { useTranslation } from "react-i18next";
import type { LockAction } from "../types/database";

interface StatusBadgeProps {
  status: LockAction | null;
  size?: "sm" | "md";
}

export function StatusBadge({ status, size = "md" }: StatusBadgeProps) {
  const { t } = useTranslation();
  const isLocked = status === "lock";

  const sizeStyles = {
    sm: "px-2 py-0.5",
    md: "px-3 py-1",
  };

  const textSize = {
    sm: "text-xs",
    md: "text-sm",
  };

  return (
    <View
      className={`rounded-full ${sizeStyles[size]} ${
        isLocked ? "bg-locked/20" : status ? "bg-unlocked/20" : "bg-slate-700"
      }`}
    >
      <Text
        className={`font-bold ${textSize[size]} ${
          isLocked
            ? "text-locked"
            : status
            ? "text-unlocked"
            : "text-slate-400"
        }`}
      >
        {isLocked
          ? `🔒 ${t("home.locked")}`
          : status
          ? `🔓 ${t("home.unlocked")}`
          : "—"}
      </Text>
    </View>
  );
}
