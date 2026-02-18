import { useState, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from "react-native";
import { router } from "expo-router";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Toast } from "../../src/components/ui/Toast";
import { useGroupMembers, updateMemberRole, removeMember } from "../../src/hooks/useGroup";
import { useAuthStore } from "../../src/stores/authStore";
import { timeAgo } from "../../src/lib/timeAgo";
import type { GroupMember, Profile, UserRole } from "../../src/types/database";

interface MemberWithProfile extends GroupMember {
  profiles?: Profile;
}

const ROLE_LABELS: Record<UserRole, { he: string; icon: string; color: string }> = {
  admin: { he: "מנהל", icon: "shield-crown", color: "#F59E0B" },
  member: { he: "חבר", icon: "account", color: "#3B82F6" },
  guest: { he: "אורח", icon: "account-outline", color: "#64748B" },
};

export default function MembersScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const activeGroupId = useAuthStore((s) => s.activeGroupId);
  const activeRole = useAuthStore((s) => s.activeRole);
  const currentUserId = useAuthStore((s) => s.user?.id);

  const { members, loading, refetch } = useGroupMembers(activeGroupId ?? undefined);
  const [toast, setToast] = useState({ visible: false, message: "" });

  const isAdmin = activeRole === "admin";

  const handleChangeRole = useCallback(
    (member: MemberWithProfile) => {
      if (!isAdmin || member.user_id === currentUserId) return;

      const roles: UserRole[] = ["admin", "member", "guest"];
      const options = roles.map((role) => ({
        text: ROLE_LABELS[role].he,
        onPress: async () => {
          try {
            await updateMemberRole(member.id, role);
            refetch();
            setToast({ visible: true, message: t("common.success") });
          } catch {
            setToast({ visible: true, message: t("common.error") });
          }
        },
      }));

      Alert.alert(t("members.changeRole"), member.profiles?.display_name || "—", [
        ...options,
        { text: t("common.cancel"), style: "cancel" },
      ]);
    },
    [isAdmin, currentUserId, refetch, t]
  );

  const handleRemove = useCallback(
    (member: MemberWithProfile) => {
      if (!isAdmin || member.user_id === currentUserId) return;

      Alert.alert(
        t("members.removeConfirm"),
        member.profiles?.display_name || "",
        [
          { text: t("common.cancel"), style: "cancel" },
          {
            text: t("common.delete"),
            style: "destructive",
            onPress: async () => {
              try {
                await removeMember(member.id);
                refetch();
                setToast({ visible: true, message: t("members.removed") });
              } catch {
                setToast({ visible: true, message: t("common.error") });
              }
            },
          },
        ]
      );
    },
    [isAdmin, currentUserId, refetch, t]
  );

  const renderMember = useCallback(
    ({ item }: { item: MemberWithProfile }) => {
      const role = ROLE_LABELS[item.role as UserRole] ?? ROLE_LABELS.member;
      const isMe = item.user_id === currentUserId;

      return (
        <View className="bg-slate-800/50 rounded-2xl px-4 py-4 mb-3">
          <View className="flex-row-reverse items-center">
            {/* Avatar */}
            <View
              className="w-12 h-12 rounded-full items-center justify-center"
              style={{ backgroundColor: role.color + "30" }}
            >
              <MaterialCommunityIcons
                name={role.icon as any}
                size={24}
                color={role.color}
              />
            </View>

            {/* Name & role */}
            <View className="flex-1 mr-3">
              <View className="flex-row-reverse items-center gap-2">
                <Text className="text-white text-base font-bold">
                  {item.profiles?.display_name || "—"}
                </Text>
                {isMe && (
                  <View className="bg-brand/20 px-2 py-0.5 rounded-full">
                    <Text className="text-brand text-xs font-bold">
                      {t("members.you")}
                    </Text>
                  </View>
                )}
              </View>
              <View className="flex-row-reverse items-center gap-2 mt-1">
                <View
                  className="px-2 py-0.5 rounded-full"
                  style={{ backgroundColor: role.color + "20" }}
                >
                  <Text style={{ color: role.color }} className="text-xs font-bold">
                    {role.he}
                  </Text>
                </View>
                <Text className="text-slate-500 text-xs">
                  {timeAgo(item.joined_at)}
                </Text>
              </View>
            </View>

            {/* Actions for admin */}
            {isAdmin && !isMe && (
              <View className="flex-row gap-2">
                <TouchableOpacity
                  onPress={() => handleChangeRole(item)}
                  className="w-9 h-9 rounded-full bg-slate-700 items-center justify-center"
                >
                  <MaterialCommunityIcons
                    name="account-edit"
                    size={18}
                    color="#94A3B8"
                  />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => handleRemove(item)}
                  className="w-9 h-9 rounded-full bg-red-900/30 items-center justify-center"
                >
                  <MaterialCommunityIcons
                    name="account-remove"
                    size={18}
                    color="#EF4444"
                  />
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      );
    },
    [currentUserId, isAdmin, handleChangeRole, handleRemove, t]
  );

  if (!activeGroupId) {
    return (
      <View
        className="flex-1 bg-slate-900 items-center justify-center px-8"
        style={{ paddingTop: insets.top }}
      >
        <MaterialCommunityIcons name="account-group" size={72} color="#475569" />
        <Text className="text-slate-400 text-lg mt-4 text-center">
          {t("members.empty")}
        </Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-slate-900" style={{ paddingTop: insets.top }}>
      {/* Header */}
      <View className="px-6 pt-4 pb-2 flex-row-reverse items-center justify-between">
        <Text className="text-white text-2xl font-bold">
          {t("members.title")}
        </Text>
        {isAdmin && (
          <TouchableOpacity
            onPress={() => router.push("/member/add")}
            className="bg-brand w-10 h-10 rounded-full items-center justify-center"
          >
            <MaterialCommunityIcons name="account-plus" size={22} color="white" />
          </TouchableOpacity>
        )}
      </View>

      {/* Members count */}
      <View className="px-6 pb-3">
        <Text className="text-slate-400 text-sm text-right">
          {members.length} {t("group.members")}
        </Text>
      </View>

      {/* Members list */}
      <FlatList
        data={members}
        keyExtractor={(item) => item.id}
        renderItem={renderMember}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 100 }}
        refreshControl={
          <RefreshControl
            refreshing={loading}
            onRefresh={refetch}
            tintColor="#3B82F6"
          />
        }
        ListEmptyComponent={
          !loading ? (
            <View className="items-center justify-center py-20">
              <MaterialCommunityIcons
                name="account-group"
                size={64}
                color="#475569"
              />
              <Text className="text-slate-400 text-lg mt-4">
                {t("members.empty")}
              </Text>
            </View>
          ) : null
        }
      />

      <Toast
        message={toast.message}
        visible={toast.visible}
        onHide={() => setToast({ visible: false, message: "" })}
      />
    </View>
  );
}
