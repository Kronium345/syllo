// Syllo design tokens (prompts/01-design-system.md), derived one-to-one from the
// Screensdesign prototype (Tailwind CDN + CSS variables). The single source of truth for
// colours, type, radii, spacing and shadows. Read through `tw` / `color()` from
// `@/theme`; never hardcode these values elsewhere (lint-enforced).
const { plugin } = require("twrnc");

const colors = {
  transparent: "transparent",
  white: "#FFFFFF",
  black: "#000000",

  // --color-primary, blue-50, blue-100; white text/icons on primary fills.
  primary: { DEFAULT: "#2563EB", tint: "#EFF6FF", soft: "#DBEAFE" },
  "on-primary": "#FFFFFF",

  // --color-text-main, --color-text-muted, gray-300 (lock icons), gray-400 (placeholders).
  ink: "#0F172A",
  muted: "#64748B",
  faint: "#D1D5DB",
  placeholder: "#9CA3AF",

  // --color-bg, --color-surface, gray-50, gray-100, --color-border (= gray-200).
  canvas: "#F8FAFC",
  surface: "#FFFFFF",
  subtle: "#F9FAFB",
  track: "#F3F4F6",
  border: "#E5E7EB",

  // Ratings (yellow-400 / yellow-500).
  star: { DEFAULT: "#FACC15", deep: "#EAB308" },
  // Daily streak (orange-500 / -600 / -50 / -100).
  streak: { DEFAULT: "#F97316", deep: "#EA580C", tint: "#FFF7ED", line: "#FFEDD5" },
  // emerald-500 (lessons done), green-600 (savings), emerald-50 (toast badge).
  success: { DEFAULT: "#10B981", deep: "#16A34A", tint: "#ECFDF5" },
  // red-500 / -600 / -50 / -100 (sale banner, errors).
  danger: { DEFAULT: "#EF4444", deep: "#DC2626", tint: "#FEF2F2", line: "#FEE2E2" },
  // blue-500 (certificates icon).
  info: "#3B82F6",

  // Overlays: white/90, white/80 (glass bars), white/30 and white/20 (video controls),
  // black/20 (video back button), the player's bottom shade, and the sheet scrim (estimated).
  glass: { DEFAULT: "rgba(255, 255, 255, 0.9)", soft: "rgba(255, 255, 255, 0.8)" },
  veil: { DEFAULT: "rgba(255, 255, 255, 0.2)", strong: "rgba(255, 255, 255, 0.3)", dark: "rgba(0, 0, 0, 0.2)" },
  "video-shade": "rgba(0, 0, 0, 0.8)",
  scrim: "rgba(15, 23, 42, 0.45)",
  // Soft drop shadow under the Dynamic Island banner card (not in the design; estimated).
  shade: "rgba(15, 23, 42, 0.2)",
};

// The prototype sets no font, so Tailwind's default sans (the system UI font) renders.
// Line height defaults to Tailwind's 1.5× unless a style sets `leading-*`.
const LINE_HEIGHT = { normal: 1.5, tight: 1.25, snug: 1.375, relaxed: 1.625 };
const TRACKING = { tight: -0.025, wide: 0.025, wider: 0.05 }; // em, as in Tailwind

// Every text size the prototype uses, named by pixel size (`text-14` = text-[14px]).
const SIZES = [11, 12, 13, 14, 15, 16, 17, 18, 20, 24, 28, 30, 34];
const fontSize = Object.fromEntries(
  SIZES.map((size) => [String(size), [`${size}px`, `${size * LINE_HEIGHT.normal}px`]]),
);

// Shared text styles: [size, weight, colour, leading, tracking, uppercase].
// Built as style objects so the line height follows the size (twrnc's relative
// `leading-*` only works when the size is in the same class string).
const textStyles = {
  display: [34, "700", colors.ink, "tight", "tight"],
  insight: [30, "700", colors.ink, "tight"],
  "title-xl": [28, "700", colors.ink, "tight"],
  "title-lg": [24, "700", colors.ink, "tight"],
  title: [20, "700", colors.ink, "tight"],
  heading: [18, "700", colors.ink],
  lead: [17, "400", colors.muted, "relaxed"],
  option: [17, "600", colors.ink],
  subtitle: [16, "400", colors.muted],
  body: [15, "400", colors.muted, "relaxed"],
  "card-title": [15, "700", colors.ink],
  callout: [14, "400", colors.muted],
  "callout-strong": [14, "700", colors.ink],
  caption: [13, "400", colors.muted],
  "caption-strong": [13, "600", colors.ink],
  footnote: [12, "400", colors.muted],
  badge: [11, "700", colors.primary.DEFAULT, "normal", "wider", true],
  tab: [11, "500", colors.muted],
  button: [16, "600", colors["on-primary"]],
};

const typeUtilities = Object.fromEntries(
  Object.entries(textStyles).map(([name, [size, weight, color, leading = "normal", tracking, upper]]) => [
    `type-${name}`,
    {
      fontSize: size,
      lineHeight: Math.round(size * LINE_HEIGHT[leading] * 100) / 100,
      fontWeight: weight,
      color,
      ...(tracking ? { letterSpacing: Math.round(size * TRACKING[tracking] * 100) / 100 } : {}),
      ...(upper ? { textTransform: "uppercase" } : {}),
    },
  ]),
);

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    // Replaces Tailwind's palette so only these tokens exist.
    colors,
    fontSize,
    borderRadius: {
      none: "0px",
      md: "6px",
      lg: "8px",
      xl: "12px",
      "2xl": "16px",
      // The dashboard hero card's rounded-[20px].
      card: "20px",
      // Sheet tops (no design; estimated).
      "3xl": "24px",
      full: "9999px",
    },
    extend: {
      spacing: {
        // px-6 page gutter and p-8 sticky footers in the prototype.
        screen: "24px",
        footer: "32px",
      },
    },
  },
  plugins: [
    // twrnc keeps only the last addUtilities call per plugin: keep them all here.
    plugin(({ addUtilities }) => {
      addUtilities({
        ...typeUtilities,
        // The prototype's .custom-shadow, Tailwind's shadow-sm, and the search field's focus ring.
        "shadow-card": { boxShadow: "0 8px 24px rgba(15, 23, 42, 0.08)" },
        "shadow-sm": { boxShadow: "0 1px 2px rgba(0, 0, 0, 0.05)" },
        "shadow-focus": { boxShadow: `0 0 0 1px ${colors.primary.DEFAULT}` },
        "shadow-none": { boxShadow: "none" },
      });
    }),
  ],
  // Exposed for the theme module (line heights for AppText overrides).
  syllo: { LINE_HEIGHT, TRACKING, SIZES },
};
