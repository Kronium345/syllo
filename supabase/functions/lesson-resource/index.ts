// lesson-resource (prompts/16): a download link for one of a lesson's files.
//
// `POST { resourceId }` with `Authorization: Bearer <Clerk session token>`. The row is read AS
// THE LEARNER, so RLS decides (private.can_open_lesson: previews, or enrolled + Pro for
// premium courses); a hidden row is a 404. Returns an R2 link signed for 1 hour that makes the
// browser save the file under its original name.
import { asLearner, cors, expiresAt, json, signR2, verifiedBearer } from "../_shared/common.ts";

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const bearer = await verifiedBearer(request);
  if (!bearer) return json({ error: "Not signed in" }, 401);

  const body = await request.json().catch(() => null);
  const resourceId = typeof body?.resourceId === "string" ? body.resourceId : null;
  if (!resourceId) return json({ error: "resourceId is required" }, 400);

  try {
    const { data } = await asLearner(bearer)
      .from("lesson_resources")
      .select("storage_key, file_name")
      .eq("id", resourceId)
      .maybeSingle()
      .throwOnError();
    if (!data) return json({ error: "Not allowed" }, 404);
    return json({ url: await signR2(data.storage_key, { downloadName: data.file_name }), expiresAt: expiresAt() });
  } catch (error) {
    console.error("lesson-resource failed:", error);
    return json({ error: "Couldn't load the file" }, 500);
  }
});
