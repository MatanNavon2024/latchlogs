/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        locked: "#22C55E",
        unlocked: "#EF4444",
        surface: {
          DEFAULT: "#1E293B",
          light: "#F8FAFC",
        },
        brand: {
          DEFAULT: "#3B82F6",
          dark: "#1E40AF",
        },
      },
    },
  },
  plugins: [],
};
