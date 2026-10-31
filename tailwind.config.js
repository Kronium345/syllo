// Syllo design tokens (prompts/01-design-system.md, dark since prompts/10). Layout, type,
// radii and spacing come one-to-one from the Screensdesign prototype (Tailwind CDN + CSS
// variables); the colours are its dark inverse (user decision, prompts/10): slate surfaces,
// light text and a blue tuned for dark. Each token keeps the prototype role it replaces
// (named in its comment). The single source of truth for colours, type, radii, spacing and
// shadows: read through `tw` / `color()` from `@/theme`; never hardcode them (lint-enforced).
const { plugin } = require("twrnc");

const colors = {
  transparent: "transparent",
  white: "#FFFFFF",
  black: "#000000",

  // Primary (was --color-primary #2563EB): blue-500, readable on dark. Tints for selected
  // cards and badges (was blue-50) and icon tiles (was blue-100): blue-950 / blue-900.
  primary: { DEFAULT: "#3B82F6", tint: "#172554", soft: "#1E3A8A" },
  "on-primary": "#FFFFFF",

  // Text (was --color-text-main, --color-text-muted, gray-300 locks, gray-400 placeholders):
  // slate-50, slate-400, slate-600, slate-500.
  ink: "#F8FAFC",
  muted: "#94A3B8",
  faint: "#475569",
  placeholder: "#64748B",

  // Surfaces (was --color-bg, white, gray-50, gray-100, --color-border): slate-900 page,
  // slate-800 cards, a step lighter for subtle fills, slate-700 tracks and borders.
  canvas: "#0F172A",
  surface: "#1E293B",
  subtle: "#273449",
  track: "#334155",
  border: "#334155",

  // Ratings (yellow-400 / yellow-500).
  star: { DEFAULT: "#FACC15", deep: "#EAB308" },
  // Daily streak: orange-500, orange-400 text, orange-950 / -900 pill.
  streak: { DEFAULT: "#F97316", deep: "#FB923C", tint: "#431407", line: "#7C2D12" },
  // Success: emerald-500, green-400 text, green-950 tint.
  success: { DEFAULT: "#10B981", deep: "#4ADE80", tint: "#052E16" },
  // Danger: red-500, red-400 text, red-950 / -900 badge.
  danger: { DEFAULT: "#EF4444", deep: "#F87171", tint: "#450A0A", line: "#7F1D1D" },
  // Certificates icon (blue-400).
  info: "#60A5FA",

  // Overlays: dark glass bars (slate-900 at 90% / 80%), the video controls' white/30, white/20
  // and black/20, the player's bottom shade, the sheet scrim, and the banner card's shadow.
  glass: { DEFAULT: "rgba(15, 23, 42, 0.9)", soft: "rgba(15, 23, 42, 0.8)" },
  veil: { DEFAULT: "rgba(255, 255, 255, 0.2)", strong: "rgba(255, 255, 255, 0.3)", dark: "rgba(0, 0, 0, 0.2)" },
  "video-shade": "rgba(0, 0, 0, 0.8)",
  scrim: "rgba(0, 0, 0, 0.6)",
  shade: "rgba(0, 0, 0, 0.4)",
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
        // Darker on the dark theme so cards still lift off the page.
        "shadow-card": { boxShadow: "0 8px 24px rgba(0, 0, 0, 0.4)" },
        "shadow-sm": { boxShadow: "0 1px 2px rgba(0, 0, 0, 0.3)" },
        "shadow-focus": { boxShadow: `0 0 0 1px ${colors.primary.DEFAULT}` },
        "shadow-none": { boxShadow: "none" },
      });
    }),
  ],
  // Exposed for the theme module (line heights for AppText overrides).
  syllo: { LINE_HEIGHT, TRACKING, SIZES },
};
