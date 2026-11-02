// lesson-video (prompts/15): returns a playable link for a lesson's video.
//
// The app calls it with `Authorization: Bearer <Clerk session token>` and `{ lessonId }`.
// The token is verified with Clerk's JWKS, then lesson_contents is read AS THAT LEARNER, so
// RLS decides access (private.can_open_lesson: previews, or enrolled + Pro for premium
// courses). No access rule is repeated here and the service-role key isn't used.
//
// - `video_key` set: the video is in the private R2 bucket; return a GET link signed for 1 hour.
// - otherwise: return `video_url` (an outside link) unchanged.
//
// Secrets (Supabase, never in the app): R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY,
// R2_BUCKET. SUPABASE_URL and SUPABASE_ANON_KEY are provided to every Edge Function.
import { asLearner, cors, expiresAt, json, signR2, verifiedBearer } from "../_shared/common.ts";

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const bearer = await verifiedBearer(request);
  if (!bearer) return json({ error: "Not signed in" }, 401);

  const body = await request.json().catch(() => null);
  const lessonId = typeof body?.lessonId === "string" ? body.lessonId : null;
  if (!lessonId) return json({ error: "lessonId is required" }, 400);

  try {
    const { data } = await asLearner(bearer)
      .from("lesson_contents")
      .select("video_key, video_url")
      .eq("lesson_id", lessonId)
      .maybeSingle()
      .throwOnError();
    // No row: the lesson doesn't exist, or RLS hides it (locked). Either way, no video.
    if (!data) return json({ error: "Not allowed" }, 404);

    if (data.video_key) return json({ url: await signR2(data.video_key), expiresAt: expiresAt() });
    if (data.video_url) return json({ url: data.video_url, expiresAt: null });
    return json({ error: "No video" }, 404);
  } catch (error) {
    console.error("lesson-video failed:", error);
    return json({ error: "Couldn't load the video" }, 500);
  }
});
