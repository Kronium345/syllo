// lesson-video (prompts/15): returns a playable link for a lesson's video.
//
// The app calls it with `Authorization: Bearer <Clerk session token>` and `{ lessonId }`.
// The token is verified with Clerk's JWKS, then lesson_contents is read AS THAT LEARNER
// (a Supabase client carrying their token), so the existing RLS decides access: preview
// lessons, or courses they're enrolled in. No access rule is repeated here and the
// service-role key isn't used.
//
// - `video_key` set: the video is in the private R2 bucket; return a GET link signed for 1 hour.
// - otherwise: return `video_url` (an outside link) unchanged.
//
// Secrets (Supabase, never in the app): R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY,
// R2_BUCKET. SUPABASE_URL and SUPABASE_ANON_KEY are provided to every Edge Function.
import { createClient } from "npm:@supabase/supabase-js@2.49.4";
import { AwsClient } from "npm:aws4fetch@1.0.20";
import { createRemoteJWKSet, jwtVerify } from "npm:jose@5.9.6";

const CLERK_ISSUER = "https://still-mastiff-2250.clerk.accounts.dev";
const LINK_SECONDS = 60 * 60;

const jwks = createRemoteJWKSet(new URL(`${CLERK_ISSUER}/.well-known/jwks.json`));

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });
}

function env(name: string): string {
  const value = Deno.env.get(name)?.trim();
  if (!value) throw new Error(`${name} is not set`);
  return value;
}

/** A presigned R2 GET link (S3 query-string signature), valid for LINK_SECONDS. */
async function signR2(key: string): Promise<string> {
  const r2 = new AwsClient({
    accessKeyId: env("R2_ACCESS_KEY_ID"),
    secretAccessKey: env("R2_SECRET_ACCESS_KEY"),
    service: "s3",
    region: "auto",
  });
  const path = key.split("/").map(encodeURIComponent).join("/");
  const url = new URL(`https://${env("R2_ACCOUNT_ID")}.r2.cloudflarestorage.com/${env("R2_BUCKET")}/${path}`);
  url.searchParams.set("X-Amz-Expires", String(LINK_SECONDS));
  const signed = await r2.sign(new Request(url, { method: "GET" }), { aws: { signQuery: true } });
  return signed.url;
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const bearer = request.headers.get("Authorization")?.match(/^Bearer (.+)$/)?.[1];
  if (!bearer) return json({ error: "Not signed in" }, 401);
  try {
    await jwtVerify(bearer, jwks, { issuer: CLERK_ISSUER });
  } catch {
    return json({ error: "Not signed in" }, 401);
  }

  const body = await request.json().catch(() => null);
  const lessonId = typeof body?.lessonId === "string" ? body.lessonId : null;
  if (!lessonId) return json({ error: "lessonId is required" }, 400);

  try {
    const asLearner = createClient(env("SUPABASE_URL"), env("SUPABASE_ANON_KEY"), {
      global: { headers: { Authorization: `Bearer ${bearer}` } },
      auth: { persistSession: false },
    });
    const { data } = await asLearner
      .from("lesson_contents")
      .select("video_key, video_url")
      .eq("lesson_id", lessonId)
      .maybeSingle()
      .throwOnError();
    // No row: the lesson doesn't exist, or RLS hides it (locked). Either way, no video.
    if (!data) return json({ error: "Not allowed" }, 404);

    if (data.video_key) {
      return json({ url: await signR2(data.video_key), expiresAt: new Date(Date.now() + LINK_SECONDS * 1000).toISOString() });
    }
    if (data.video_url) return json({ url: data.video_url, expiresAt: null });
    return json({ error: "No video" }, 404);
  } catch (error) {
    console.error("lesson-video failed:", error);
    return json({ error: "Couldn't load the video" }, 500);
  }
});
