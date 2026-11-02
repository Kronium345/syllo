# 15 · Real lesson videos on Cloudflare R2

Status: done

## Goal
Lessons play real, openly licensed educational videos, credited in the lesson notes and stored in a private Cloudflare R2 bucket. Learners who can open a lesson (preview, or enrolled) get a link to its video that expires after an hour. A local script converts a clip, uploads it and links it to lessons, ready for the tutor upload screen in Part 2.

## Decisions
- **Storage (user decision): a private Cloudflare R2 bucket**, `syllo-lesson-videos`, copying the Agile Athletes `trainerVideoStorage.ts` pattern.
  - R2 has no charge per view (Supabase Free allows 5 GB of views a month and 50 MB per file).
  - Supabase stays the owner of lesson data and access rules. R2 holds only the video files.
- **Schema: `lesson_contents.video_key text null`**, the object key in R2 (`lessons/<lesson_id>.mp4`, or `clips/<slug>.mp4` for a clip shared by several lessons).
  - `video_url` stays for outside links: today's placeholders, and future YouTube-style links.
  - The player prefers `video_key`, so the lesson's content row still needs an RLS check before a link is issued.
  - This is a schema change on a table with data, approved with this plan.
- **Edge Function `lesson-video`** (Deno, `verify_jwt = false`, like `premium-sync`):
  - `POST { lessonId }` with the learner's Clerk token.
  - It checks the token against Clerk's public keys (JWKS), the same way `premium-sync` does.
  - It reads `lesson_contents` **with a Supabase client carrying the learner's token**, so RLS decides access as it does today. No access rule is duplicated, and the service-role key isn't used.
  - It returns `{ url, expiresAt }`: an R2 link signed for 3600 s when `video_key` is set, otherwise `video_url` unchanged. With no row, it returns 403/404.
  - R2 keys are Supabase secrets (`R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET`), never in the app or `EXPO_PUBLIC_`.
  - Signing uses **`aws4fetch`**, a small S3-compatible signer, imported as `npm:aws4fetch` in Deno.
- **App:** the service `getLessonVideoUrl(supabase, lessonId)` calls `supabase.functions.invoke("lesson-video")`, wrapped by a hook `useLessonVideo(lessonId)`.
  - `staleTime` is 50 minutes, so the link refreshes before it expires.
  - The lesson player passes the returned `url` to `LessonVideo`. While loading, it shows the poster; on error, today's "Couldn't play this video."
  - It renews the link only on refetch, not mid-playback; a playing video keeps working after its link expires.
- **Content (user decision): openly licensed clips**, licences **CC0, CC BY or CC BY-SA only**, mostly from Wikimedia Commons.
  - **One clip per chapter (19 chapters)**, matched to the chapter's topic as closely as possible and shared by that chapter's lessons. The made-up lesson titles can't be matched exactly. Pharmacy Exam Prep has no lessons.
  - Each clip is listed in `supabase/seeds/source/lesson-videos.json`: chapter key, source page, file URL, title, author, licence, licence URL and trim range.
  - I'll pick the candidates during the build and list them in the Result for you to check. Any you reject go back to the placeholder.
