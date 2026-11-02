# 13 · Explore filters

Status: done

## Goal
On Explore, the sliders button opens a **Filters** sheet. There the learner can sort the feed and narrow it by category, level and course length. The button shows how many filters are on, and each card shows the course's level.

## Decisions
- **Not in the design or the tutorial.** The prototype (`course_search_feed.html`) has only the sliders button (`#filter-button_003`). Plan 07 listed "The Explore filter sheet" as not built. The tutorial's Notion page can't be read by tools. So the sheet is built from the design's tokens in its language, like Settings, and its values are estimated.
- **Filters (user decision):**
  - Sort order: A–Z, Newest, Shortest first, Longest first.
  - Category: multi-select in the sheet.
  - Level: Beginner / Intermediate / Advanced, multi-select.
  - Duration: Any, Under 1 hour, 1–2 hours, Over 2 hours (single choice).
- **Applying (user decision):** choices are a draft until "Show N courses". "Reset" clears the draft, and closing the sheet any other way throws the draft away.
- **Card level (user decision):** each Explore card shows the level in its meta row: a `ChartNoAxesColumnIncreasing` icon 14 + "Beginner" in `caption` muted, after the tutor and duration.
- **No schema change:**
  - `courses.level` (check `beginner|intermediate|advanced`) and `category` exist.
  - Duration is the sum of lesson `duration_seconds`, already computed in `toCard`.
  - Newest uses `courses.created_at`.
- **Duration buckets:** chosen to fit the current catalogue, which runs 0–2.2 hours. Under 1h is `< 3600`s, 1–2h is `3600–7200`, over 2h is `> 7200`. Pharmacy Exam Prep (quizzes only, 0h) counts as Under 1 hour.
- **Where filtering runs:**
  - In the database: search (`ilike`), categories (`.in("category")`), levels (`.in("level")`), and sorting by title or `created_at`. Newest has a title tiebreak.
  - In the service, after `toCard`: the duration filter and duration sorting. The duration is computed from lessons, so the database can't do it without a view or RPC. That's fine at this catalogue size.
  - All of it stays in `getCourseFeed`, so the screen never filters data itself (data-fetching rule).
- **One category state for the chips and the sheet:** `categories: string[]`.
  - Empty means "All Courses".
  - Tapping a chip in the row selects only that category, as now. Tapping "All Courses" clears it.
  - The sheet can pick several. Every selected category shows as selected in the row.
- **"Show N courses"** counts live while the sheet is open. It runs the same `useCourseFeed` hook with the draft filters (cached, `keepPreviousData`). With 0 matches the button reads "No courses match" and is disabled.
- **The filter count badge** counts every active group: category (any selected), level (any), duration (not Any), and sort (not A–Z). It's a `bg-primary` circle, 18, at the button's top-right, with `text-11 font-bold text-on-primary`. It's added to `IconButton` as an optional `badge` prop.
- **Filters live in Explore's component state**, like the search and chips today. They aren't saved across app restarts.
- **Results line:** "Found N results" plus ` for "term"` when there's a search or exactly one category (as now). With other filters on, it adds " · Filtered".
- **Empty state with filters on:** "No courses match your filters." with a "Clear filters" link that resets everything except the search text.

## Out of scope
- Price, rating, tutor or language filters. Ratings are placeholders, and there are no prices.
- Saving filters between sessions.
- Filters on Home's "Recommended for you" or "See All".
- A database view or RPC for duration filtering (only needed if the catalogue grows large).

## Steps
### 1. Service, key and hook
- **`src/services/courses.ts`:**
  - Add `level: CourseLevel | null` to `CourseCard`, `level` to `CARD_COLUMNS` and `CardRow`, and map it in `toCard`.
  - Export `type CourseLevel = "beginner" | "intermediate" | "advanced"`, `type DurationFilter = "any" | "under-1h" | "1-2h" | "over-2h"` and `type CourseSort = "title" | "newest" | "shortest" | "longest"`.
  - Extend `CourseFeedFilter` to `{ search?; categories?: string[]; levels?: CourseLevel[]; duration?: DurationFilter; sort?: CourseSort }`. The single `category` field goes, because Explore is its only caller.
  - `getCourseFeed`:
    - Apply `.in("category", categories)` and `.in("level", levels)` when non-empty.
    - Order by `created_at desc, title` for newest, otherwise by `title`.
    - After mapping, filter by duration bucket, and stably sort by `durationSeconds` for shortest/longest.
    - Keep `.throwOnError()` and `abortSignal`.
  - Export a pure `matchesDuration(seconds, bucket)` helper beside it.
