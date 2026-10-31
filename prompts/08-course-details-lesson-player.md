# 08 · Course details and lesson player

Status: done (visual check pending)

## Goal
A learner taps a course anywhere in the app, sees its details and curriculum from `course_details.html`, enrolls for free, and watches lessons in the `lesson_player.html` player. In the player they mark lessons completed, and that progress feeds Home. Every image the app shows is bundled in `assets/`.

## Decisions
- **Images (user: all bundled):** every image the app shows ships in `assets/images/`.
  - **Prototype photos** (into `assets/images/prototype/`):
    - `dashboard-card-coding.png` (bda88216), `dashboard-card-studio.png` (3b519c30), `explore-workspace.png` (5b1a1d95), `explore-network.png` (e3677f1b), `details-hero.png` (468b0f74), `details-tutor.png` (97fc7324), `lesson-screencast.png` (224608e4) and `dashboard-avatar.png` (22c7cf9e).
    - The two that no course uses (the studio photo and the dashboard avatar) are kept for later course art but never `require`d, so they aren't bundled.
  - **Course covers** (`assets/images/courses/<slug>.png`):
    - The prototype photo where one fits: react-native-basics ← coding, ui-design-fundamentals ← workspace, data-analysis-pandas ← network, advanced-animations ← glass panels (details hero), design-systems ← screencast.
    - Otherwise the course's current seeded picsum image: python-for-everyone and pharmacy-exam-prep.
  - **Tutor photos** (`assets/images/tutors/<key>.png`): leo ← the prototype tutor portrait; maya, aisha and pharmacy ← their seeded picsum images.
  - **How the app picks them:** `src/lib/local-images.ts` maps course slug → cover and tutor id → photo (with `require`). `courseCover(card)` and `tutorPhoto(tutor)` return the local file, and fall back to the database URL only for courses added later. The services add `slug` and the tutor `id` to their selects. Images over 1024 px are downscaled; tutor photos go to 192 px.
- **Enrolling (user: free for now):**
  - The footer shows "Full Access" (12 muted) over "Free" (24 bold), with no strikethrough price or "Save 60%" (the design's one-off price doesn't apply).
  - "Enroll in Course" inserts the enrollment, shows `toast.success("You're enrolled!")` and opens the first lesson, as the design's button does.
  - Once enrolled, the button reads "Continue Learning" and opens the first incomplete lesson.
  - Pro gating comes in a later plan.
- **Progress (user: lesson_progress now):**
  - A migration adds `lesson_progress (user_id text default jwt sub → profiles on delete cascade, lesson_id uuid → lessons on delete cascade, completed_at timestamptz default now(), primary key (user_id, lesson_id))`.
  - RLS: a learner reads, inserts and deletes only their own rows. Inserting needs the lesson to be a preview lesson or in a course they're enrolled in.
  - Index on `lesson_id`. Grants `select, insert, delete` to `authenticated`.
  - Home's sample numbers become real, and only the ratings stay placeholders:
    - Hero progress: completed / lessons in the latest enrollment.
    - "Lessons Done": all completed lessons.
    - "Certificates": enrolled courses with every lesson completed.
    - Streak: consecutive days, ending today or yesterday on the device's calendar, with at least one completion.
- **Student count:** "1,240 students" uses the real enrollment count. Learners can only read their own enrollments, so the same migration adds `public.course_student_count(p_course_id uuid) returns int`, a SECURITY INVOKER wrapper around a `private.` SECURITY DEFINER function, following the quiz RPC pattern. It returns only a number, and only for published courses.
- **Player (user: expo-video + our own markdown):**
  - `npx expo install expo-video`; it works in Expo Go. `useVideoPlayer(video_url)` drives a `VideoView` with `nativeControls={false}` and the design's own controls:
    - The centred 64 glass play/pause button.
    - "mm:ss / mm:ss" plus the maximize icon, which calls `enterFullscreen()`.
    - A `ProgressBar sm` on `veil-strong` over the `video-shade` gradient.
    - The back button (`IconButton glass-dark`).
  - Before playback the course cover shows at 80% opacity, as the HTML's image does.
  - `src/screens/lesson/markdown.tsx` renders `#`/`##`/`###`, paragraphs, `-` and `1.` lists and `**bold**`/`*italic*` with the design's text styles. The body's first `## <lesson title>` line is skipped, since the title is already shown.
