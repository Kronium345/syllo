# 24 · Course cover upload (tutor)

Status: done

## Goal
In the course editor a tutor uploads, replaces or removes their course's cover image. The cover shows everywhere a course appears (Home, Explore, course details, the lesson player's poster, the tutor dashboard), loaded through short-lived signed links from the private R2 bucket.

## Decisions
- **Storage (user decision): the private R2 bucket with signed links**, like lesson videos. Key `uploads/<course_id>/cover-<12 hex>.jpg|png`, at most **5 MB**, JPEG or PNG. Stored in a new column **`courses.cover_key`** (nullable). `cover_image_url` stays for outside links.
- **Where (user decision): the course editor only.** A "Cover image" section at the top of Edit course: a 16:9 preview (or the plain `bg-track` placeholder), "Upload cover" / "Replace cover" (expo-image-picker, `mediaTypes: ["images"]`, `allowsEditing` with `aspect: [16, 9]`, `quality: 0.8`), a progress bar while uploading, and "Remove cover" (confirm). New course is unchanged.
- **Which cover wins:** an uploaded cover (`cover_key`) beats the bundled file for seeded slugs, which beats `cover_image_url`. So a tutor can change a seeded course's cover too.
- **Signing reads:** a new Edge Function **`course-cover`** (`verify_jwt = false`, Clerk JWKS) takes `{ courseId }`, reads `courses.cover_key` **as the user** (RLS: published, or the tutor's own draft) and returns `{ url, expiresAt }` (GET signed for 1 hour) or 404. One call per course shown (user accepted the extra calls); the app caches each link for 50 minutes and gives `expo-image` a `cacheKey` of the R2 key, so the picture itself is cached across link renewals.
- **Signing uploads and deletes:** `lesson-upload` gains a course-level kind: `{ action: "sign", courseId, kind: "cover", mimeType, sizeBytes }` and `{ action: "delete", courseId, key }`, checked with a new RPC **`can_edit_course(p_course_id)`** called as the user; keys must start with `uploads/<course_id>/cover-`. Old covers are deleted after a replace or remove (same best-effort cleanup as lesson files).
- **Database (migration `course_covers`):** `courses.cover_key text`; `public.can_edit_course` (wraps `private.owns_course`); RPCs `set_course_cover(p_course_id, p_key)` → the previous key (key checked against `^uploads/<course_id>/cover-[0-9a-f]{12}\.(jpg|png)$`, `22023` otherwise) and `remove_course_cover(p_course_id)` → the previous key; both `42501` for non-owners. Definer in `private`, invoker wrappers, `authenticated` only.
- **App data:** `cover_key` added to the course queries that feed covers (`CARD_COLUMNS`, `getCourseDetails`, `getMyCourses`, `getTutorCourse`) as `coverKey`; service `getCourseCoverUrl(supabase, courseId)` (`src/services/courses.ts`); hook `useCourseCoverUrl` (key `queryKeys.courses.cover(courseId, coverKey)`, 50 min stale, only when `coverKey` is set); hook **`useCourseCover(course)`** returning the `ImageSource` to draw (uploaded → bundled → URL → null) used by the six places that call `courseCover()` today (`feed-item`, `recommended-card`, `enrolled-course-card`, `course-details-screen`, `lesson-screen` poster, `tutor-course-card`). While a signed link loads, cards show their existing `bg-track` placeholder.
- **Upload flow (service):** `uploadCourseCover(supabase, { courseId, file, onProgress })` = sign → PUT (`File.upload`) → `set_course_cover` → delete the old cover; `removeCourseCoverFile` = RPC → delete. Hooks `useUploadCourseCover`, `useRemoveCourseCover` invalidate `courses.all`.
- **Errors:** wrong type or too big is caught before upload with a toast; others via `reportTutorFailure`.

## Out of scope
Cover on the New course form; cropping beyond the picker's own editor; image compression beyond `quality: 0.8`; cleaning covers of deleted courses (same follow-up as lesson files); web upload.

## Steps
1. Migration `course_covers`; `db:push`, `db:types`, advisors.
2. Edge Functions: extend `lesson-upload` (course kind), add `course-cover` + `config.toml`; deploy both.
3. Services, keys, hooks (`useCourseCover`, `useCourseCoverUrl`, `useUploadCourseCover`, `useRemoveCourseCover`).
4. `src/screens/tutor/course-cover-section.tsx` in the course editor; swap the six `courseCover()` call sites to `useCourseCover`.

## Verification
- `tsc`, `expo lint`, advisors.
- SQL (rolled back): owner sets and replaces a cover (old key returned), a key outside the prefix → 22023, another tutor → 42501, `can_edit_course` true/false.
- Phone: upload a cover for the test course (progress, preview), see it on the tutor dashboard; replace it (old R2 file gone); remove it (placeholder back). Also finish plan 23's remaining checks (resource add/delete after the name fix, preview switch, replace/remove video, delete lesson) and the Delete-button spacing.

## AGENTS.md updates
- Lesson videos/uploads: covers in R2 under `uploads/<course>/cover-…`, `course-cover` function, `lesson-upload` course kind.
- Data model: `courses.cover_key`, `can_edit_course`, cover RPCs; cover precedence (uploaded → bundled → URL) in the Rules bullet about bundled images.

## Result
- **Migration** `20261106111753_course_covers.sql` (column `courses.cover_key`, `can_edit_course`, `set_course_cover`/`remove_course_cover`); types regenerated; advisors: security clean, performance only the existing unused-index notices. SQL (rolled back): first set returned null, a replace returned the old key, `clips/x.jpg` → `22023`, remove returned the key, another tutor got `can_edit_course = false` and `42501`.
- **Functions:** `lesson-upload` gained the `cover` kind (`{ courseId, kind: "cover" }`, JPEG/PNG ≤ 5 MB, key `uploads/<course>/cover-<12 hex>.<ext>`, `can_edit_course` as the user) and course-level deletes; new `course-cover` returns a 1-hour signed GET for `courses.cover_key` read as the user (404 without one). Both deployed.
- **App:** `cover_key` → `coverKey` in the card, details, dashboard and editor queries; `getCourseCoverUrl` (courses.ts); `useCourseCoverUrl` (key `courses.cover(id, coverKey)`, 50 min stale) and `useCourseCover` (uploaded → bundled → URL) now used by all six cover sites; `uploadCourseCover`/`removeCourseCoverFile` (lesson-uploads.ts), `setCourseCover`/`removeCourseCover` (tutor.ts), hooks `useUploadCourseCover`/`useRemoveCourseCover`; `course-cover-section.tsx` at the top of Edit course.
- **Bug found on the phone and fixed:** the first upload reached 100% then failed: the picker's `fileSize` described the image before cropping, and the PUT link only accepts the exact signed size. Both video and cover uploads now use `fileSize(uri)` (the file on disk).
- **Phone (Samsung):** a 1280×720 test JPEG went through the 16:9 crop, uploaded and showed in the editor and on the dashboard card; Replace deleted the previous cover in R2 (listing showed one cover); Remove (confirm) brought back the placeholder and deleted the file.
- **Also in this round (user request):** the tutor dashboard, course editor and lesson editor scroll views pad the bottom by the safe-area inset + 40, so the Delete buttons clear Android's navigation bar (checked on the phone).
- **Estimated values (no design):** cover preview 16:9 `rounded-xl` on `bg-track` with an `ImagePlus` placeholder icon (`2xl`).
