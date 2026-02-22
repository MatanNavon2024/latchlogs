import { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Switch,
  Alert,
  Image,
} from "react-native";
import { router } from "expo-router";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Card } from "../../src/components/ui/Card";
import { Button } from "../../src/components/ui/Button";
import { Toast } from "../../src/components/ui/Toast";
import * as SecureStore from "expo-secure-store";
import { useAuthStore } from "../../src/stores/authStore";
import { registerForPushNotifications } from "../../src/lib/notifications";
import {
  requestLocationPermissions,
  registerLockGeofences,
  unregisterGeofences,
} from "../../src/lib/geofencing";
import { useLocks } from "../../src/hooks/useLocks";

export default function SettingsScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const {
    profile,
    groups,
    activeGroupId,
    setActiveGroup,
    updateProfile,
    signOut,
  } = useAuthStore();

  const [editingName, setEditingName] = useState(false);
  const [displayName, setDisplayName] = useState(profile?.display_name ?? "");
  const [notificationsEnabled, setNotificationsEnabled] = useState(
    !!profile?.push_token
  );
  const [geofenceEnabled, setGeofenceEnabled] = useState(false);
  const [toast, setToast] = useState({ visible: false, message: "" });
  const { locks } = useLocks();

  useEffect(() => {
    setDisplayName(profile?.display_name ?? "");
  }, [profile?.display_name]);

  useEffect(() => {
    setNotificationsEnabled(!!profile?.push_token);
  }, [profile?.push_token]);

  useEffect(() => {
    SecureStore.getItemAsync("geofence_enabled").then((val) => {
      setGeofenceEnabled(val === "true");
    });
  }, []);

  const handleSaveName = async () => {
    if (!displayName.trim()) return;
    await updateProfile({ display_name: displayName.trim() });
    setEditingName(false);
    setToast({ visible: true, message: t("common.success") });
  };

  const handleToggleNotifications = async (value: boolean) => {
    setNotificationsEnabled(value);
    if (value) {
      const token = await registerForPushNotifications();
      if (!token) setNotificationsEnabled(false);
    } else {
      await updateProfile({ push_token: null } as any);
    }
  };

  const handleToggleGeofence = async (value: boolean) => {
    setGeofenceEnabled(value);
    if (value) {
      const granted = await requestLocationPermissions();
      if (!granted) {
        setGeofenceEnabled(false);
        setToast({ visible: true, message: t("geofence.locationPermissionDenied") });
        return;
      }
      await SecureStore.setItemAsync("geofence_enabled", "true");
      await registerLockGeofences(locks);
    } else {
      await SecureStore.setItemAsync("geofence_enabled", "false");
      await unregisterGeofences();
    }
  };

  const handleSignOut = () => {
    Alert.alert(t("auth.logout"), t("common.confirm"), [
      { text: t("common.cancel"), style: "cancel" },
      { text: t("auth.logout"), style: "destructive", onPress: signOut },
    ]);
  };

  return (
    <View className="flex-1 bg-slate-900" style={{ paddingTop: insets.top }}>
      {/* Header */}
      <View className="px-5 py-4">
        <Text className="text-white text-2xl font-bold text-right">
          {t("settings.title")}
        </Text>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 100 }}
      >
        {/* Profile section */}
        <Text className="text-slate-400 text-xs font-bold mb-2 text-right uppercase">
          {t("settings.profile")}
        </Text>
        <Card className="mb-6">
          <View className="flex-row-reverse items-center gap-3 mb-4">
            {profile?.avatar_url ? (
              <Image
                source={{ uri: profile.avatar_url }}
                className="w-14 h-14 rounded-full"
              />
            ) : (
              <View className="w-14 h-14 rounded-full bg-brand/20 items-center justify-center">
                <Text className="text-brand text-xl font-bold">
                  {(profile?.display_name ?? "?").charAt(0)}
                </Text>
              </View>
            )}
            <View className="flex-1">
              {editingName ? (
                <View className="flex-row-reverse items-center gap-2">
                  <TextInput
                    className="flex-1 bg-slate-700 rounded-lg px-3 py-2 text-white text-right"
                    value={displayName}
                    onChangeText={setDisplayName}
                    autoFocus
                  />
                  <TouchableOpacity onPress={handleSaveName}>
                    <MaterialCommunityIcons
                      name="check"
                      size={24}
                      color="#22C55E"
                    />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => setEditingName(false)}>
                    <MaterialCommunityIcons
                      name="close"
                      size={24}
                      color="#EF4444"
                    />
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity onPress={() => setEditingName(true)}>
                  <Text className="text-white text-lg font-bold text-right">
                    {profile?.display_name || "—"}
                  </Text>
                  <Text className="text-slate-500 text-xs text-right">
                    לחץ לעריכה
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </Card>

        {/* Groups section */}
        <Text className="text-slate-400 text-xs font-bold mb-2 text-right uppercase">
          {t("group.title")}
        </Text>
        <Card className="mb-2">
          {groups.map((group) => (
            <TouchableOpacity
              key={group.id}
              className={`flex-row-reverse items-center justify-between py-3 ${
                group.id !== groups[groups.length - 1].id
                  ? "border-b border-slate-700"
                  : ""
              }`}
              onPress={() => setActiveGroup(group.id)}
              onLongPress={() => router.push(`/group/${group.id}`)}
            >
              <View className="flex-row-reverse items-center gap-2">
                <MaterialCommunityIcons
                  name={
                    activeGroupId === group.id
                      ? "radiobox-marked"
                      : "radiobox-blank"
                  }
                  size={20}
                  color={activeGroupId === group.id ? "#3B82F6" : "#64748B"}
                />
                <Text className="text-white font-bold">{group.name}</Text>
              </View>
              <View className="flex-row items-center gap-1">
                <Text className="text-slate-500 text-xs">
                  {group.plan === "pro" ? "Pro" : "Free"}
                </Text>
                <MaterialCommunityIcons
                  name="chevron-left"
                  size={20}
                  color="#64748B"
                />
              </View>
            </TouchableOpacity>
          ))}
        </Card>

        <View className="flex-row-reverse gap-2 mb-6">
          <TouchableOpacity
            className="flex-1 bg-slate-800 border border-slate-700 rounded-xl py-3 items-center"
            onPress={() => router.push("/group/join")}
          >
            <Text className="text-brand font-bold">
              + {t("group.create")} / {t("group.join")}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Preferences */}
        <Text className="text-slate-400 text-xs font-bold mb-2 text-right uppercase">
          העדפות
        </Text>
        <Card className="mb-6">
          <View className="flex-row-reverse items-center justify-between py-2">
            <View className="flex-row-reverse items-center gap-2">
              <MaterialCommunityIcons
                name="bell-outline"
                size={20}
                color="#94A3B8"
              />
              <Text className="text-white font-bold">
                {t("settings.notifications")}
              </Text>
            </View>
            <Switch
              value={notificationsEnabled}
              onValueChange={handleToggleNotifications}
              trackColor={{ false: "#334155", true: "#3B82F6" }}
              thumbColor="white"
            />
          </View>

          <View className="border-t border-slate-700 mt-2 pt-2" />

          <View className="flex-row-reverse items-center justify-between py-2">
            <View className="flex-row-reverse items-center gap-2 flex-1 mr-3">
              <MaterialCommunityIcons
                name="map-marker-radius"
                size={20}
                color="#94A3B8"
              />
              <View className="flex-1">
                <Text className="text-white font-bold text-right">
                  {t("geofence.enableReminders")}
                </Text>
                <Text className="text-slate-500 text-xs text-right">
                  {t("geofence.enableRemindersDesc")}
                </Text>
              </View>
            </View>
            <Switch
              value={geofenceEnabled}
              onValueChange={handleToggleGeofence}
              trackColor={{ false: "#334155", true: "#3B82F6" }}
              thumbColor="white"
            />
          </View>
        </Card>

        {/* Sign out */}
        <Button
          title={t("auth.logout")}
          variant="danger"
          onPress={handleSignOut}
        />

        <Text className="text-slate-600 text-xs text-center mt-4">
          {t("settings.version")} 1.0.0
        </Text>
      </ScrollView>

      <Toast
        message={toast.message}
        visible={toast.visible}
        onHide={() => setToast({ visible: false, message: "" })}
      />
    </View>
  );
}
