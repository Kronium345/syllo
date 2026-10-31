# 10 · App icon, splash screen and dark theme

Status: done (device check pending)

## Goal
Syllo gets its own identity: an app icon (an open book shaped like an S) set up in `app.json` the way Havenly does it, Android adaptive and monochrome icons from a size-managing script, a splash screen with the mark and a "syllo" wordmark, and the whole app switched to a dark version of the design system, so it no longer looks like the light prototype or tutorial.

## Decisions
- **Dark theme (user: "Dark theme, keep blue"):** only the colour tokens in `tailwind.config.js` change. Layouts, type, radii and spacing stay the same, so every screen follows automatically. New values (Tailwind slate, plus blue tuned for dark):
  - **Surfaces:** `canvas` #0F172A, `surface` #1E293B, `subtle` #273449, `track` #334155, `border` #334155.
  - **Text:** `ink` #F8FAFC, `muted` #94A3B8, `faint` #475569, `placeholder` #64748B.
  - **Brand:**
    - `primary` #3B82F6 (blue-500, readable on dark), with `on-primary` #FFFFFF.
    - `primary-tint` #172554 (blue-950, selected cards and badges) and `primary-soft` #1E3A8A (blue-900, icon tiles and the "Did you know?" badge).
    - `info` #60A5FA.
  - **Status colours:**
    - `success` #10B981 (deep #4ADE80, tint #052E16).
    - `danger` #EF4444 (deep #F87171, tint #450A0A, line #7F1D1D).
    - `streak` #F97316 (deep #FB923C, tint #431407, line #7C2D12).
    - `star` unchanged.
    - The "deep" shades become lighter so text on tints stays readable.
  - **Overlays:**
    - Glass bars become dark translucent: `glass` rgba(15,23,42,0.9) and `glass-soft` rgba(15,23,42,0.8). iOS blur uses `tint="dark"`.
    - `scrim` rgba(0,0,0,0.6) and `shade` rgba(0,0,0,0.4).
    - The video overlays (`veil*`, `video-shade`, `white`) are unchanged.
  - **Shadow:** `shadow-card` stays, but at a higher opacity (0.4, black), so cards still lift on dark.
  - **System:** `app.json` `userInterfaceStyle: "dark"`, and the root `StatusBar style="light"`.
