import { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
} from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as Location from "expo-location";
import QRCode from "react-native-qrcode-svg";
import { Card } from "../../src/components/ui/Card";
import { Button } from "../../src/components/ui/Button";
import { StatusBadge } from "../../src/components/StatusBadge";
import { EventItem } from "../../src/components/EventItem";
import { Toast } from "../../src/components/ui/Toast";
import { supabase } from "../../src/lib/supabase";
import { recordEvent, useEvents } from "../../src/hooks/useEvents";
import { deleteLock, updateLockLocation } from "../../src/hooks/useLocks";
import { useNFC } from "../../src/hooks/useNFC";
import { useAuthStore } from "../../src/stores/authStore";
import { timeAgo } from "../../src/lib/timeAgo";
import type { LockWithStatus } from "../../src/types/database";

export default function LockDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const activeRole = useAuthStore((s) => s.activeRole);
  const { supported: nfcSupported, writeTag } = useNFC();

  const [lock, setLock] = useState<LockWithStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState({ visible: false, message: "" });
  const [writingNfc, setWritingNfc] = useState(false);
  const [showQr, setShowQr] = useState(false);
  const [fetchingLocation, setFetchingLocation] = useState(false);

  const { events, refresh: refreshEvents } = useEvents({ lockId: id });

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
    refreshEvents();
  }, [fetchLock]);

  const handleAction = async (action: "lock" | "unlock") => {
    if (!id) return;
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      await recordEvent(id, action, "manual");
      setToast({ visible: true, message: t("lock.recorded") });
      fetchLock();
      refreshEvents();
    } catch {
      setToast({ visible: true, message: t("common.error") });
    }
  };

  const handleWriteNfc = async () => {
    if (!id || !writeTag) return;
    setWritingNfc(true);
    try {
      const success = await writeTag(id);
      if (success) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setToast({ visible: true, message: "NFC נכתב בהצלחה!" });
      } else {
        setToast({ visible: true, message: "כתיבת NFC נכשלה" });
      }
    } catch {
      setToast({ visible: true, message: t("common.error") });
    }
    setWritingNfc(false);
  };

  const handleSetLocation = async () => {
    if (!id) return;
    setFetchingLocation(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setToast({ visible: true, message: t("geofence.locationPermissionDenied") });
        setFetchingLocation(false);
        return;
      }
      const pos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      await updateLockLocation(id, {
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
      });
      fetchLock();
      setToast({ visible: true, message: t("geofence.locationSet") });
    } catch {
      setToast({ visible: true, message: t("common.error") });
    }
    setFetchingLocation(false);
  };

  const handleRemoveLocation = async () => {
    if (!id) return;
    try {
      await updateLockLocation(id, null);
      fetchLock();
      setToast({ visible: true, message: t("common.success") });
    } catch {
      setToast({ visible: true, message: t("common.error") });
    }
  };

  const handleDelete = () => {
    Alert.alert(t("lock.delete"), t("common.confirm"), [
      { text: t("common.cancel"), style: "cancel" },
      {
        text: t("common.delete"),
        style: "destructive",
        onPress: async () => {
          try {
            await deleteLock(id!);
            router.back();
          } catch {}
        },
      },
    ]);
  };

  if (loading || !lock) {
    return (
      <View className="flex-1 bg-slate-900 items-center justify-center">
        <Text className="text-slate-400">{t("common.loading")}</Text>
      </View>
    );
  }

  const status = lock.lock_current_status;
  const isLocked = status?.status === "lock";

  return (
    <View className="flex-1 bg-slate-900" style={{ paddingTop: insets.top }}>
      {/* Header */}
      <View className="px-5 py-4 flex-row items-center justify-between">
        <TouchableOpacity onPress={() => router.back()}>
          <MaterialCommunityIcons name="arrow-right" size={28} color="white" />
        </TouchableOpacity>
        <Text className="text-white text-xl font-bold">{lock.name}</Text>
        {activeRole === "admin" && (
          <TouchableOpacity onPress={handleDelete}>
            <MaterialCommunityIcons
              name="delete-outline"
              size={24}
              color="#EF4444"
            />
          </TouchableOpacity>
        )}
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 100 }}
      >
        {/* Status card */}
        <Card variant="elevated" className="mb-4 items-center py-8">
          <View
            className={`w-24 h-24 rounded-full items-center justify-center mb-4 ${
              isLocked ? "bg-locked/20" : status ? "bg-unlocked/20" : "bg-slate-700"
            }`}
          >
            <MaterialCommunityIcons
              name={isLocked ? "lock" : "lock-open"}
              size={48}
              color={isLocked ? "#22C55E" : status ? "#EF4444" : "#94A3B8"}
            />
          </View>
          <StatusBadge status={status?.status ?? null} size="md" />
          {status && (
            <Text className="text-slate-400 text-sm mt-2">
              {timeAgo(status.last_action_at)}
            </Text>
          )}
        </Card>

        {/* Action buttons */}
        <View className="flex-row gap-3 mb-6">
          <TouchableOpacity
            className="flex-1 py-5 rounded-2xl items-center bg-locked"
            onPress={() => handleAction("lock")}
            activeOpacity={0.7}
          >
            <Text className="text-white text-xl font-bold">
              🔒 {t("lock.markLocked")}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            className="flex-1 py-5 rounded-2xl items-center bg-unlocked"
            onPress={() => handleAction("unlock")}
            activeOpacity={0.7}
          >
            <Text className="text-white text-xl font-bold">
              🔓 {t("lock.markUnlocked")}
            </Text>
          </TouchableOpacity>
        </View>

        {/* NFC Write button */}
        {activeRole === "admin" && (
          <TouchableOpacity
            className={`border rounded-2xl py-4 px-5 mb-4 flex-row items-center justify-between ${
              nfcSupported
                ? "bg-slate-800 border-slate-700"
                : "bg-slate-800/50 border-slate-700/50"
            }`}
            onPress={
              nfcSupported
                ? handleWriteNfc
                : () =>
                    Alert.alert(
                      "NFC לא זמין",
                      "NFC עובד רק על מכשיר פיזי (לא סימולטור)"
                    )
            }
            disabled={writingNfc}
            activeOpacity={0.7}
          >
            <View className="flex-row items-center gap-3">
              <View className="w-10 h-10 rounded-full bg-brand/20 items-center justify-center">
                <MaterialCommunityIcons
                  name="cellphone-nfc"
                  size={22}
                  color={nfcSupported ? "#3B82F6" : "#475569"}
                />
              </View>
              <View>
                <Text
                  className={`font-bold text-right ${
                    nfcSupported ? "text-white" : "text-slate-500"
                  }`}
                >
                  כתוב תג NFC
                </Text>
                <Text className="text-slate-400 text-xs text-right">
                  {nfcSupported
                    ? "קרב תג NFC לטלפון לכתיבה"
                    : "זמין רק על מכשיר פיזי"}
                </Text>
              </View>
            </View>
            {writingNfc ? (
              <ActivityIndicator color="#3B82F6" />
            ) : (
              <MaterialCommunityIcons
                name="chevron-left"
                size={22}
                color="#64748B"
              />
            )}
          </TouchableOpacity>
        )}

        {/* QR Code section */}
        <TouchableOpacity
          className="bg-slate-800 border border-slate-700 rounded-2xl py-4 px-5 mb-4"
          onPress={() => setShowQr(!showQr)}
          activeOpacity={0.7}
        >
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center gap-3">
              <View className="w-10 h-10 rounded-full bg-brand/20 items-center justify-center">
                <MaterialCommunityIcons
                  name="qrcode"
                  size={22}
                  color="#3B82F6"
                />
              </View>
              <View>
                <Text className="text-white font-bold text-right">
                  קוד QR למנעול
                </Text>
                <Text className="text-slate-400 text-xs text-right">
                  {showQr ? "לחץ להסתרה" : "לחץ להצגת הקוד"}
                </Text>
              </View>
            </View>
            <MaterialCommunityIcons
              name={showQr ? "chevron-up" : "chevron-down"}
              size={22}
              color="#64748B"
            />
          </View>

          {showQr && (
            <View className="mt-4 items-center">
              <View className="bg-white p-4 rounded-2xl">
                <QRCode
                  value={`https://latchlogs.com/clip/${lock.id}`}
                  size={200}
                  backgroundColor="white"
                  color="#0F172A"
                />
              </View>
              <Text className="text-slate-500 text-xs mt-3 text-center">
                {`https://latchlogs.com/clip/${lock.id}`}
              </Text>
            </View>
          )}
        </TouchableOpacity>

        {/* Location / Geofence */}
        {activeRole === "admin" && (
          <TouchableOpacity
            className={`border rounded-2xl py-4 px-5 mb-4 flex-row items-center justify-between ${
              lock.latitude
                ? "bg-brand/10 border-brand/30"
                : "bg-slate-800 border-slate-700"
            }`}
            onPress={handleSetLocation}
            onLongPress={lock.latitude ? handleRemoveLocation : undefined}
            disabled={fetchingLocation}
            activeOpacity={0.7}
          >
            <View className="flex-row items-center gap-3">
              <View
                className={`w-10 h-10 rounded-full items-center justify-center ${
                  lock.latitude ? "bg-brand/20" : "bg-slate-700"
                }`}
              >
                <MaterialCommunityIcons
                  name="map-marker"
                  size={22}
                  color={lock.latitude ? "#3B82F6" : "#94A3B8"}
                />
              </View>
              <View>
                <Text
                  className={`font-bold text-right ${
                    lock.latitude ? "text-brand" : "text-white"
                  }`}
                >
                  {lock.latitude
                    ? t("geofence.locationSet")
                    : t("geofence.setLocation")}
                </Text>
                <Text className="text-slate-400 text-xs text-right">
                  {lock.latitude
                    ? t("geofence.enableRemindersDesc")
                    : t("geofence.useCurrentLocation")}
                </Text>
              </View>
            </View>
            {fetchingLocation ? (
              <ActivityIndicator color="#3B82F6" />
            ) : lock.latitude ? (
              <MaterialCommunityIcons
                name="check-circle"
                size={22}
                color="#3B82F6"
              />
            ) : (
              <MaterialCommunityIcons
                name="chevron-left"
                size={22}
                color="#64748B"
              />
            )}
          </TouchableOpacity>
        )}

        {/* Lock info */}
        <Card className="mb-4">
          <Text className="text-slate-300 text-sm font-bold mb-2 text-right">
            {t("lock.detail")}
          </Text>
          {lock.nfc_tag_id && (
            <View className="flex-row items-center gap-2 mb-1">
              <MaterialCommunityIcons
                name="cellphone-nfc"
                size={16}
                color="#64748B"
              />
              <Text className="text-slate-400 text-sm">
                NFC: {lock.nfc_tag_id}
              </Text>
            </View>
          )}
          <View className="flex-row items-center gap-2">
            <MaterialCommunityIcons name="qrcode" size={16} color="#64748B" />
            <Text className="text-slate-400 text-sm">
              QR: {lock.qr_code_id.slice(0, 8)}...
            </Text>
          </View>
        </Card>

        {/* Recent events */}
        <Text className="text-slate-300 text-sm font-bold mb-2 text-right">
          {t("history.title")}
        </Text>
        {events.slice(0, 10).map((event) => (
          <EventItem key={event.id} event={event} />
        ))}
      </ScrollView>

      <Toast
        message={toast.message}
        visible={toast.visible}
        onHide={() => setToast({ visible: false, message: "" })}
      />
    </View>
  );
}