- **`src/lib/queries/keys.ts`:** `courses.feed(filter)` normalises the key to `{ search, categories (sorted), levels (sorted), duration ?? "any", sort ?? "title" }`, so the same filters share one cache entry.
- **`use-course-feed.ts`:** add an optional second argument `{ enabled?: boolean }` for the sheet's live count. Export the new types from `courses/index.ts`.
- **Done when:** tsc passes and Explore still loads with no filters.

### 2. Filter model (`src/screens/explore/filters.ts`)
- `ExploreFilters = { categories: string[]; levels: CourseLevel[]; duration: DurationFilter; sort: CourseSort }`.
- `EMPTY_FILTERS`.
- `activeFilterCount(f)`, counting groups as in Decisions.
- The option lists with labels:
  - `SORT_OPTIONS`: A–Z, Newest, Shortest first, Longest first.
  - `LEVEL_OPTIONS`: Beginner, Intermediate, Advanced.
  - `DURATION_OPTIONS`: Any length, Under 1 hour, 1–2 hours, Over 2 hours.
- `levelLabel(level)`.
- A `toggle(list, value)` helper.
- Pure TypeScript, no React.

### 3. `IconButton` badge
- Optional `badge?: number` prop. When > 0, draw the count circle (absolute, `-top-1 -right-1`, `min-w-[18px] h-[18px] px-1 rounded-full bg-primary items-center justify-center`, plus a `border-2 border-surface` ring) with the number in `text-11 font-bold text-on-primary`.
- Add `accessibilityValue={{ text: "N active" }}`. The Explore button label becomes "Filters, N active" when it's on.
- Preview it on `/design-system` beside the existing filter button.

### 4. Filter sheet (`src/screens/explore/filter-sheet.tsx`)
- `FilterSheet({ visible, applied, categories, search, onApply, onClose })`, built on `Sheet` with the title "Filters".
- It holds a draft copied from `applied` each time it opens.
- Four sections, `gap-6`. Each has a heading (`text-16 font-semibold text-ink`, `mb-3`) and a wrapping row of `Chip`s (`flex-row flex-wrap gap-2`). `Chip` already has the selected state.
  1. **Sort by:** single choice.
  2. **Category:** multi, from `useCategories()` data passed in.
  3. **Level:** multi.
  4. **Duration:** single.
- **Footer**, `flex-row gap-3`:
  - `Button variant="outline"` "Reset" (`flex-1`), which sets the draft to `EMPTY_FILTERS`. It's disabled when the draft is already empty.
  - `Button` "Show N courses" (`flex-[2]`), using `useCourseFeed({ search, ...draft }, { enabled: visible })`.
    - While the count loads, the button shows `loading`.
    - When it fails, the button reads "Show results" and still applies.
    - With 0 matches, it reads "No courses match" and is disabled.
- **Chip accessibility:** sort and duration chips get `accessibilityRole="radio"`; categories and levels keep `button` with the selected state. This adds an optional `role` prop to `Chip`.

### 5. Wire Explore (`explore-screen.tsx`, `feed-item.tsx`)
- Replace `category` state with `filters: ExploreFilters` (plus `sheetOpen`).
- **Chip row:** "All Courses" is selected when `categories` is empty. A chip is selected when its category is included, and tapping it sets `categories: [name]`.
- `useCourseFeed({ search, ...filters })`.
- The sliders button opens the sheet, shows `badge={activeFilterCount(filters)}`, and `featureComingSoon("Filters")` goes.
- Results line and empty state as in Decisions.
- `FeedItem` adds the level meta item when `course.level` is set.
- Check that `featureComingSoon` is still used elsewhere (bell, Follow) before leaving the import.

