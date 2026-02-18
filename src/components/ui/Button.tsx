import {
  TouchableOpacity,
  Text,
  ActivityIndicator,
  type TouchableOpacityProps,
} from "react-native";

interface ButtonProps extends TouchableOpacityProps {
  title: string;
  variant?: "primary" | "secondary" | "danger" | "lock" | "unlock";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
}

const variantStyles: Record<string, { bg: string; text: string }> = {
  primary: { bg: "bg-brand", text: "text-white" },
  secondary: { bg: "bg-slate-700", text: "text-slate-100" },
  danger: { bg: "bg-red-600", text: "text-white" },
  lock: { bg: "bg-locked", text: "text-white" },
  unlock: { bg: "bg-unlocked", text: "text-white" },
};

const sizeStyles: Record<string, { container: string; text: string }> = {
  sm: { container: "px-4 py-2 rounded-lg", text: "text-sm" },
  md: { container: "px-6 py-3 rounded-xl", text: "text-base" },
  lg: { container: "px-8 py-5 rounded-2xl", text: "text-xl" },
};

export function Button({
  title,
  variant = "primary",
  size = "md",
  loading = false,
  disabled,
  ...props
}: ButtonProps) {
  const v = variantStyles[variant];
  const s = sizeStyles[size];

  return (
    <TouchableOpacity
      className={`${v.bg} ${s.container} items-center justify-center ${
        disabled || loading ? "opacity-50" : ""
      }`}
      disabled={disabled || loading}
      activeOpacity={0.7}
      {...props}
    >
      {loading ? (
        <ActivityIndicator color="white" />
      ) : (
        <Text className={`${v.text} ${s.text} font-bold`}>{title}</Text>
      )}
    </TouchableOpacity>
  );
}
