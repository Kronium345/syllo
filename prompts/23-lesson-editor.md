# 23 · Lesson editor (tutor)

Status: done

## Goal
On `/tutor/course/[id]/lesson/[lessonId]` a tutor edits a lesson: title, free-preview switch, markdown notes (with a preview exactly as learners see them), the video (uploaded from the phone to R2), downloadable resources (PDF, CSV, TXT, PNG, JPG, ZIP), and can delete the lesson.

## Decisions
- **Video (user decision):** uploaded from the phone. `expo-image-picker` (installed) picks one video (`mediaTypes: ["videos"]`, MP4/MOV, at most **500 MB**); its `duration` (ms) becomes `lessons.duration_seconds`. The app asks the new Edge Function **`lesson-upload`** for a signed R2 **PUT** link (1 hour), uploads the file straight to R2 with `expo-file-system`'s `new File(uri).upload(url, { httpMethod: "PUT", uploadType: BINARY_CONTENT, headers: { "Content-Type": mime }, onProgress })`, then saves it with the RPC `set_lesson_video`. A progress bar shows while uploading. Learners keep playing it through the existing `lesson-video` function.
- **Resources (user decision):** picked with `File.pickFileAsync({ mimeTypes })` from **`expo-file-system`** (already installed and built in). Changed while building: `expo-document-picker` was approved and installed first, then removed once the built-in picker was found, so no dependency is added and no development-build rebuild is needed. Allowed: PDF, CSV, TXT, PNG, JPG, ZIP, at most **25 MB** each; the tutor gives a title (defaults to the file name without extension). Same upload path, then the RPC `add_lesson_resource`. Each resource card has Delete (confirm). No credit line for tutor uploads (it's their own material).
- **R2 keys:** tutor uploads live under `uploads/<course_id>/<lesson_id>/` (`video-<12 hex>.<ext>`, `res-<12 hex>.<ext>`). The RPCs accept only keys under that lesson's own prefix, so a tutor can't point a lesson at someone else's file or the seeded clips.
- **Old files (user decision): deleted from R2.** Replacing a video or deleting a resource returns the old key from the RPC; the app then calls `lesson-upload` with `{ action: "delete", lessonId, key }`, which deletes it only if it starts with `uploads/<course>/<lesson>/` and the caller owns the course. Deleting a lesson (or chapter/course) still cascades in the database only; its R2 files under `uploads/` stay (noted as a follow-up).
- **`lesson-upload` Edge Function** (`verify_jwt = false`, Clerk JWKS like the others): `{ action: "sign", lessonId, kind: "video" | "resource", fileName, mimeType, sizeBytes }` → `{ url, key, expiresAt }` or `{ action: "delete", lessonId, key }` → `{ ok: true }`. It checks ownership by calling the RPC `can_edit_lesson(p_lesson_id)` **as the user** (the JWT carries the role), validates kind/mime/size, and signs the PUT with `aws4fetch` including `content-type` and `content-length` so R2 rejects a different file. Shared signing moves into `_shared/common.ts` (`signR2Put`, `deleteR2`). Deploy with `npx supabase functions deploy lesson-upload`.
- **Database (migration `lesson_editor`):**
  - `private.owns_lesson(p_lesson_id)` (via its chapter's course and `private.owns_course`); `public.can_edit_lesson(p_lesson_id)` returns it (invoker wrapper).
  - The SELECT policies on `lesson_contents` and `lesson_resources` become "… they can open or own" (`can_open_lesson(...) or private.owns_lesson(lesson_id)`), so the tutor reads drafts' content and the `lesson-video`/`lesson-resource` functions also work for the tutor's preview.
  - RPCs (definer in `private`, invoker wrappers, `authenticated` only, `42501` when not the owner, `22023` for bad input):
    - `update_lesson(p_lesson_id, p_title, p_body, p_is_preview)`: title 2–80, body ≤ 30,000 characters.
    - `set_lesson_video(p_lesson_id, p_key, p_duration_seconds)` → the previous `video_key` (or null): key must match the lesson's upload prefix and end in `.mp4`/`.mov`; duration 1–36,000; clears `video_url`.
    - `remove_lesson_video(p_lesson_id)` → the previous key: clears `video_key`/`video_url`, duration 0.
    - `add_lesson_resource(p_lesson_id, p_title, p_file_name, p_size_bytes, p_mime_type, p_key)` → id: title 2–80, size 1–25 MB, allowed mimes, key under the prefix; position = last + 1.
    - `delete_lesson_resource(p_resource_id)` → the deleted row's key (positions renumbered).
- **App data:** `getTutorLesson(supabase, userId, lessonId)` in `src/services/tutor.ts` (lesson + its chapter's course id, `lesson_contents` body/video_key/video_url, resources), hook `useTutorLesson` (key `queryKeys.courses.tutorLesson(lessonId, userId)`, under `courses` so outline changes refresh it); mutation hooks `useUpdateLesson`, `useUploadLessonVideo` (sign → upload with progress → `set_lesson_video` → delete old), `useRemoveLessonVideo`, `useAddLessonResource` (sign → upload → RPC), `useDeleteLessonResource` (RPC → delete file). Upload services live in `src/services/lesson-uploads.ts` (they call the Edge Function with the Clerk token, like `getLessonVideoUrl`). Existing `useDeleteLesson` deletes the lesson.
- **Screen** (`src/screens/tutor/edit-lesson-screen.tsx`, no design, from the tokens):
  - Header: Back, "Edit lesson", "Chapter 02 · Lesson 03" caption.
  - **Lesson:** Title field; "Free preview" switch row (RN `Switch` tinted with tokens, as in Settings) with "Anyone can open this lesson without enrolling."; Save (enabled when changed).
  - **Video:** none → "Upload video" (outline button); uploading → `ProgressBar` + "Uploading 42%…" (Cancel); uploaded → file status line ("Video uploaded · 12:34"), "Preview" (opens the lesson player route `/lesson/[id]`, which works for the owner after the policy change), "Replace video", "Remove video" (confirm).
  - **Notes:** Edit/Preview chips; Edit = multiline `TextField` (min 240px, mono not needed) + hint "Markdown: ## headings, - lists, **bold**, *italic*, `code`, ``` code blocks"; Preview = the lesson player's `Markdown` component. Saved with the same Save button as the title (one `update_lesson` call).
  - **Resources:** existing ones as `ResourceCard`-style rows (name, "1.4 MB • PDF") with Delete; "Add resource" → document picker → a `TitleSheet` for the title → upload with progress.
  - **Delete lesson:** danger button → `ConfirmSheet` → back to the course editor.
  - States: loading, error + "Try again", not found/not yours ("This lesson isn't available."). Leaving with unsaved notes/title: no prompt (out of scope); Save is visible near the top and bottom.
- **Errors:** `NotAllowedError` → "You're not allowed to change this lesson."; `22023` → the database's message; file too big or wrong type → caught before upload with a toast; upload failure → "Upload failed. Check your connection and try again."
- `.env`/secrets: none new (R2 secrets already set for the functions).

## Out of scope
Quiz editing, cover upload, video trimming/compression, resumable uploads, cleaning R2 files of deleted lessons/chapters/courses, reordering resources, unsaved-changes prompt, web upload (pickers on web are left as they behave; tested on Android).

## Steps
### 1. Dependency
None (see Resources).

### 2. Migration
`npx supabase migration new lesson_editor < /dev/null` with the functions and policy changes above; `db:push`, `db:types`, advisors.

### 3. Edge Function
`supabase/functions/lesson-upload/index.ts` + `config.toml` entry (`verify_jwt = false`) + shared `signR2Put`/`deleteR2`; deploy; test signing and deleting with curl-free checks (call it from the app, or `supabase functions invoke` is not available for Clerk tokens, so verify through the phone and the function logs).

### 4. Services and hooks
`src/services/tutor.ts` (lesson read + RPCs), `src/services/lesson-uploads.ts` (function calls + `File.upload`), keys, hooks.

### 5. Screen
`edit-lesson-screen.tsx` plus `lesson-video-section.tsx`, `lesson-resources-section.tsx`, `notes-editor.tsx` in `src/screens/tutor/`.

## Verification
- `tsc`, `expo lint`, advisors pass; `npx expo-doctor` happy with the new package.
- SQL (rolled back): the owner updates title/body/preview; a key outside the prefix or a `.exe` → `22023`; another tutor → `42501`; `set_lesson_video` returns the previous key; the owner reads a draft lesson's `lesson_contents`; a learner can't.
- Phone (after the dev build rebuild): rename a lesson and toggle preview, write notes and preview them, upload a short video (progress shows, duration appears in the outline), preview it in the player, replace it (old file gone from R2: checked with the R2 listing), add a PDF resource, delete it, delete the lesson. Test files and lessons are removed afterwards (asked first).

## AGENTS.md updates
- Route groups: `tutor/course/[id]/lesson/[lessonId]` is the lesson editor.
- Lesson videos / resources: tutor uploads (`uploads/<course>/<lesson>/…`, `lesson-upload` function, PUT links signed with type + length, old files deleted), limits.
- Data model: `owns_lesson`, the lesson RPCs, the "can open or own" policies.
- Commands: deploy `lesson-upload`.

## Result
- **No new dependency:** `expo-document-picker` was approved and installed, then removed: `expo-file-system` (already built in) has `File.pickFileAsync({ mimeTypes })`, so no development-build rebuild is needed.
- **Migration** `20261106104817_lesson_editor.sql` pushed; types regenerated; advisors: security clean, performance only the existing unused-index notices.
- **SQL checks** (one rolled-back transaction): the owner renamed a lesson, set preview and notes and read the draft's content; the first `set_lesson_video` returned null, the replacement returned the old key and set the duration to 120; a seeded `clips/` key and a `.exe` resource key → `22023`; adding two resources and deleting one returned its key and left `Data@1`; another tutor got `can_edit_lesson = false`, `42501` on update and read 0 content rows; `remove_lesson_video` returned the key.
- **Edge Function** `lesson-upload` deployed; without a token it answers 401. The signing code was checked against R2 directly with the same aws4fetch settings: signed headers `content-length;content-type;host`, a matching PUT → 200, a different size → 403, a different type → 403, DELETE → 204, then HEAD → 404 (test object removed).
- **App:** services `getTutorLesson`, `updateLesson`, `setLessonVideo`, `removeLessonVideo`, `addLessonResource`, `deleteLessonResource` (tutor.ts) and `src/services/lesson-uploads.ts` (sign, PUT with progress, best-effort delete of the old upload; if the database refuses a new file it is deleted again); hooks `useTutorLesson` (key `courses.tutorLesson`), `useUpdateLesson`, `useUploadLessonVideo`, `useRemoveLessonVideo`, `useAddLessonResource`, `useDeleteLessonResource` (invalidate `courses.all` and `lessons.all`); screen pieces `edit-lesson-screen.tsx`, `lesson-video-section.tsx`, `lesson-resources-section.tsx`, `notes-editor.tsx`, `report-tutor-failure.ts` (the course editor now uses it too).
- **Dropped from the plan:** the upload Cancel button (it needs an upload task handle; the plain `upload()` can't be cancelled).
- **Estimated values (no design):** notes field `min-h-[240px]`; preview box `bg-surface rounded-2xl p-4`; resource rows with a 40px `primary-tint` icon tile like the player's resource card.
- **Phone (Samsung, 2026-11-06), with a test course "Editor check course":** create course → add chapter → add lesson → lesson editor all worked; notes typed, Preview rendered the heading/list/bold, "Lesson saved"; a 5-second test MP4 uploaded through the deployed `lesson-upload` function ("00:05 · Your upload", R2 key under `uploads/<course>/<lesson>/`), and the lesson player played it from R2. The video picker and file picker both opened, so the installed development build is fine.
- **Bug found and fixed on the phone:** on Android, `File.pickFileAsync` returns a content URI and `File.name` is its last segment (`document:24914`), not the display name. `lesson-resources-section.tsx` now treats a name without a normal extension as unknown: the title starts empty and the stored file name is built from the title (`welcome-slides.pdf`).
- **Finished on the phone later the same day:** free-preview switch saved; Remove video (confirm) cleared it and deleted the R2 file; a resource picked without a usable name started with an empty title, was stored as `welcome-slides.jpg` (title + extension) and deleted with its R2 file; Delete lesson (confirm) returned to the course editor. A listing of `uploads/<course>/` in R2 was empty afterwards. A size fix from plan 24 also applies here: uploads now use the on-disk file size, not the picker's `fileSize`.
