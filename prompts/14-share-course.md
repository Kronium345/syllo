# 14 · Share a course from the native toolbar

Status: done

## Goal
On a course's details page, a native header toolbar has a Share button. It opens the system share sheet with a summary of the course (title, tutor, level, length, lesson count, short description) and a `syllo://course/<id>` link that opens the course in Syllo.

## Decisions
- **What's shared (user decision):** a summary plus the app link, built by `courseShareMessage(course)` in `src/lib/share-course.ts`. Sent with RN `Share.share({ title, message })`, which has no dependency. The message:
  ```
  {title}
  by {tutor} · {Level} · {1h 32m} · {N lessons}

  {description, cut to 200 characters with "…"}

  Open it in Syllo: syllo://course/{id}
  ```
  Missing parts (tutor, level, description) are left out, along with their separators.
- **Link:** `syllo://course/<id>`, built from `APP_SCHEME = "syllo"` (kept equal to `app.json` `scheme`).
  - It's built by hand, not with `Linking.createURL`, because that returns a dev-client URL in development builds.
  - There's no https link until the web app is deployed (syllo.expo.app). The link only works for people who have Syllo installed.
  - A signed-out recipient lands on Welcome (the auth guard), not the course.
- **Toolbar (user decision): one Share button**, `<Stack.Toolbar placement="right">` holding a `Stack.Toolbar.Button` with `accessibilityLabel="Share course"`. A header toolbar switches the native header on, so the course page sets:
  - `headerTransparent: true` (the cover photo stays full-bleed under it), `title: ""`, `headerTintColor` white, `headerBackButtonDisplayMode: "minimal"`.
  - The native back button replaces the design's frosted back button.
  - Applied with `<Stack.Screen options>` in the page, so other screens keep `headerShown: false`.
- **Icons (user decision):**
  - iOS: the SF Symbol `square.and.arrow.up`.
  - Android: `@expo/material-symbols/share.xml`, a new package added with `npx expo install @expo/material-symbols` (approved here).
  - Chosen with `process.env.EXPO_OS`, so each platform bundles only its own icon.
- **No round button backgrounds on Android:** `buttonContainerColor` isn't in the installed expo-router 58.0.28. Instead, a top gradient on the hero photo keeps the white icons readable (step 3). The page is dark (`surface`), so white icons also read once the photo scrolls away.
- **Web:** `Stack.Toolbar` doesn't render there. Web keeps today's frosted back and share `IconButton`s, behind `process.env.EXPO_OS === "web"`.
- **Opening from a link:** with nothing under the course page, the native back button wouldn't appear. `(app)/_layout.tsx` gets `unstable_settings = { anchor: "(tabs)" }` (the docs deprecate `initialRouteName` in favour of `anchor`), so a deep-linked course opens over the tabs and Back goes Home.
- **Course level:** `CourseDetails` doesn't have `level` yet. `getCourseDetails` selects it, and its type becomes `CourseLevel | null`, as on cards (prompts/13). `levelLabel` moves from `src/screens/explore/filters.ts` to `src/lib/course-level.ts`, so the share text and Explore share it.
- **The share button exists only once the course has loaded.** Back works in the loading, error and missing states, because the header is set up before the data arrives.

## Out of scope
- An https web link and a web course page for people without the app.
- Sharing the full outline, a "Copy link" action, or a share menu.
- Sharing lessons or quizzes.
- Keeping a deep link through sign-in (opening the course after a signed-out recipient signs in).

## Steps
### 1. Package and level
- `npx expo install @expo/material-symbols`. Check how `.xml` imports type-check: use the package's types, or add a `declare module "@expo/material-symbols/*.xml"` in a `.d.ts` if it has none. Check that Metro resolves the import (the `assetExts` in `metro.config.js`, if the project has one).
- `src/services/courses.ts`: add `level` to the details select, `DetailsRow` and `CourseDetails` (reuse `isCourseLevel`).
- Create `src/lib/course-level.ts` with `levelLabel(level)` and `LEVEL_LABELS`. Move the labels out of `explore/filters.ts`, where `LEVEL_OPTIONS` reuses them.
- **Done when:** tsc passes and Explore still shows levels.

### 2. Share message (`src/lib/share-course.ts`)
- `APP_SCHEME`, `courseLink(id)`, and `courseShareMessage(course)`, which returns `{ title, message }` in the format from Decisions. It uses `formatHoursMinutes`, `orderedLessons` (the lesson count) and `levelLabel`.
- `shareCourse(course)`, which calls `Share.share(...)` and swallows the user cancelling. On another failure it shows `toast.error("Couldn't share this course.")`.
- Pure aside from `Share`; no React.

