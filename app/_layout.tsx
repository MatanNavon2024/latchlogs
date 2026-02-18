import { useEffect, useState } from "react";
import { I18nManager, View, ActivityIndicator } from "react-native";
import { Slot, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import "../global.css";
import "../src/lib/i18n";
import { supabase } from "../src/lib/supabase";
import { useAuthStore } from "../src/stores/authStore";
import type { Session } from "@supabase/supabase-js";

if (!I18nManager.isRTL) {
  I18nManager.allowRTL(true);
  I18nManager.forceRTL(true);
}

export default function RootLayout() {
  const [ready, setReady] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const segments = useSegments();
  const router = useRouter();
  const storeSetSession = useAuthStore((s) => s.setSession);

  useEffect(() => {
    supabase.auth
      .getSession()
      .then(({ data }) => {
        setSession(data.session);
        storeSetSession(data.session);
        setReady(true);
      })
      .catch(() => {
        storeSetSession(null);
        setReady(true);
      });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      storeSetSession(newSession);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!ready) return;
    const inAuthGroup = segments[0] === "(auth)";

    if (!session && !inAuthGroup) {
      router.replace("/(auth)/login");
    } else if (session && inAuthGroup) {
      router.replace("/(tabs)");
    }
  }, [session, ready, segments]);

  if (!ready) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: "#0F172A",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <ActivityIndicator size="large" color="#3B82F6" />
      </View>
    );
  }

  return (
    <>
      <StatusBar style="light" />
      <Slot />
    </>
  );
}