- **Brand marks on dark:** Apple's sign-in rule is a white logo on dark, so `apple.svg` gets a white variant (`apple-white.svg`), which `BrandLogo` uses. Google's coloured "G" stays.
- **Fixed colours to review:** the quiz timer `Switch` thumb becomes `white`. The design-system preview's colour list stays, and shows the new values.
- **App icon (user: open book forming an S):**
  - `assets/brand/syllo-mark.svg` is drawn by hand: two book pages from a centre spine whose curved top and bottom edges read as an "S", in one colour, inside the Android safe zone (about 60% of the canvas).
  - The icon is the white mark on brand blue **#2563EB**. That's the original primary, which is richer behind white than #3B82F6 and stands out on home screens.
  - Files (ported from Havenly's `scripts/generate-app-icon.mjs`):
    - `assets/images/icon.png`: 1024, flattened with no alpha, for iOS.
    - `logo-mark.png`: transparent white mark.
    - `favicon.png`: 48.
- **Android sizing (user: copy Havenly's script):**
  - `scripts/generate-android-adaptive-foreground.mjs` is ported as is.
  - It scales the mark onto a 1024 canvas so it stays inside the 66dp safe circle. The scale is set for this mark (start at 72% like Havenly, check the corners, adjust), and its comment records why.
  - **Adaptive icon:** foreground `android-adaptive-foreground.png`, `backgroundColor` #2563EB, and `monochromeImage` the same foreground (themed icons).
  - The template's `android-icon-*.png` and `assets/expo.icon` (the Expo template's iOS icon bundle) are deleted, and `ios.icon` is removed so iOS uses `icon`, as in Havenly. Asking before deleting: these are template placeholders, and approving the plan approves removing them.
- **Splash (user: mark + wordmark):**
  - `scripts/generate-splash.mjs` is ported from Havenly. It draws the white mark above a white lowercase "syllo" wordmark (`assets/brand/syllo-wordmark.svg`).
  - The wordmark is hand-built from rounded strokes (geometric, like the stroke-2 Lucide icons), so it needs no font file.
  - The splash keeps the logo inside Android 12's visible circle.
  - `app.json` sets `expo-splash-screen` to `backgroundColor` **#0F172A** (the new `canvas`, so the splash fades into the dark app with no flash) and `imageWidth` 200 (matching the script's `IMAGE_WIDTH`).
  - The `expo-notifications` accent colour becomes #3B82F6.
- **Blanks (user approved):**
  - `ios.bundleIdentifier` and `android.package` are **com.kronium.syllo**, and the app `name` is **Syllo**.
  - `sharp` is added as a dev dependency (`npx expo install sharp -- --save-dev`; it isn't an app dependency).
  - npm scripts: `generate:app-icon`, `generate:android-icon`, `generate:splash`.
- **Docs:**
  - `AGENTS.md` "Light mode only" becomes "Dark only", plus a short Brand section (the mark, the scripts, which colour goes where).
  - `.claude/rules/design-system.md` (and the `.cursor` mirror) gets the new token values and notes that the prototype's colours are now inverted to dark.

## Out of scope
- A light/dark switch (dark only), store listing art, and the RevenueCat paywall art. Onboarding photos stay; they read fine on dark.

## Steps
### 1. Tooling
- Add `sharp` as a dev dependency and add the three npm scripts.

### 2. Brand SVGs and the icon
- Write `syllo-mark.svg` and `syllo-wordmark.svg`.
- Port `generate-app-icon.mjs`, run it, and look at the PNGs (the Read tool shows images). Iterate on the mark until it reads clearly at 48 px.

### 3. Android adaptive icon
- Port the script, pick the scale, run it, and check a circular-mask preview (render the foreground on blue with a 66/108 circle, then view it).

### 4. Splash
- Port the script, run it, and view the output on #0F172A.

### 5. app.json
- Icon, adaptive and monochrome icons, splash, notification colour, ids, name and `userInterfaceStyle`. Remove the template icon files.

### 6. Dark tokens
- Update `tailwind.config.js` (and the theme comments), `Glass` (`tint="dark"`), the StatusBar, `BrandLogo` (white Apple) and the Switch thumb.
- Grep for any light-only assumptions (for example, `surface` used as a foreground).
- Update `/design-system` if anything there assumes light.

### 7. Close out
- Docs, as decided. `tsc` and lint.

## Verification
- `npx tsc --noEmit` and `npx expo lint` pass, and `npx expo-doctor` shows no new problems.
- **Images, viewed directly:** `icon.png` at full size and at 48 px; the adaptive foreground under a circular mask; `splash-icon.png` on #0F172A.
- **Config:** `npx expo config --type public` shows the icon, adaptive icon, splash, ids and dark UI style.
- **Device (user):**
  - In Expo Go, every screen is dark with readable text and visible borders.
  - In a development build, the launcher icon (including the Android themed icon) and the dark splash show. Expo Go always shows its own icon and splash.

## AGENTS.md updates
- **Design system:** "Light mode only" becomes "Dark only (prompts/10)", with the new token summary.
- **New Brand bullet under Rules:** `assets/brand/syllo-mark.svg` and `syllo-wordmark.svg`; `npm run generate:app-icon`, then `generate:android-icon`, then `generate:splash`; icon blue #2563EB; splash and canvas #0F172A; ids `com.kronium.syllo`.

## Result
- **Brand SVGs** in `assets/brand/`: `syllo-mark.svg` (a rounded S rising from an open book's two page curves), `syllo-wordmark.svg` (stroke-built "syllo"), and `apple-white.svg`.
- **Scripts** ported from Havenly, with npm scripts `generate:app-icon` / `generate:android-icon` / `generate:splash`, using `sharp` ^0.35.5 (dev).
- **Android adaptive scale is 68%, not 72%.** At 72% the book corners touched the 66dp safe ring in a mask preview; 68% leaves a margin.
- **Generated:** `icon.png` (1024, RGB, no alpha), `logo-mark.png`, `favicon.png` (48), `android-adaptive-foreground.png` (also the monochrome icon), and `splash-icon.png` (1200, logo 697×992 inside Android 12's circle).
- **Removed:** the template's `assets/expo.icon` and `android-icon-*.png`.
- **app.json:** name Syllo; ids `com.kronium.syllo`; `userInterfaceStyle` dark; adaptive background #2563EB; splash #0F172A at width 200; notification colour #3B82F6. `expo config` shows all of these.
- **Dark tokens** in `tailwind.config.js`, as decided. Shadows are darker (card 0.4, sm 0.3). `Glass` and the banner blur use `tint="dark"`. The status bar is light. Apple uses the white logo. The timer switch thumb is white.
- **Checks:** `tsc` and lint pass. `expo-doctor`: 19/20; the failure is 5 patch-version mismatches in packages this plan didn't touch (`@expo/ui`, `expo`, `expo-dev-client`, `expo-router`, `react-native-screens`).
- **Not verified:** screens on a device in dark mode (no web or Expo Go run here: the Chrome extension isn't connected and bundling runs out of memory), and the real launcher icon and splash, which need a development build.
