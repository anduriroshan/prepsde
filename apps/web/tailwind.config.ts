import type { Config } from "tailwindcss";
import { tailwindTheme } from "../../packages/tokens/src/index";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: tailwindTheme,
  },
};

export default config;
