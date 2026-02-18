import { useEffect } from "react";
import { supabase } from "../lib/supabase";
import { useAuthStore } from "../stores/authStore";

export function useAuthListener() {
  const setSession = useAuthStore((s) => s.setSession);

  useEffect(() => {
    supabase.auth
      .getSession()
      .then(({ data: { session } }) => {
        setSession(session);
      })
      .catch(() => {
        setSession(null);
      });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, [setSession]);
}

export async function signUpWithEmail(
  email: string,
  password: string,
  displayName: string
) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { display_name: displayName },
    },
  });

  if (error) return { error };

  // Create profile row client-side (trigger on auth.users doesn't work in Supabase hosted)
  if (data.user) {
    const { error: profileError } = await supabase
      .from("profiles")
      .upsert({
        id: data.user.id,
        display_name: displayName,
      });

    if (profileError) {
      console.warn("Profile creation error:", profileError.message);
    }
  }

  return { error: null };
}

export async function signInWithEmail(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) return { error };

  // Ensure profile exists on login too
  if (data.user) {
    const { data: existingProfile } = await supabase
      .from("profiles")
      .select("id")
      .eq("id", data.user.id)
      .single();

    if (!existingProfile) {
      await supabase.from("profiles").upsert({
        id: data.user.id,
        display_name:
          data.user.user_metadata?.display_name || data.user.email || "",
      });
    }
  }

  return { error: null };
}

export async function signInWithPhone(phone: string) {
  const { error } = await supabase.auth.signInWithOtp({ phone });
  return { error };
}

export async function verifyOtp(phone: string, token: string) {
  const { error } = await supabase.auth.verifyOtp({
    phone,
    token,
    type: "sms",
  });
  return { error };
}