## Verification
- `NODE_OPTIONS=--max-old-space-size=2048 npx tsc --noEmit` and `npx expo lint` pass.
- **Web** at 393×852 (`http://127.0.0.1:8081/explore` in Chrome): the sheet opens, its sections wrap cleanly, the footer is pinned, and the badge sits on the button corner. Compare it with the design's language (Settings sheet, chips) and list the estimated values.
- **Samsung (Argent, dev build)**, starting from Explore with no filters (7 courses):
  - Level → Beginner: "Show 3 courses". Apply → 3 cards (UI Design Fundamentals, React Native Basics, Python for Everyone). The badge shows 1, and each card reads "Beginner".
  - Add Duration → Under 1 hour: "No courses match", disabled.
  - Reset → "Show 7 courses".
  - Category → Design + Data: the row highlights both chips, and the feed shows 3 courses.
  - Sort → Longest first: Data Analysis with pandas is first, Pharmacy Exam Prep last.
  - Newest: all seeds share one date, so the order stays A–Z.
  - Change the draft, then close with X or the backdrop: nothing applied.
  - Search "design" with Level → Intermediate → Design Systems in Practice only, and the results line reads `Found 1 result for "design" · Filtered`.
  - Filters that match nothing → "No courses match your filters." → "Clear filters" restores the feed and keeps the search.
  - Tapping a chip in the row after picking several categories in the sheet selects just that one.
  - Pull to refresh still works. Turning off the network shows the error state with "Try again".

## AGENTS.md updates
- **Expo → Flow:** replace "The bell, filter and Follow show a 'Coming soon' toast" with "The bell and Follow show a 'Coming soon' toast". Add one line on Explore filters (prompts/13): the sheet with sort, category (multi), level and duration; draft until "Show N courses"; filtering in `getCourseFeed` (duration in the service, since it's derived from lessons); and the count badge on `IconButton`.
- **Design system:** add `IconButton`'s `badge` and `Chip`'s `role` to the catalogue in `.claude/rules/design-system.md` (and its `.cursor` mirror).

## Result
- **Built as planned:**
  - Service, key and hook: `getCourseFeed` takes `categories`, `levels`, `duration` and `sort`; the key is normalised; `useCourseFeed(filter, { enabled })`.
  - Filter model: `src/screens/explore/filters.ts`.
  - The sheet: `filter-sheet.tsx`.
  - Explore wiring, and the level on cards.
  - `IconButton` `badge` and `Chip` `role`.
- **Changes during the build:**
  - The footer's wide button uses `style={{ flex: 2 }}`, because twrnc can't parse `flex-[2]` (it logged "`[2]` unknown or invalid utility").
  - The badge count goes into the button's label ("Filters, 1 active"), not `accessibilityValue`. Android kept the old value once the prop was removed.
  - The Explore feed got `keyboardShouldPersistTaps="handled"`. Before, the first tap on "Clear filters" with the keyboard open only closed the keyboard.
  - **User request:** `Sheet` pads `insets.bottom + 16` (was `max(insets.bottom, 12)`), so footer buttons no longer sit on Android's navigation bar. This applies to every sheet, including Settings.
- **Estimated values (no design):**
  - Section headings `text-16 font-semibold`, `mb-3`; sections `gap-6`; chips wrap with `gap-2`.
  - Footer: Reset `flex-1`, Show `flex: 2`.
  - Badge: 18 circle, `-top-1 -right-1`, `border-2 border-surface`, `text-11 bold`.
  - Card level: `ChartNoAxesColumnIncreasing` 14 + `caption`.
- **Verified on the Samsung (Android dev build):**
  - Beginner → "Show 3 courses" → 3 cards, badge 1, "· Filtered".
  - Beginner + Under 1 hour → "No courses match", disabled.
  - Design + Data + Longest first → both chips highlighted, pandas (2h 12m) first.
  - A chip-row tap keeps only that category.
  - Closing with X throws the draft away.
  - The search "pandas" with Design → "No courses match your filters." → "Clear filters" keeps the search.
  - Reset → "Show 7 courses", and the label goes back to "Filters".
  - tsc and lint pass.
- **Not verified:**
  - Web preview: Metro crashes (exit 127) while rendering a web page on this low-memory PC.
  - The network-off error state: I didn't toggle the phone's Wi-Fi.
  - Newest: all seed courses share one date, so it can't be told apart from A–Z.
- **Unexplained:** the sheet opened twice right after tapping the "Design" chip in the row. It didn't happen again in three exact repeats.

