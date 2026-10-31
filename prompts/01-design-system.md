# 01 · Design system (twrnc tokens, shared components, restyle)

Status: done (visual check pending)

## Goal
Syllo gets the design system of the Screensdesign prototype (`C:\Users\danie\Downloads\course_platform_prototype\course_platform_prototype\screens\*.html`, 10 screens, Tailwind CDN + Lucide). Every colour, type size, radius and shadow becomes a twrnc token. The prototype's repeated pieces become shared components. The bottom tabs match the design (Home, My Courses, Explore, Profile), and every existing screen (auth, home, search, profile, account, sheets, toasts) is restyled onto the tokens. The screens themselves are rebuilt to their designs in later plans: Dashboard + Explore, then Course details + Lesson player, then Onboarding + Paywall.

## Decisions
- **Styling: twrnc only (user decision; replaces NativeWind in `AGENTS.md`).** twrnc 4.16 is already installed. The setup follows havenly: tokens live only in `tailwind.config.js`, and `src/theme/index.ts` exports `tw = create(require("../../tailwind.config.js"))`, `color(token)`, `iconSize` and `control`. `useDeviceContext(tw)` is called in the root layout. No NativeWind, Babel or Metro plugin.
- **Source of truth:** the prototype's HTML (its `PROJECT_DOCUMENTATION.md`: "replicate one-to-one"). Its CSS variables and the Tailwind defaults it uses are the exact values. Tailwind's default palette is replaced, so only these tokens exist.
- **Colours** (prototype name → token):
  - `--color-primary` #2563EB → `primary`; blue-50 #EFF6FF → `primary-tint`; blue-100 #DBEAFE → `primary-soft`; white on primary → `on-primary`.
  - `--color-text-main` #0F172A → `ink`; `--color-text-muted` #64748B → `muted`; gray-300 #D1D5DB → `faint` (lock icons); gray-400 #9CA3AF → `placeholder` (Tailwind's input placeholder).
  - `--color-bg` #F8FAFC → `canvas`; `--color-surface` #FFFFFF → `surface`; gray-50 #F9FAFB → `subtle` (search field, chips, curriculum header, resource row); gray-100 #F3F4F6 → `track` (progress tracks, light dividers); gray-200 #E5E7EB = `--color-border` → `border`.
  - Star yellow-400 #FACC15 → `star`, yellow-500 #EAB308 → `star-deep`.
  - Streak orange-50/100/500/600 → `streak-tint` #FFF7ED, `streak-line` #FFEDD5, `streak` #F97316, `streak-deep` #EA580C.
  - Success: emerald-500 #10B981 → `success`, green-600 #16A34A → `success-deep`, plus `success-tint` #ECFDF5 (emerald-50, for toasts).
  - Danger: red-50 #FEF2F2 → `danger-tint`, red-100 #FEE2E2 → `danger-line`, red-500 #EF4444 → `danger`, red-600 #DC2626 → `danger-deep`.
  - blue-500 #3B82F6 → `info` (certificates icon).
  - Overlays: white/90 → `glass`, white/80 → `glass-soft`, white/30 → `veil-strong`, white/20 → `veil`, black/20 → `veil-dark`, black → `black`, the player's gradient `rgba(0,0,0,0.8)` → `video-shade`, plus `scrim` rgba(15,23,42,0.45) for sheets (no design; estimated).
  - `transparent` and `white` stay.
  - The Dynamic Island banner's `conf/palette.ts` and `placeholder-colors.ts` are replaced by these tokens.
