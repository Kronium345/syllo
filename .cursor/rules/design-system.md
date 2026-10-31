---
description: Syllo design system: twrnc tokens from the Screensdesign prototype (no NativeWind), AppText variants, shared components, no raw colours or font styles
globs: src/**/*.ts,src/**/*.tsx,tailwind.config.js
alwaysApply: false
---

# Design system: twrnc tokens from the Screensdesign prototype

Syllo's UI replicates the Screensdesign prototype one-to-one (`C:\Users\danie\Downloads\course_platform_prototype\course_platform_prototype\screens\*.html`: Tailwind CDN classes + six CSS variables + Lucide icons). Styling is **twrnc only, never NativeWind**. `npx expo lint` blocks raw colours and font styles in `src/` (`eslint.config.js`).

## Tokens: `tailwind.config.js`, the only place values live

- Read them through `tw` (`tw\`px-screen bg-canvas\``, `tw.style(cond && "...")`), `color("primary")` for props that take a colour string, and `AppText` for text. Import from `@/theme`. Never write a hex value, `rgb(a)(`, `fontSize`, `fontWeight` or `fontFamily` in `src/` (lint-enforced; `src/theme/` is exempt).
- Tailwind's default palette is replaced: only the tokens exist (`bg-blue-500` resolves to nothing). Prototype → token:
  - `--color-primary` → `primary`, blue-50 → `primary-tint`, blue-100 → `primary-soft`, white on primary → `on-primary`.
  - `--color-text-main` → `ink`, `--color-text-muted` → `muted`, gray-300 → `faint`, gray-400 → `placeholder`.
  - `--color-bg` → `canvas`, white → `surface`, gray-50 → `subtle`, gray-100 → `track`, `--color-border`/gray-200 → `border`.
  - yellow-400/500 → `star`/`star-deep`; orange → `streak`, `streak-deep`, `streak-tint`, `streak-line`; emerald-500 → `success`, green-600 → `success-deep`; red → `danger`, `danger-deep`, `danger-tint`, `danger-line`; blue-500 → `info`.
  - white/90 → `glass`, white/80 → `glass-soft`, white/20 and /30 → `veil` / `veil-strong`, black/20 → `veil-dark`, the player gradient's black/80 → `video-shade`, the sheet backdrop → `scrim`, the banner shadow → `shade`.
- Type: the **system font** (the prototype sets none). Sizes are named by pixels: `text-11 12 13 14 15 16 17 18 20 24 28 30 34` (`text-[14px]` → `text-14`), each with Tailwind's 1.5× line height. Add `leading-tight|snug|relaxed` and `tracking-tight|wide|wider` as the HTML does; weights `font-medium|semibold|bold`.
- Radii: `rounded-md` 6, `lg` 8, `xl` 12, `2xl` 16, `card` 20 (`rounded-[20px]`), `3xl` 24 (sheet tops), `full`.
- Spacing: Tailwind's 4px scale, plus `screen` 24 (the `px-6` page gutter) and `footer` 32 (`p-8` footers). Fixed sizes come from `control` (`icon` 40, `lg` 48, `tabBar` 84); icon sizes from `iconSize` (`xs` 12 … `2xl` 30 = the HTML's `text-xs` … `text-3xl` on icons).
- Shadows: `shadow-card` (the prototype's `.custom-shadow`), `shadow-sm`, `shadow-focus` (the primary ring), `shadow-none`.
- A value the design uses that has no token: add the token to `tailwind.config.js` (and `ColorToken` in `src/theme/index.ts`) with a comment naming its prototype source. Never inline it. Values for screens the design doesn't have are estimated in its language and listed in the plan's Result.

## Components: `src/components/ui/`

- `AppText` with a `variant`: `display` 34, `insight` 30, `title-xl` 28, `title-lg` 24, `title` 20 (bold, tight), `heading` 18 bold, `lead` 17 muted relaxed, `option` 17 semibold, `subtitle` 16 muted, `body` 15 muted relaxed, `card-title` 15 bold, `callout` / `callout-strong` 14, `caption` / `caption-strong` 13, `footnote` 12, `badge` 11 bold uppercase wider, `tab` 11 medium, `button` 16 semibold white. Use `style={tw\`...\`}` for one-off combinations. All text goes through `AppText`, never `<Text>`.
- `Icon` (`lucide-react-native`, stroke 2, `size` + colour token). HTML `lucide:home` → `House`, `play-circle` → `CirclePlay`, `check-circle` → `CircleCheck`, `layout` → `LayoutTemplate`.
- `Button`: `primary` (py-4 rounded-2xl semibold + shadow-card), `primary-bold`, `outline`, `outline-primary` ("Follow"), `link`, `danger`; `leading`/`trailing` nodes (tint icons with `buttonInk(variant)`), `loading`, `disabled`.
- `IconButton`: `outline` (40, rounded-xl), `glass` (over photos), `glass-dark` (over video), `filter` (48, rounded-2xl), `close` (32 round).
- `Card` (border, rounded-2xl, optional `shadow`, `radius="card"`), `Badge` (`pill`, `insight`, `rating`), `Chip`, `ProgressBar` (`sm`/`md`/`lg`, `track`), `StickyFooter` (`p-8` + border-t + safe area; `tone="canvas"`), `SearchField`, `TextField`, `Avatar` (`xs` 24, `sm` 40, `md` 56, `xl` 104; `bordered`), `Glass` (blur on iOS, translucent fill elsewhere), `Sheet`, `ProfileRow`/`ProfileRowGroup`, `BrandLogo`, `toast`.
- Patterns: press feedback is `pressScale(pressed, 0.98 | 0.95 | 0.9)` in a `Pressable` style callback (the HTML's `active:scale-*`). Gradients (`bg-gradient-to-t`, the player's `video-gradient`) use RN's `backgroundImage: "linear-gradient(...)"` (no package). `backdrop-blur` uses `Glass`.
- A pattern on 2+ screens becomes a component here; a one-screen piece lives in `src/screens/<screen>/`. Add every new primitive to `/design-system` (`src/screens/design-system/design-system-screen.tsx`, dev only).

## Building a screen from the prototype

1. Open the screen's HTML in `screens/` (not the all-in-one file) and list every element, class and copy string in the plan.
2. Translate class by class: `px-6` → `px-screen`, `text-[var(--color-text-main)]` → `text-ink`, `text-[15px]` → `text-15`, `rounded-[20px]` → `rounded-card`, `.custom-shadow` → `shadow-card`, gray/blue/orange utilities → their tokens above.
3. Copy text exactly. Images: illustrations and photos from `media.screensdesign.com` go into `assets/images/` (marked placeholder if missing); course data comes from Supabase.
4. Light mode only (`userInterfaceStyle: "light"`); no `dark:` classes.
5. Compare on web at 393×852 next to the HTML, list differences, fix, then the user checks Expo Go.
6. `npx tsc --noEmit` and `npx expo lint` pass.
