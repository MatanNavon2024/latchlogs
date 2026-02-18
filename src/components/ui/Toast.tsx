import { useEffect, useRef } from "react";
import { Animated, Text, View } from "react-native";

interface ToastProps {
  message: string;
  visible: boolean;
  onHide: () => void;
  duration?: number;
  variant?: "success" | "error" | "info";
}

const variantColors = {
  success: "bg-locked",
  error: "bg-unlocked",
  info: "bg-brand",
};

export function Toast({
  message,
  visible,
  onHide,
  duration = 2000,
  variant = "success",
}: ToastProps) {
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.delay(duration),
        Animated.timing(opacity, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start(() => onHide());
    }
  }, [visible, duration, onHide, opacity]);

  if (!visible) return null;

  return (
    <Animated.View
      style={{ opacity }}
      className="absolute bottom-24 left-4 right-4 z-50"
    >
      <View
        className={`${variantColors[variant]} rounded-xl px-6 py-4 items-center`}
      >
        <Text className="text-white text-base font-bold">{message}</Text>
      </View>
    </Animated.View>
  );
}