- **Credit:** a clip's attribution is added to its lessons' notes as a final line, `*Video: "<title>" by <author>, <licence>, via Wikimedia Commons.*`. It's written into `lesson_contents.body` by the seed generator, so the existing markdown renderer shows it.
- **Format:** Commons serves WebM/Ogg, which iOS can't play, so every clip is converted to **MP4 (H.264 + AAC, at most 720p, about 1.5 Mbit/s, `+faststart`)**, trimmed to at most 10 minutes. That keeps files around 30–110 MB; 19 clips come to roughly 1 GB, inside R2's 10 GB free tier.
- **Script (user decision: script now, tutor screen in Part 2):** `node scripts/upload-lesson-videos.mjs [--only <chapter-key>]`.
  - It reads the JSON, downloads each source and converts it with **`ffmpeg-static`** (ffmpeg isn't installed on this PC). It uploads to R2 with `aws4fetch` (`PUT`, `Content-Type: video/mp4`), skipping keys already there (`HEAD`).
  - Then it writes **`supabase/seeds/lesson-videos.sql`**: idempotent `update public.lesson_contents set video_key = …, body = … where lesson_id in (…)` statements, keyed by the seed's md5 ids.
  - `npm run db:push` applies them, so hosted data comes from files, as with the other seeds, and no service-role key is needed.
  - The script reads the R2 keys from `.env.local` **without** `EXPO_PUBLIC_` (scripts only). `.env.example` gets the names.
- **New dev dependencies:** `aws4fetch` and `ffmpeg-static`, both scripts-only (approved with this plan). The function imports `npm:aws4fetch` itself.
- **CORS / web:** the R2 bucket stays private, and signed GET links work in `<video>` on web without CORS rules.

## Out of scope
- The tutor upload screen and course editor (Part 2).
- Cloudflare Stream / HLS adaptive streaming (the upgrade if long videos stutter on mobile data).
- Offline downloads (a Premium promise; needs local files).
- Thumbnails from video frames (course covers stay the poster).
- Removing `video_url` (kept for outside links).

## Steps
### 1. You: R2 bucket and keys (the "You need to" items, done first)
1. In the Cloudflare dashboard, go to R2 → Create bucket `syllo-lesson-videos`. Keep it private (no public access or r2.dev URL).
2. Go to R2 → Manage API tokens → Create token with **Object Read & Write**, limited to that bucket. Note the Account ID, Access Key ID and Secret Access Key.
3. Set the Supabase secrets in a terminal; don't paste them in chat:
   `npx supabase secrets set R2_ACCOUNT_ID=… R2_ACCESS_KEY_ID=… R2_SECRET_ACCESS_KEY=… R2_BUCKET=syllo-lesson-videos`
4. Add the same four, without `EXPO_PUBLIC_`, to `.env.local` for the upload script.

### 2. Schema
- `npx supabase migration new lesson_video_key < /dev/null` → `alter table public.lesson_contents add column video_key text;` plus a comment.
- No RLS change: the existing select policy already decides who reads the row.
- `npm run db:push`, `npm run db:types`, then the security and performance advisors (no new warnings).

### 3. Edge Function `supabase/functions/lesson-video/index.ts`
- Copy `premium-sync`'s CORS and Clerk JWKS check (`jose`, issuer `https://still-mastiff-2250.clerk.accounts.dev`).
- Create a Supabase client with the anon/publishable key and `global.headers.Authorization = Bearer <clerk token>`. Run `select video_key, video_url from lesson_contents where lesson_id = $1` (RLS applies).
- With a `video_key`, sign a GET for `https://<account>.r2.cloudflarestorage.com/<bucket>/<key>` with `AwsClient` (`service: "s3"`, `region: "auto"`), `aws: { signQuery: true }` and `X-Amz-Expires=3600`.
- Return `{ url, expiresAt }`, or `{ error }` with 401 (bad token), 404 (no row, or RLS hid it) or 500.
- `[functions.lesson-video] verify_jwt = false` in `config.toml`.
- Deploy with `npx supabase functions deploy lesson-video`.

### 4. App
- **Service:** `src/services/lessons.ts` (or the existing lesson service), `getLessonVideoUrl(supabase, lessonId)`. It uses `functions.invoke` and throws a `FunctionsHttpError` as `NotAllowedError` on 403/404.
- **Key and hook:** `queryKeys.lessons.video(lessonId)`, and `src/lib/queries/lessons/use-lesson-video.ts` with `staleTime: 50 * 60_000`.
- **Player:** `src/screens/lesson/` uses the hook's `url` instead of `content.video_url`. Loading shows the poster with the play button disabled.
- The data-fetching rules apply: no Supabase in screens, and lint must pass.

### 5. Clips, script and seed
- `npm i -D aws4fetch ffmpeg-static`. They're scripts-only packages that aren't part of the app bundle, like `sharp`, so `npx expo install` (which resolves app versions) doesn't apply. AGENTS.md's only listed exception is the Supabase CLI, so this adds a second one.
- Write `supabase/seeds/source/lesson-videos.json` with 19 entries, after checking each file's licence on its Commons page.
- Write `scripts/upload-lesson-videos.mjs` as described in Decisions. Run it, then add `seeds/lesson-videos.sql` to `config.toml` `[db.seed]` after `exam-prep.sql`, and run `npm run db:push`.
- Add `upload:lesson-videos` to `package.json` scripts.

## Verification
- `NODE_OPTIONS=--max-old-space-size=2048 npx tsc --noEmit` and `npx expo lint` pass. Supabase advisors show no new warnings.
- `curl` the function:
  - Without a token → 401.
  - With the test account's token for a preview lesson of a course it isn't enrolled in → `url` (signed R2, expires in 3600 s).
  - For a locked lesson → 404.
  - The signed URL returns `206 video/mp4` for a range request. After expiry, or with the signature changed, it returns 403.
- **Samsung (Argent):**
  - Lesson 1 of each course plays its R2 clip (the time advances and the picture shows), and the notes end with the credit line.
  - A locked lesson still shows the lock toast.
  - With airplane mode on, the player shows its error state, not a crash.
- The R2 bucket has exactly 19 objects, and the dashboard shows it isn't publicly readable.

## AGENTS.md updates
- **Who owns what → new "Video" bullet:** lesson videos live in private Cloudflare R2 `syllo-lesson-videos`. `lesson_contents.video_key` holds the key (`video_url` holds outside links). The `lesson-video` Edge Function checks Clerk plus RLS and signs 1-hour links. The R2 keys are Supabase secrets plus non-`EXPO_PUBLIC_` lines in `.env.local`. Upload with `npm run upload:lesson-videos`, which converts with ffmpeg-static, uploads with aws4fetch and writes `seeds/lesson-videos.sql`.
- **Data model:** `lesson_contents.video_key`. Clips are openly licensed (CC0/BY/BY-SA) and credited in the lesson body.
- **Seeds:** add `seeds/lesson-videos.sql` and its `source/lesson-videos.json`, and replace the placeholder-video note.

## Result
- **Built:**
  - Migration `lesson_video_key`.
  - Edge Function `lesson-video`, deployed.
  - `getLessonVideoUrl` with `useLessonVideo` and `queryKeys.lessons.video`.
  - The player uses the signed link: a spinner while it loads, and a fresh link fetched after an error.
  - `scripts/upload-lesson-videos.mjs` (`--check`, `--only`, `--sql-only`) and `scripts/set-r2-token.mjs`.
  - `seeds/lesson-videos.sql` (generated) and its `source/lesson-videos.json`.
  - Dev dependencies `aws4fetch` and `ffmpeg-static`.
- **Changes from the plan:**
  - **The app calls `lesson-video` only when a lesson has a `video_key`**: the lesson query now also reads `video_key` under the same RLS. Outside `video_url`s play directly, with no extra call. The function still returns `video_url` when there's no key.
  - **The player keeps its first link**, so a refreshed link doesn't restart playback. It switches only after a playback error, in render, because the React Compiler lint rule forbids `setState` in an effect.
  - **Credits are plain text**, because the markdown renderer has no links.
  - **R2 token:** the dashboard sent the user to the general "Account API tokens" page, and the Cloudflare MCP's OAuth scopes can't create tokens. The working route was a custom token with "Workers R2 Storage Bucket Item Write" on the bucket, turned into S3 keys by `scripts/set-r2-token.mjs` (ID from Cloudflare's verify endpoint, secret = SHA-256 of the value). It's run in the user's own terminal, so the secret never entered the session. The first token made was read-only (writes 403) and was replaced.
- **Content:** 15 of 19 chapters, 46 of 58 lessons. Licences: CC BY 3.0, CC BY-SA 3.0 and CC BY-SA 4.0. Each clip is trimmed to at most 10 minutes; 15 objects come to 253 MB. Gestures, Components, Running the system and Making decisions keep placeholders, because Commons had no suitable open clip.
  - Charles Severance, *Python for Everybody*, chapter 4 "Functions"
  - Lea Verou, "The Chroma Zone"
  - Chrome for Developers, CSS Podcast 090
  - Google Chrome Developers, DevTools 101
  - Alex The Analyst (×2)
  - Jack Herrington
  - Joe Vandal, OpenRefine
  - World Economic Forum
  - Doc James, Wikimania
  - Renepick
  - Nghĩa Nguyễn Văn
  - FOSS4G, MapLibre
  - Wikimedia Foundation, UX talk
  - dotconferences, Mandy Michael
- **Verified:**
  - tsc and lint pass. The Supabase security advisor is clean; performance shows only the 6 existing INFO unused-index notices.
  - Function calls: without a token → 401. Preview lesson, not enrolled → 200, a link signed for 3600 s returning `206 video/mp4`; with the signature changed → 403, unsigned → 400. Locked lesson → 404.
  - Database: 46 rows with `video_key`, 46 credited, 0 double credits.
  - The bucket holds exactly 15 objects; r2.dev is disabled and there are no custom domains.
  - On the Samsung, Advanced Mobile Animations lesson 1 played the R2 clip (00:10 of 10:00) and the notes end with the credit.
- **Not verified:** iOS (no Mac); airplane-mode playback; a link expiring mid-lesson (only after 1 hour).