- **Type: the system font** (the prototype sets no font, so Tailwind's default sans renders: SF Pro on iOS, Roboto on Android, the system UI font on web). No font assets.
  - Weights `font-medium` 500, `font-semibold` 600, `font-bold` 700, with regular as the default.
  - Line height follows Tailwind: 1.5× unless the design sets `leading-tight` 1.25, `leading-snug` 1.375 or `leading-relaxed` 1.625; tracking `tight` −0.025em, `wide` 0.025em, `wider` 0.05em.
  - Sizes are tokens named by their pixel size so screens can copy the design one-to-one: `text-11 12 13 14 15 16 17 18 20 24 28 30 34`, each with its 1.5× line height by default.
- **`AppText` variants** for the combinations the design repeats (size / weight / colour / leading):
  - `display` 34 bold ink tight tracking-tight (welcome headline).
  - `insight` 30 bold ink tight (educational insight).
  - `title-xl` 28 bold ink tight (quiz and paywall titles).
  - `title-lg` 24 bold ink tight (course and lesson titles).
  - `title` 20 bold ink tight (hero card title, stat numbers).
  - `heading` 18 bold ink (section headings, prices).
  - `lead` 17 regular muted relaxed (onboarding paragraphs).
  - `option` 17 semibold ink (option titles).
  - `subtitle` 16 regular muted (screen subtitles).
  - `body` 15 regular muted relaxed (descriptions).
  - `card-title` 15 bold ink (card titles).
  - `callout` 14 regular muted (meta).
  - `callout-strong` 14 bold ink.
  - `caption` 13 regular muted.
  - `caption-strong` 13 semibold ink.
  - `footnote` 12 regular muted.
  - `badge` 11 bold uppercase tracking-wider.
  - `tab` 11 medium.
  - `button` 16 semibold on-primary (the design's buttons are `font-semibold`/`font-bold` at the default 16).
  - `AppText` takes `variant` plus `style` overrides (for example, a colour).
  - Screens may also use the size/weight/colour utilities directly when a combination appears only once.
- **Radii:** the Tailwind values the design uses: `rounded-md` 6, `lg` 8, `xl` 12, `2xl` 16, `card` 20 (the dashboard hero card's `rounded-[20px]`), `full`, plus `3xl` 24 for sheet tops (estimated; sheets aren't in the design).
- **Spacing:** Tailwind's default 4px scale (twrnc's default), plus `screen` 24 (the prototype's `px-6` page gutter) and `footer` 32 (`p-8` on sticky footers). The prototype's fixed sizes become `control` constants: 40 (square icon buttons), 48 (filter button, quiz icon tile), 84 (tab bar height).
- **Shadows** (`boxShadow`, which RN 0.88 supports on iOS, Android and web):
  - `shadow-card` 0 8px 24px rgba(15,23,42,0.08) (the prototype's `.custom-shadow`).
  - `shadow-sm` 0 1px 2px rgba(0,0,0,0.05) (rating badges).
  - `shadow-focus` 0 0 0 1px primary (the search field's `focus:ring-1`).
- **Effects:**
  - Translucent bars (`bg-white/80` + `backdrop-blur-md`) use a `Glass` component: `expo-blur` (installed) `BlurView` on iOS, plain `glass` colour on Android and web. Android's blur is costly, and web has no backdrop blur in RN Web.
  - Gradients (`bg-gradient-to-t` over photos, the player's `video-gradient`) use RN 0.88's stable `backgroundImage: "linear-gradient(...)"`. No new package.
  - Press feedback (`active:scale-[0.98]` / `active:scale-95`) is a `Pressable` style with `transform: [{ scale }]` while pressed, through a shared `pressScale(pressed, amount)` helper.
- **Icons:** `lucide-react-native` (already the icon library), through an `Icon` component taking `as`, `size` (`xs` 12, `sm` 14, `md` 18, `lg` 20, `xl` 24, `2xl` 30: the prototype's `text-*` icon sizes) and `color` (a token), stroke 2. The design's lucide names map to the current exports (`home` → `House`, `play-circle` → `CirclePlay`, `check-circle` → `CircleCheck`, `layout` → `LayoutTemplate`, checked against the installed types when used).
- **Shared components (`src/components/ui/`)**: each pattern appears on 2+ screens. Exact classes come from the prototype.
  - `AppText`, `Icon`, `Glass`.
  - `Button`. Variants: `primary` (primary fill, on-primary semibold 16, `py-4 rounded-2xl shadow-card`), `primary-bold` (the same in bold, as on "Enroll" and "Next Lesson"), `outline` (border, ink bold, `rounded-2xl`), `outline-primary` (primary border and text, 13 bold, `rounded-xl px-4 py-2`, as on "Follow"), `link` (primary semibold or bold text). Props: `leading`/`trailing` icons, `loading`, `disabled`.
  - `IconButton`: `outline` (40, `rounded-xl` border), `glass` (40, white/90 + blur + border), `glass-dark` (40, black/20 + white border and icon, for the player), `filter` (48, `rounded-2xl` border white), `close` (32, `rounded-full` white/80).
  - `Card`: surface, border, `rounded-2xl`; optional `shadow-card`; `radius="card"` for 20.
  - `Badge`: `pill` (11 bold uppercase tracking-wider, `px-2.5 py-1 rounded-md`, primary-tint/primary, as on "In Progress", "Chapter 01"), `insight` (13 bold uppercase tracking-wide, `rounded-full px-4 py-1.5`, primary-soft), `rating` (white/90 + `shadow-sm`, star + 11 bold, `rounded-lg`).
  - `Chip` (category filter): selected (primary fill, white 14 bold) or idle (subtle fill, border, muted 14 medium), `rounded-full px-5 py-2.5`.
  - `ProgressBar`: track `track`, fill `primary`, `rounded-full`, heights `sm` 4 / `md` 6 / `lg` 8.
  - `StickyFooter`: bottom bar, white, `border-t` border, `p-8` (`footer`), bottom safe-area inset added.
  - `SearchField`: subtle fill, border, `rounded-2xl`, `py-3.5 pl-12 pr-4`, 15, search icon at left 16, `shadow-focus` when focused.
  - `Avatar` (restyled; sizes 24/40/56 from the prototype plus the existing 104).
  - `TextField`: restyled like `SearchField`, keeping its label, eye toggle and red error border.
  - `Sheet`, `ProfileRow`/`ProfileRowGroup`, `BrandLogo` and the toast: restyled to tokens; not in the design, so their values are estimated in the design's language.
  - `RatingStars` (the row of 5 yellow stars) waits for the testimonials plan, its only user.
- **Tab bar (`AppTabBar`), matching the dashboard and explore screens:**
  - Four tabs: Home (`House`), My Courses (`BookOpen`), Explore (`Search`), Profile (`User`).
  - Height 84 including the bottom inset, white, `border-t` border, `px-8`, items spread evenly.
  - Icon `xl` 24, label 11. Active: primary, bold label. Inactive: muted, medium label.
  - Route changes: `(tabs)/search` becomes `(tabs)/explore`, and the old `/search` redirects there. A new `(tabs)/my-courses` shows an empty state ("No courses yet", "Courses you enroll in appear here.", an "Explore courses" button) until its own plan.
- **Light mode only:** `app.json` `userInterfaceStyle: "light"`, and the status bar is dark. The design has no dark mode, so no `dark:` classes are used.
- **Existing screens restyled onto the system** (no design for most; closest match from the design's language; estimates listed in the Result):
  - Auth (sign-in, sign-up, verify): canvas background, `title-xl` titles, `subtitle` copy, `TextField`s, primary `Button`, outline social buttons with brand logos, a `link` footer.
  - Home and Explore placeholders keep their content, now on tokens. Their designs come next.
  - Profile, Account, Settings and sheets use cards with border and `rounded-2xl` on canvas, `heading` section titles and `IconButton outline` back buttons.
- **Dev preview:** `src/app/design-system.tsx`, the route `/design-system` (open in `__DEV__` only; release builds redirect home). It shows every token swatch, `AppText` variant and component state. It's linked from nowhere; open it by URL on web.
- **Enforced by lint** (`eslint.config.js`, `src/**` except `src/theme/` and `tailwind.config.js`): no hex or `rgba(` string literals, and no `fontSize` / `fontWeight` / `fontFamily` object keys. Every value comes from `tw`, `color()` or `AppText`.
- **Rule file:** `.claude/rules/design-system.md` (mirrored in `.cursor/rules/`) holds the token list, component catalogue and "replicate the HTML one-to-one" steps, like the data-fetching rule.
- **Remote design images** (`media.screensdesign.com`) belong to later plans (onboarding illustrations and photos go into `assets/images/`). Course covers stay the database's placeholder URLs.
- **No new dependencies.**

## Out of scope
- Building the 10 designed screens (the next plans).
- An app icon, splash or wordmark for Syllo (the design has none).
- Dark mode, custom fonts, animations beyond press scale.

## Steps
### 1. Tokens and theme
`tailwind.config.js` (colours, type sizes with line heights, weights, radii, spacing `screen`/`footer`, shadows and the `type-*` utilities through a twrnc plugin); `src/theme/index.ts` (`tw`, `color`, `ColorToken`, `TextVariant`, `iconSize`, `control`, `pressScale`); `useDeviceContext(tw)` in the root layout; `userInterfaceStyle: "light"`. Done: `tsc` passes, and `tw.color("primary")` is `#2563EB`.

### 2. Primitives
`AppText`, `Icon`, `Glass`, `Button`, `IconButton`, `Card`, `Badge`, `Chip`, `ProgressBar`, `StickyFooter` and `SearchField`; restyle `Avatar`, `TextField`, `Sheet`, `ProfileRow`, `toast` and `BrandLogo`; delete `placeholder-colors.ts` and point the banner palette at tokens. Done: `tsc` passes.

### 3. Dev preview
`/design-system` with every token and component state. Done: it renders on web at 393 wide, with screenshots compared against the prototype's buttons, chips, badges, cards, progress bars and search field.

### 4. Tab bar and routes
`AppTabBar` restyle; four tabs; `search` → `explore` (with a redirect) and the My Courses empty state. Done: on web the bar matches the dashboard's tab bar side by side.

### 5. Restyle existing screens
Auth, Home, Explore, Profile, Account, sheets and toasts moved to tokens and primitives; no screen keeps hex values or raw font sizes. Done: lint (with the new rules) and `tsc` pass; web screenshots of each screen show no regressions.

### 6. Rules and close out
Lint rules, `.claude/rules/design-system.md` (+ the Cursor mirror), `AGENTS.md` (Design system section; NativeWind → twrnc), `## Result` with the list of estimated values.

## Verification
- `npx tsc --noEmit` and `npx expo lint` pass. Lint rejects a hex string, an `rgba(` string and a `fontSize` key in a screen (checked with a throwaway file).
- `grep` finds no `#[0-9A-Fa-f]{6}` or `fontSize` in `src/` outside the theme.
- Web, framed to 393×852 next to the prototype HTML: `/design-system` components match the prototype's (button, chip, badge, card, progress, search field, tab bar). The tab bar matches the dashboard's.
- Sign-in, Sign-up, Home, Explore, My Courses, Profile and Account render without layout breaks, and existing flows (sign in, delete course, sign out) still work.
- On your phone in Expo Go: the same screens, the tab bar with its safe area, and the iOS blur on glass bars.

## AGENTS.md updates
- **Who owns what → UI:** "styled with twrnc (user decision; not NativeWind)", with tokens only in `tailwind.config.js`.
- **Design system:** replace "Not built yet" with the token summary, the `AppText` / `Icon` / component catalogue, the system font, light mode only, `Glass` / gradient / press-scale patterns, the `/design-system` preview, the lint rules and the pointer to `.claude/rules/design-system.md`.
- **Rules:** shared UI list updated; `placeholder-colors.ts` removed; tabs are Home, My Courses, Explore, Profile.

## Result
Built as planned with twrnc (no NativeWind). `tailwind.config.js` holds every token from the prototype (checked: `primary` resolves to #2563EB, `type-display` 34/42.5 bold −0.85 tracking, `rounded-card` 20, `shadow-card` as `.custom-shadow`, and the default palette is gone). `src/theme` exports `tw`, `color`, `iconSize`, `control` and `pressScale`. New primitives: `AppText`, `Icon`, `Glass`, `Card`, `Badge`, `Chip`, `ProgressBar`, `StickyFooter`, `SearchField`. Restyled: `Button`, `IconButton`, `Avatar`, `TextField`, `Sheet`, `ProfileRow`, toast, and the banner palette. `placeholder-colors.ts` is deleted. The tab bar matches the design (Home, My Courses, Explore, Profile); `search` → `explore` with a `/search` redirect; there's a My Courses empty state and a dev-only `/design-system`. Auth, Home, Explore, Profile, Account and every sheet are on tokens. Lint blocks hex, `rgb(a)(` and raw font keys, and `.claude/rules/design-system.md` (+ the Cursor mirror) records the rules.

Changes from the plan:
- An extra token, `shade` (the banner's drop shadow), and `success-tint` for toast badges.
- Typed routes were regenerated by briefly starting the dev server (no standalone generator); the old file still listed `/search` and stray `/../lib` entries.
- `Button` gained `danger` (destructive confirmations, not in the design) and the `buttonInk()` helper for icon tints.

Estimated values (screens or states not in the design): sheet top radius 24 and its scrim; toast card layout; `TextField` label (caption-strong) and spacing; auth layout (quiz-screen header, outline social buttons, "or" divider); Profile, Account, Settings and device cards; the My Courses empty state; Avatar `xl` 104; the iOS blur intensity 40.

Verified: `tsc` and `expo lint` pass; the lint rules caught a hex, an `rgba(` and two font keys in a throwaway file; no `<Text>`, `StyleSheet` styles or hex values remain in `src/` outside the theme (except the banner's geometry-only StyleSheets). Not run: the web comparison at 393×852 and Expo Go. The Chrome extension wasn't connected, and the dev server ran out of memory while bundling ("JavaScript heap out of memory"), so those are left for the device check.
