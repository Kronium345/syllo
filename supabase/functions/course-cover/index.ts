// course-cover (prompts/24): returns a viewable link for a course's uploaded cover image.
//
// The app calls it with `Authorization: Bearer <Clerk session token>` and `{ courseId }`.
// courses.cover_key is read AS THAT USER, so RLS decides: published courses for everyone, drafts
// only for their tutor. The key is in the private R2 bucket (uploads/<course>/cover-…), so the
// answer is a GET link signed for 1 hour. No service-role key.
import { asLearner, cors, expiresAt, json, signR2, verifiedBearer } from "../_shared/common.ts";

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const bearer = await verifiedBearer(request);
  if (!bearer) return json({ error: "Not signed in" }, 401);

  const body = await request.json().catch(() => null);
  const courseId = typeof body?.courseId === "string" ? body.courseId : null;
  if (!courseId) return json({ error: "courseId is required" }, 400);

  try {
    const { data } = await asLearner(bearer)
      .from("courses")
      .select("cover_key")
      .eq("id", courseId)
      .maybeSingle()
      .throwOnError();
    // No row (missing, or a draft that isn't theirs) or no uploaded cover: nothing to show.
    if (!data?.cover_key) return json({ error: "No cover" }, 404);
    return json({ url: await signR2(data.cover_key), expiresAt: expiresAt() });
  } catch (error) {
    console.error("course-cover failed:", error);
    return json({ error: "Couldn't load the cover" }, 500);
  }
});
