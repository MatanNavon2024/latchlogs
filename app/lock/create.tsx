import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { router } from "expo-router";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Button } from "../../src/components/ui/Button";
import { createLock } from "../../src/hooks/useLocks";
import { useNFC } from "../../src/hooks/useNFC";
import { useAuthStore } from "../../src/stores/authStore";

export default function CreateLockScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const activeGroupId = useAuthStore((s) => s.activeGroupId);
  const { supported: nfcSupported, scanning, scan, cancel } = useNFC();

  const [name, setName] = useState("");
  const [nfcTagId, setNfcTagId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleScanNfc = async () => {
    const tagId = await scan();
    if (tagId) setNfcTagId(tagId);
  };

  const handleCreate = async () => {
    if (!name.trim() || !activeGroupId) return;
    setLoading(true);
    setError("");

    try {
      await createLock(activeGroupId, name.trim(), nfcTagId || undefined);
      router.back();
    } catch (err: any) {
      setError(err.message || t("common.error"));
    }
    setLoading(false);
  };

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-slate-900"
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={{ paddingTop: insets.top }}
    >
      {/* Header */}
      <View className="px-5 py-4 flex-row-reverse items-center justify-between">
        <TouchableOpacity onPress={() => router.back()}>
          <MaterialCommunityIcons name="arrow-right" size={28} color="white" />
        </TouchableOpacity>
        <Text className="text-white text-xl font-bold">
          {t("lock.create")}
        </Text>
        <View className="w-7" />
      </View>

      <View className="flex-1 px-6 pt-4 gap-5">
        <View>
          <Text className="text-slate-300 text-sm mb-1 text-right">
            {t("lock.name")}
          </Text>
          <TextInput
            className="bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white text-right text-lg"
            placeholder="דלת כניסה, מחסן..."
            placeholderTextColor="#64748B"
            value={name}
            onChangeText={setName}
          />
        </View>

        <View>
          <Text className="text-slate-300 text-sm mb-1 text-right">
            NFC Tag ID (אופציונלי)
          </Text>
          <View className="flex-row-reverse gap-2">
            <TextInput
              className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white text-right"
              placeholder="ניתן להוסיף מאוחר יותר"
              placeholderTextColor="#64748B"
              value={nfcTagId}
              onChangeText={setNfcTagId}
            />
            {nfcSupported && (
              <TouchableOpacity
                className={`w-12 rounded-xl items-center justify-center ${
                  scanning ? "bg-brand" : "bg-slate-700"
                }`}
                onPress={scanning ? cancel : handleScanNfc}
              >
                {scanning ? (
                  <ActivityIndicator color="white" size="small" />
                ) : (
                  <MaterialCommunityIcons
                    name="cellphone-nfc"
                    size={24}
                    color="#94A3B8"
                  />
                )}
              </TouchableOpacity>
            )}
          </View>
        </View>

        {error ? (
          <Text className="text-red-400 text-sm text-right">{error}</Text>
        ) : null}

        <View className="mt-4">
          <Button
            title={t("lock.create")}
            onPress={handleCreate}
            loading={loading}
            disabled={!name.trim()}
            size="lg"
          />
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}
