import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { Link, router } from "expo-router";
import { useTranslation } from "react-i18next";
import { Button } from "../../src/components/ui/Button";
import { signUpWithEmail } from "../../src/hooks/useAuth";

export default function RegisterScreen() {
  const { t } = useTranslation();
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleRegister = async () => {
    if (!email || !password || !displayName) return;
    setLoading(true);
    setError("");

    const { error: authError } = await signUpWithEmail(
      email,
      password,
      displayName
    );

    if (authError) {
      setError(authError.message);
    }
    setLoading(false);
  };

  return (
    <KeyboardAvoidingView
      className="flex-1"
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        contentContainerClassName="flex-1 justify-center px-8"
        keyboardShouldPersistTaps="handled"
      >
        <View className="items-center mb-12">
          <Text className="text-5xl font-bold text-white mb-2">🔐</Text>
          <Text className="text-3xl font-bold text-white">
            {t("auth.register")}
          </Text>
        </View>

        <View className="gap-4">
          <View>
            <Text className="text-slate-300 text-sm mb-1 text-right">
              {t("auth.displayName")}
            </Text>
            <TextInput
              className="bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white text-right"
              placeholder="השם שלך"
              placeholderTextColor="#64748B"
              value={displayName}
              onChangeText={setDisplayName}
            />
          </View>

          <View>
            <Text className="text-slate-300 text-sm mb-1 text-right">
              {t("auth.email")}
            </Text>
            <TextInput
              className="bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white text-right"
              placeholder="email@example.com"
              placeholderTextColor="#64748B"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              value={email}
              onChangeText={setEmail}
            />
          </View>

          <View>
            <Text className="text-slate-300 text-sm mb-1 text-right">
              {t("auth.password")}
            </Text>
            <TextInput
              className="bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white text-right"
              placeholder="••••••••"
              placeholderTextColor="#64748B"
              secureTextEntry
              value={password}
              onChangeText={setPassword}
            />
          </View>

          {error ? (
            <Text className="text-red-400 text-sm text-right">{error}</Text>
          ) : null}

          <Button
            title={t("auth.registerButton")}
            onPress={handleRegister}
            loading={loading}
            size="lg"
          />

          <View className="flex-row justify-center mt-4 gap-1">
            <Link href="/(auth)/login">
              <Text className="text-brand font-bold">
                {t("auth.loginButton")}
              </Text>
            </Link>
            <Text className="text-slate-400">{t("auth.hasAccount")}</Text>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
