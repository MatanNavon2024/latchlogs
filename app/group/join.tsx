import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
} from "react-native";
import { router } from "expo-router";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Button } from "../../src/components/ui/Button";
import { joinGroupByCode, createGroup } from "../../src/hooks/useGroup";
import { useAuthStore } from "../../src/stores/authStore";

export default function JoinGroupScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const fetchGroups = useAuthStore((s) => s.fetchGroups);

  const [mode, setMode] = useState<"join" | "create">("join");
  const [code, setCode] = useState("");
  const [groupName, setGroupName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleJoin = async () => {
    if (!code.trim()) return;
    setLoading(true);
    setError("");

    try {
      await joinGroupByCode(code.trim());
      await fetchGroups();
      router.back();
    } catch (err: any) {
      setError(err.message || t("common.error"));
    }
    setLoading(false);
  };

  const handleCreate = async () => {
    if (!groupName.trim()) return;
    setLoading(true);
    setError("");

    try {
      await createGroup(groupName.trim());
      await fetchGroups();
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
      <View className="px-5 py-4 flex-row items-center justify-between">
        <TouchableOpacity onPress={() => router.back()}>
          <MaterialCommunityIcons
            name="arrow-right"
            size={28}
            color="white"
          />
        </TouchableOpacity>
        <Text className="text-white text-xl font-bold">
          {mode === "join" ? t("group.join") : t("group.create")}
        </Text>
        <View className="w-7" />
      </View>

      {/* Mode toggle */}
      <View className="flex-row mx-6 mb-6 bg-slate-800 rounded-xl p-1">
        <TouchableOpacity
          className={`flex-1 py-2 rounded-lg items-center ${
            mode === "join" ? "bg-brand" : ""
          }`}
          onPress={() => setMode("join")}
        >
          <Text
            className={`font-bold ${
              mode === "join" ? "text-white" : "text-slate-400"
            }`}
          >
            {t("group.join")}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          className={`flex-1 py-2 rounded-lg items-center ${
            mode === "create" ? "bg-brand" : ""
          }`}
          onPress={() => setMode("create")}
        >
          <Text
            className={`font-bold ${
              mode === "create" ? "text-white" : "text-slate-400"
            }`}
          >
            {t("group.create")}
          </Text>
        </TouchableOpacity>
      </View>

      <View className="px-6 gap-4">
        {mode === "join" ? (
          <View>
            <Text className="text-slate-300 text-sm mb-1 text-right">
              {t("group.enterCode")}
            </Text>
            <TextInput
              className="bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white text-center text-xl tracking-widest"
              placeholder="abc123"
              placeholderTextColor="#64748B"
              autoCapitalize="none"
              autoCorrect={false}
              value={code}
              onChangeText={setCode}
            />
          </View>
        ) : (
          <View>
            <Text className="text-slate-300 text-sm mb-1 text-right">
              {t("group.name")}
            </Text>
            <TextInput
              className="bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white text-right text-lg"
              placeholder="הבית שלי, המשרד..."
              placeholderTextColor="#64748B"
              value={groupName}
              onChangeText={setGroupName}
            />
          </View>
        )}

        {error ? (
          <Text className="text-red-400 text-sm text-right">{error}</Text>
        ) : null}

        <Button
          title={mode === "join" ? t("group.join") : t("group.create")}
          onPress={mode === "join" ? handleJoin : handleCreate}
          loading={loading}
          disabled={mode === "join" ? !code.trim() : !groupName.trim()}
          size="lg"
        />
      </View>
    </KeyboardAvoidingView>
  );
}