### 3. Course page header (`src/screens/course/course-details-screen.tsx`)
- Render `<Stack.Screen options={{ headerTransparent: true, title: "", headerTintColor: color("white"), headerBackButtonDisplayMode: "minimal" }} />` on native, and keep `headerShown: false` on web.
- When `course.data` exists on native, render `<Stack.Toolbar placement="right"><Stack.Toolbar.Button icon={EXPO_OS === "ios" ? "square.and.arrow.up" : ShareIcon} accessibilityLabel="Share course" onPress={() => shareCourse(course.data)} /></Stack.Toolbar>`.
- Keep the floating glass header (back + share) on web only, with its share button calling `shareCourse` too.
- **Hero:** add a top gradient over the photo for icon contrast. It's absolute, `top-0` with the header's height (safe area + 56), using RN `backgroundImage: linear-gradient(to bottom, <video-shade token>, transparent)` through `color()`. No new token unless the existing `video-shade` / `veil-dark` doesn't fit; if one is needed, add it to `tailwind.config.js` with a comment.
- Remove the `Share` import and the now-unused `goBack` / `useTopPadding` on native paths. Keep whatever the web header needs.

### 4. Deep links land over the tabs
- `src/app/(app)/_layout.tsx`: `export const unstable_settings = { anchor: "(tabs)" };` (Expo Router "Settings" docs).

## Verification
- `NODE_OPTIONS=--max-old-space-size=2048 npx tsc --noEmit` and `npx expo lint` pass.
- **Samsung (Android dev build, Argent):**
  - Open React Native Basics from Explore. A see-through header shows the white back arrow and the share icon over the photo; both are readable, and there's no white bar.
  - Tap Share: Android's share sheet opens with the message from Decisions. Check the text with "Copy" on the sheet, or by sharing to a notes app if it doesn't send anything; never send it to anyone.
  - Back returns to Explore.
  - Scroll the page: the icons stay readable over the dark content.
  - Run `adb shell am start -a android.intent.action.VIEW -d "syllo://course/<React Native Basics id>"`: the course opens, and Back goes to Home.
  - Pharmacy Exam Prep (no lessons, quizzes only): "0 lessons" and "0m" are left out of the message.
- **Lesson player, quiz screens and tabs:** unchanged, with no native header.
- **iOS:** not testable here (no Mac). It's listed as untested.

## AGENTS.md updates
- **Expo → Flow:** Course details shares through a native header `Stack.Toolbar` (prompts/14) with a transparent header and the native back button on iOS/Android, and the frosted buttons on web. The share text comes from `src/lib/share-course.ts` with a `syllo://course/<id>` link (no https link until the web app is deployed). `(app)` has `unstable_settings.anchor = "(tabs)"` for deep links.
- **Expo:** native header toolbar icons are SF Symbols on iOS and `@expo/material-symbols` on Android, chosen with `process.env.EXPO_OS`.
- **Data model:** `CourseDetails.level`.

## Result
- **Built as planned:**
  - `@expo/material-symbols` 0.1.1. Expo's Metro config already treats `.xml` as an asset, and the package ships a `.d.ts` per icon.
  - `CourseDetails.level`.
  - `src/lib/course-level.ts`, shared with Explore.
  - `src/lib/share-course.ts`.
  - The course page's native header: transparent, white tint, minimal back, `Stack.Toolbar` Share button, top `scrim` gradient on the photo. Web keeps the glass buttons.
- **Changed from the plan:**
  - **Header background on scroll:** with a see-through header, the course title scrolled under the back arrow. Once the page scrolls past the photo (`HERO_HEIGHT` 260 − safe area − 56), the header gets `headerStyle.backgroundColor` = `surface`; it's transparent again above that. The state only changes when crossing that point.
  - **Anchor name:** `unstable_settings = { anchor: "(tabs)" }`, since the Expo Router "Settings" docs deprecate `initialRouteName`.
- **Verified on the Samsung (Android dev build):**
  - The see-through header shows the white back arrow and share icon over the photo.
  - The Share button opens Android's share sheet. Its preview read "Advanced Mobile Animations / by Maya Okafor · Advanced · 1h 59m · 9 lessons / …description… / Open it in Syllo: syllo://course/5c6351b9-…". It was closed without sending.
  - Pharmacy Exam Prep leaves out "0m" and "0 lessons", and its description is cut with "…".
  - Back returns to Explore. Past the photo, the header turns `surface`.
  - `syllo://course/<id>` sent while the app is running opens the course, and Back goes Home.
  - The lesson player is unchanged (its own header).
  - tsc and lint pass.
- **Notes:**
  - The Android icon is a Metro asset, so in development it can appear a moment after the screen opens (seen once, on the first open). A release build bundles it.
  - **Not verified:**
    - A cold start from a link. The development build's launcher used up the link and opened Home; a store build doesn't have the launcher.
    - iOS (no Mac).
    - Web (Metro crashes on web renders on this PC).

