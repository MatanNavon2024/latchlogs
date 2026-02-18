import { useState, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Alert,
} from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Card } from "../../src/components/ui/Card";
import { Button } from "../../src/components/ui/Button";
import {
  useGroupMembers,
  updateMemberRole,
  removeMember,
} from "../../src/hooks/useGroup";
import { useAuthStore } from "../../src/stores/authStore";
import type { UserRole } from "../../src/types/database";

const roleColors: Record<UserRole, string> = {
  admin: "text-amber-400",
  member: "text-brand",
  guest: "text-slate-400",
};

export default function GroupDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const activeRole = useAuthStore((s) => s.activeRole);
  const userId = useAuthStore((s) => s.user?.id);
  const groups = useAuthStore((s) => s.groups);
  const group = groups.find((g) => g.id === id);
  const { members, loading, refetch } = useGroupMembers(id);

  const handleRoleChange = (memberId: string, currentRole: UserRole) => {
    if (activeRole !== "admin") return;

    const roles: UserRole[] = ["admin", "member", "guest"];
    Alert.alert(
      t("group.manage"),
      undefined,
      [
        ...roles.map((role) => ({
          text: `${t(`group.${role}`)}${role === currentRole ? " ✓" : ""}`,
          onPress: () => {
            updateMemberRole(memberId, role).then(refetch);
          },
        })),
        { text: t("common.cancel"), style: "cancel" as const },
      ]
    );
  };

  const handleRemove = (memberId: string, memberName: string) => {
    Alert.alert(
      `${t("common.delete")} ${memberName}?`,
      undefined,
      [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("common.delete"),
          style: "destructive",
          onPress: () => removeMember(memberId).then(refetch),
        },
      ]
    );
  };

  return (
    <View className="flex-1 bg-slate-900" style={{ paddingTop: insets.top }}>
      {/* Header */}
      <View className="px-5 py-4 flex-row-reverse items-center justify-between">
        <TouchableOpacity onPress={() => router.back()}>
          <MaterialCommunityIcons
            name="arrow-right"
            size={28}
            color="white"
          />
        </TouchableOpacity>
        <Text className="text-white text-xl font-bold">
          {group?.name || t("group.title")}
        </Text>
        <View className="w-7" />
      </View>

      {/* Invite section */}
      {group && (
        <Card className="mx-4 mb-4">
          <Text className="text-slate-300 text-sm font-bold mb-2 text-right">
            {t("group.inviteCode")}
          </Text>
          <View className="flex-row-reverse items-center gap-2">
            <Text className="text-white text-lg font-mono flex-1 text-right">
              {group.invite_code}
            </Text>
            <TouchableOpacity
              className="bg-brand px-4 py-2 rounded-lg"
              onPress={() => {
                router.push("/group/invite");
              }}
            >
              <Text className="text-white text-sm font-bold">
                {t("group.invite")}
              </Text>
            </TouchableOpacity>
          </View>
          <Text className="text-slate-500 text-xs mt-2 text-right">
            {group.plan === "free"
              ? `${members.length}/${group.max_members} ${t("group.members")}`
              : t("group.members")}
          </Text>
        </Card>
      )}

      {/* Members list */}
      <View className="px-4 mb-2">
        <Text className="text-slate-300 text-sm font-bold text-right">
          {t("group.members")} ({members.length})
        </Text>
      </View>

      <FlatList
        data={members}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 100 }}
        renderItem={({ item }) => {
          const isCurrentUser = item.user_id === userId;
          const displayName =
            item.profiles?.display_name || item.user_id.slice(0, 8);

          return (
            <TouchableOpacity
              className="flex-row-reverse items-center py-3 border-b border-slate-800"
              onLongPress={() => {
                if (activeRole === "admin" && !isCurrentUser) {
                  Alert.alert(displayName, undefined, [
                    {
                      text: t("group.manage"),
                      onPress: () =>
                        handleRoleChange(item.id, item.role as UserRole),
                    },
                    {
                      text: t("common.delete"),
                      style: "destructive",
                      onPress: () => handleRemove(item.id, displayName),
                    },
                    { text: t("common.cancel"), style: "cancel" },
                  ]);
                }
              }}
              activeOpacity={0.7}
            >
              <View className="w-10 h-10 rounded-full bg-slate-700 items-center justify-center">
                <Text className="text-white font-bold">
                  {displayName.charAt(0)}
                </Text>
              </View>
              <View className="flex-1 mr-3">
                <Text className="text-white font-bold text-right">
                  {displayName}
                  {isCurrentUser ? " (את/ה)" : ""}
                </Text>
                <Text
                  className={`text-xs text-right ${
                    roleColors[item.role as UserRole]
                  }`}
                >
                  {t(`group.${item.role}`)}
                </Text>
              </View>
            </TouchableOpacity>
          );
        }}
      />
    </View>
  );
}
