import { View, type ViewProps } from "react-native";

interface CardProps extends ViewProps {
  variant?: "default" | "elevated";
}

export function Card({
  children,
  variant = "default",
  className = "",
  ...props
}: CardProps) {
  const base = "rounded-2xl p-4";
  const variants = {
    default: "bg-slate-800 border border-slate-700",
    elevated: "bg-slate-800 shadow-lg shadow-black/30",
  };

  return (
    <View className={`${base} ${variants[variant]} ${className}`} {...props}>
      {children}
    </View>
  );
}
