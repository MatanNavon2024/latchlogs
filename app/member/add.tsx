import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  ScrollView,
  Alert,
} from "react-native";
import { router } from "expo-router";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Button } from "../../src/components/ui/Button";
import { supabase } from "../../src/lib/supabase";
import { useAuthStore } from "../../src/stores/authStore";
import type { UserRole } from "../../src/types/database";

const ROLES: { value: UserRole; label: string; icon: string }[] = [
  { value: "admin", label: "מנהל", icon: "shield-crown" },
  { value: "member", label: "חבר", icon: "account" },
  { value: "guest", label: "אורח", icon: "account-outline" },
];

export default function AddMemberScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const activeGroupId = useAuthStore((s) => s.activeGroupId);

  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<UserRole>("member");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleRegister = async () => {
    if (!displayName.trim() || !email.trim() || !password.trim() || !activeGroupId) return;
    if (password.length < 6) {
      setError("סיסמה חייבת להיות לפחות 6 תווים");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
      const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

      // Sign up new user via REST API (doesn't affect current session)
      const signupRes = await fetch(`${supabaseUrl}/auth/v1/signup`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: supabaseKey!,
        },
        body: JSON.stringify({
          email: email.trim(),
          password: password.trim(),
          data: { display_name: displayName.trim() },
        }),
      });

      const signupData = await signupRes.json();

      if (!signupRes.ok || signupData.error_code) {
        throw new Error(signupData.msg || signupData.error || "שגיאה ברישום");
      }

      const newUserId = signupData.id;
      if (!newUserId) throw new Error("לא התקבל מזהה משתמש");

      // Create profile for the new user
      const { error: profileError } = await supabase
        .from("profiles")
        .upsert({ id: newUserId, display_name: displayName.trim() });

      if (profileError) {
        console.warn("Profile creation warning:", profileError.message);
      }

      // Add new user to the group
      const { error: memberError } = await supabase
        .from("group_members")
        .insert({
          group_id: activeGroupId,
          user_id: newUserId,
          role,
        });

      if (memberError) throw memberError;

      Alert.alert(t("common.success"), t("members.registered"), [
        { text: t("common.confirm"), onPress: () => router.back() },
      ]);
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
          <MaterialCommunityIcons name="arrow-right" size={28} color="white" />
        </TouchableOpacity>
        <Text className="text-white text-xl font-bold">
          {t("members.registerNew")}
        </Text>
        <View className="w-7" />
      </View>

      <ScrollView className="flex-1 px-6" contentContainerStyle={{ paddingBottom: 40 }}>
        {/* Display Name */}
        <View className="mb-4">
          <Text className="text-slate-300 text-sm mb-1 text-right">
            {t("auth.displayName")}
          </Text>
          <TextInput
            className="bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white text-right text-lg"
            placeholder="שם תצוגה"
            placeholderTextColor="#64748B"
            value={displayName}
            onChangeText={setDisplayName}
          />
        </View>

        {/* Email */}
        <View className="mb-4">
          <Text className="text-slate-300 text-sm mb-1 text-right">
            {t("auth.email")}
          </Text>
          <TextInput
            className="bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white text-right text-lg"
            placeholder="user@example.com"
            placeholderTextColor="#64748B"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />
        </View>

        {/* Password */}
        <View className="mb-4">
          <Text className="text-slate-300 text-sm mb-1 text-right">
            {t("auth.password")}
          </Text>
          <TextInput
            className="bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white text-right text-lg"
            placeholder="לפחות 6 תווים"
            placeholderTextColor="#64748B"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />
        </View>

        {/* Role picker */}
        <View className="mb-6">
          <Text className="text-slate-300 text-sm mb-2 text-right">
            {t("members.role")}
          </Text>
          <View className="flex-row gap-2">
            {ROLES.map((r) => (
              <TouchableOpacity
                key={r.value}
                className={`flex-1 py-3 rounded-xl items-center flex-row justify-center gap-2 ${
                  role === r.value
                    ? "bg-brand border-2 border-brand"
                    : "bg-slate-800 border border-slate-700"
                }`}
                onPress={() => setRole(r.value)}
              >
                <MaterialCommunityIcons
                  name={r.icon as any}
                  size={18}
                  color={role === r.value ? "white" : "#94A3B8"}
                />
                <Text
                  className={`font-bold text-sm ${
                    role === r.value ? "text-white" : "text-slate-400"
                  }`}
                >
                  {r.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {error ? (
          <Text className="text-red-400 text-sm text-right mb-4">{error}</Text>
        ) : null}

        <Button
          title={t("members.addUser")}
          onPress={handleRegister}
          loading={loading}
          disabled={!displayName.trim() || !email.trim() || !password.trim()}
          size="lg"
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
