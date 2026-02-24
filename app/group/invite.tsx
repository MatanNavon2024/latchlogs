import { View, Text, TouchableOpacity, Share } from "react-native";
import { router } from "expo-router";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import * as Haptics from "expo-haptics";
import { useState } from "react";
import { Card } from "../../src/components/ui/Card";
import { Button } from "../../src/components/ui/Button";
import { Toast } from "../../src/components/ui/Toast";
import { useAuthStore } from "../../src/stores/authStore";

export default function InviteScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const groups = useAuthStore((s) => s.groups);
  const activeGroupId = useAuthStore((s) => s.activeGroupId);
  const group = groups.find((g) => g.id === activeGroupId);

  const [toast, setToast] = useState({ visible: false, message: "" });

  const inviteCode = group?.invite_code ?? "";

  const handleCopy = async () => {
    await Clipboard.setStringAsync(inviteCode);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setToast({ visible: true, message: t("group.copied") });
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: `הצטרף/י לקבוצת "${group?.name}" ב-LatchLog!\nקוד הזמנה: ${inviteCode}`,
      });
    } catch {}
  };

  return (
    <View className="flex-1 bg-slate-900" style={{ paddingTop: insets.top }}>
      {/* Header */}
      <View className="px-5 py-4 flex-row items-center justify-between">
        <TouchableOpacity onPress={() => router.back()}>
          <MaterialCommunityIcons
            name="arrow-right"
            size={28}
            color="white"
          />
        </TouchableOpacity>
        <Text className="text-white text-xl font-bold">
          {t("group.invite")}
        </Text>
        <View className="w-7" />
      </View>

      <View className="flex-1 px-6 items-center justify-center">
        <Card variant="elevated" className="w-full items-center py-8">
          <MaterialCommunityIcons
            name="account-plus"
            size={48}
            color="#3B82F6"
          />
          <Text className="text-white text-lg font-bold mt-4 mb-2">
            {t("group.inviteCode")}
          </Text>
          <Text className="text-slate-300 text-sm mb-4 text-center">
            {group?.name}
          </Text>

          <TouchableOpacity
            className="bg-slate-700 px-8 py-4 rounded-2xl mb-6"
            onPress={handleCopy}
            activeOpacity={0.7}
          >
            <Text className="text-white text-3xl font-mono font-bold tracking-[8px]">
              {inviteCode}
            </Text>
          </TouchableOpacity>

          <View className="flex-row gap-3 w-full">
            <View className="flex-1">
              <Button
                title="העתק"
                variant="secondary"
                onPress={handleCopy}
              />
            </View>
            <View className="flex-1">
              <Button
                title="שתף"
                onPress={handleShare}
              />
            </View>
          </View>
        </Card>
      </View>

      <Toast
        message={toast.message}
        visible={toast.visible}
        onHide={() => setToast({ visible: false, message: "" })}
      />
    </View>
  );
}
