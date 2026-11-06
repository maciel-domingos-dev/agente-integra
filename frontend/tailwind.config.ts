import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        navy: { DEFAULT: "#002B7F", deep: "#0B1B4F" },
        brand: { DEFAULT: "#58B32B", dark: "#47A11F" },
        cyan: { brand: "#0072CE" },
        surface: { bg: "#0B0F19", card: "#111827", line: "#1F2A44" },
      },
      boxShadow: {
        glow: "0 0 0 1px rgba(88,179,43,.18), 0 0 24px -8px rgba(0,114,206,.35)",
      },
    },
  },
  plugins: [],
};
export default config;
