export const fontFamily = {
  sans: ["Roboto", "system-ui", "sans-serif"],
  mono: ["Roboto Mono", "monospace"],
} as const;

export const fontSize = {
  display: ["32px", { lineHeight: "1.1", fontWeight: "900" }],
  h1:      ["24px", { lineHeight: "1.2", fontWeight: "700" }],
  h2:      ["20px", { lineHeight: "1.3", fontWeight: "700" }],
  h3:      ["17px", { lineHeight: "1.4", fontWeight: "600" }],
  body:    ["15px", { lineHeight: "1.5", fontWeight: "400" }],
  bodySm:  ["13px", { lineHeight: "1.5", fontWeight: "400" }],
  label:   ["12px", { lineHeight: "1.3", fontWeight: "500", letterSpacing: "0.04em" }],
  micro:   ["11px", { lineHeight: "1.3", fontWeight: "400" }],
} as const;
