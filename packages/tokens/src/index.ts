export { accent, dark, light, semantic, difficulty, verdict } from "./colors";
export { fontFamily, fontSize } from "./typography";
export { spacing, borderRadius } from "./spacing";

// Tailwind/NativeWind theme extension — import this in tailwind.config.js
export const tailwindTheme = {
  colors: {
    accent: {
      DEFAULT: "#638688",
      light: "#7fa4a6",
      dark: "#4a6b6d",
      muted: "rgba(99,134,136,0.12)",
    },
    surface: "#1a1a1a",
    elevated: "#242424",
    input: "#141414",
    primary: "#f0f0f0",
    secondary: "#9a9a9a",
    muted: "#555555",
    success: "#22c55e",
    warning: "#f59e0b",
    danger: "#ef4444",
    easy: "#22c55e",
    medium: "#f59e0b",
    hard: "#ef4444",
  },
  fontFamily: {
    sans: ["Roboto", "system-ui", "sans-serif"],
    mono: ["Roboto Mono", "monospace"],
  },
  fontSize: {
    display: ["32px", { lineHeight: "1.1" }],
    h1: ["24px", { lineHeight: "1.2" }],
    h2: ["20px", { lineHeight: "1.3" }],
    h3: ["17px", { lineHeight: "1.4" }],
    body: ["15px", { lineHeight: "1.5" }],
    "body-sm": ["13px", { lineHeight: "1.5" }],
    label: ["12px", { lineHeight: "1.3", letterSpacing: "0.04em" }],
    micro: ["11px", { lineHeight: "1.3" }],
  },
  borderRadius: {
    flat: "0px",
    tight: "4px",
    card: "8px",
    large: "12px",
    pill: "9999px",
  },
  spacing: {
    xs: "4px",
    sm: "8px",
    md: "12px",
    lg: "16px",
    xl: "24px",
    "2xl": "32px",
    "3xl": "48px",
  },
} as const;