- **Locked lessons:** a lesson is locked when the learner isn't enrolled and it isn't a preview. The curriculum shows the `Lock` icon in `faint` (gray-300), and tapping it shows `toast.info("Enroll to unlock", "Enrolling is free.")`. Lessons you can watch drop the lock; completed ones show a `CircleCheck` in `success` (estimated). Opening a locked lesson by URL shows an "Enroll to watch this lesson" state with a button back to the course.
- **Curriculum:**
  - Chapters are an accordion: the first is open, and tapping a header toggles it. An open header is `bg-subtle` with `ChevronUp`; a closed one is `bg-surface` with `ChevronDown`.
  - Lesson rows show the play tile, title, and `mm:ss` from `duration_seconds`.
  - A chapter's quiz shows as a last row ("Chapter quiz", `ListChecks` icon) that opens the "Coming soon" toast. The quiz player gets its own plan.
  - The heading reads "Curriculum" with "{n} Chapters".
- **Placeholders kept:** rating "4.9 (2.4k)" (`placeholderRating`, plus a fixed "(2.4k)"). "Follow" shows `featureComingSoon("Following tutors")`. The lesson's resource card (`Typography_Scale.fig`) is left out, since lessons have no files. "Resources included" shows only when the lesson has a body.
- **Share:** RN `Share.share({ message: "<title> on Syllo" })`, with no link until the app has a public URL.
- **Navigation:**
  - Routes `src/app/(app)/course/[id].tsx` and `src/app/(app)/lesson/[id].tsx`, pushed over the tabs. Ids are UUIDs, not personal data.
  - Course taps on Home and Explore open `/course/[id]`.
  - Home's "Resume Lesson" opens the next incomplete lesson of the latest enrollment. Its fallback, "Start Learning", opens the course.
  - Previous and Next Lesson walk the course's lessons in chapter and lesson order, crossing chapters. Each is disabled at its end, and Next on the last lesson reads "Finish Course" and returns to the course page (estimated).
  - "Mark as Completed" toggles the lesson. The completed state is estimated as `border-primary bg-primary-tint` with `CircleCheck primary` and the label "Completed".
- **Badges:** "Chapter 01" and "Lesson 04" use the chapter's and the lesson's positions, padded to 2 digits.

## Out of scope
- Pro gating, the quiz player, My Courses (still an empty state), tutor follows, lesson resources, video download for offline use, and course ratings.

## Steps
### 1. Images
- Download the 8 prototype photos and the 6 remaining picsum images (python and pharmacy covers; maya, aisha and pharmacy tutors), downscale them, and save them as listed.
- Add `src/lib/local-images.ts`.
- Add `slug` and tutor `id` to the course card select. Home and Explore cards use `courseCover`.

### 2. Migration
- `lesson_progress` and `course_student_count` as decided. Then `db:push`, `db:types`, and the advisors (no new warnings).

### 3. Services and hooks
- **Courses:**
  - `getCourseDetails(supabase, id, signal)`: the course, description, tutor (id, name, headline, avatar_url), chapters ordered with their lessons (id, title, position, duration_seconds, is_preview) and quizzes (id, title), plus whether you're enrolled.
  - `getStudentCount` (the RPC).
- **Lessons:** `getLesson(supabase, id, signal)`: the lesson, its chapter position, its course id and title, and its content (null when locked).
- **Enrollments:** `enroll(supabase, courseId)`.
- **Progress:** `getProgress(supabase, signal)` returns all your rows (lesson id, completed_at). Also `setLessonCompleted(supabase, lessonId, done)`, which inserts or deletes.
- **Hooks:** `useCourseDetails`, `useStudentCount`, `useLesson`, `useEnroll` (invalidates enrollments and the course), `useProgress`, `useSetLessonCompleted` (optimistic, invalidates progress).
- **Stats:** `useLearningStats`, which derives progress, lessons done, certificates and streak from `useProgress` and the enrolled courses' outlines (`getEnrolledOutlines`).
- Keys under `courses`, `lessons`, `enrollments` and `progress`.

### 4. Course details screen (`src/screens/course/`)
Translated class by class from `course_details.html` (white background):
- **Floating header:** `absolute`, top 48 or the safe area, `px-screen`, with the back (`ChevronLeft`) and share (`Share2`) `IconButton glass`.
- **Hero:** 260 cover with `Fade to="surface" via={50}`.
- **Info card:** `px-screen -mt-10`, `p-6 rounded-2xl border shadow-card mb-8`.
  - Title in `title-lg` (24, tight), `mb-4`.
  - Meta row, `flex-wrap gap-x-4 gap-y-3`: Star (primary) with "4.9" (14 bold ink) and "(2.4k)" (14 muted); Clock with `formatHoursMinutes`; `LayoutTemplate` with "{n} Lessons".
- **About this course:** `heading mb-3` and `body`.
- **The Tutor:** a card `p-4 border rounded-2xl bg-subtle` with the tutor photo (`Avatar md`), name (16 bold), headline (13 muted) and a "Follow" `Button outline-primary`.
- **Curriculum:** as decided.
- **Footer:** `StickyFooter`: "Full Access" / "Free" with an `mb-4` row, then "Enroll in Course" (`primary-bold`, loading while enrolling) or "Continue Learning".
- **States:** loading, error with "Try again", and "This course isn't available." when RLS returns nothing.

### 5. Lesson player screen (`src/screens/lesson/`)
Translated from `lesson_player.html` (white background):
- **Video:** `aspect-video bg-black` with the controls as decided.
- **Content:** `ScrollView px-screen pt-8`.
  - The two badges (`Badge pill` "Chapter 01" plus "Lesson 04" in `badge` muted), `mb-3`.
  - The title in `title-lg mb-4`.
  - Meta row, `py-4 border-y gap-6`: Users "{n} students" and FileText "Resources included", in 13 muted.
  - "Description" (`heading mb-3`), then the markdown.
- **Footer:** `bg-surface border-t px-screen pt-6` with bottom 40 or the safe area.
  - "Mark as Completed" (`flex-1 border py-3 rounded-xl`, `Circle` 20, 15 semibold), `mb-4`.
  - A row with `gap-4`: "Previous" (`Button outline` + `ArrowLeft`) and "Next Lesson" (`primary-bold` with `ArrowRight` trailing, `py-3.5`).
- Leaving the screen pauses the video. Playback errors show "Couldn't play this video." over the black area.

### 6. Wire-up
- Home and Explore taps go to the course; "Resume Lesson" and the stats use real progress, and `placeholder-stats.ts` keeps only the ratings.
- `/design-system` shows `Fade` over a bundled cover.
- Update AGENTS.md.

## Verification
- `npx tsc --noEmit` and `npx expo lint` pass. The advisors show no new warnings after the migration.
- **On web at 393×852** (if memory and the Chrome extension allow): `/course/<id>` and `/lesson/<id>` next to their HTML.
- **Flow (Expo Go):**
  1. Explore → a course: the details, tutor and curriculum appear, with locks on non-preview lessons.
  2. Tap a locked lesson: the toast appears. A preview lesson plays.
  3. Enroll: the toast appears, the first lesson opens, the video plays and pauses, and fullscreen works.
  4. Mark as Completed, then Next Lesson, across a chapter boundary.
  5. Back to the course: completed checks show, and the button reads "Continue Learning".
  6. Home: the hero shows the real %, Lessons Done counts up, and the streak is 1.
  7. Complete every lesson of a course: Certificates goes up by 1.
- **Data:** `lesson_progress` rows exist only for your user (Supabase MCP). Un-marking deletes the row.
- **Images:** the network panel (web) or an offline launch shows covers and tutor photos with no picsum requests.

## AGENTS.md updates
- **Routes:** `(app)` also holds `course/[id]` and `lesson/[id]`.
- **Data model:** `lesson_progress`, `course_student_count`; enrolling is free.
- **Images rule:** every image the app shows is bundled (`src/lib/local-images.ts`); database URLs are a fallback only.
- **Player:** expo-video and the in-house markdown renderer.
- Replace the placeholder note: only ratings stay placeholders.

## Result
- **Built as planned:** `/course/[id]` and `/lesson/[id]`. Home and Explore cards open the course; "Resume Lesson" opens the next incomplete lesson.
- **Migrations:**
  - `20261031084311_lesson_progress`: the table, RLS and `course_student_count`.
  - `20261031084355_lesson_progress_initplan`: rewraps `auth.jwt()` in the form the performance advisor wants.
  - Advisors: no security findings, and only "unused index" INFO notices remain.
- **RLS check** (SQL in a rolled-back transaction, signed in as the test user): completing a preview lesson succeeds; a locked lesson is refused with "new row violates row-level security policy".
- **Images:** 8 prototype photos are in `assets/images/prototype/`.
  - 5 of them became covers in `courses/*.jpg` (800 px JPEG, 34–67 KB).
  - The details portrait became `tutors/leo.png` (192 px).
  - The picsum images for python, pharmacy, maya, aisha and pharmacy-tutor are bundled as JPEGs.
  - Everything is mapped in `src/lib/local-images.ts`.
- **Dependency:** `expo-video` ~58.0.13 (config plugin added).
- **Estimated values (not in the HTML):**
  - The "Completed" state (primary border on primary-tint, CircleCheck).
  - "Finish Course" on the last lesson.
  - The completed tick in the curriculum, and the quiz rows.
  - The locked-lesson state.
  - The "Free" price line.
  - The pause icon.
  - Badge padding `px-2` (the HTML's `px-2 py-1`).
- **Left out:** the resource file card (no data), and the rating "(2.4k)", which stays a fixed placeholder.
- **Not verified:**
  - The web comparison: the Chrome extension isn't connected, and dev bundling runs out of memory on this PC.
  - Playback in Expo Go.
