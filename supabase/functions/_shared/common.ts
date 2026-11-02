// Shared by the lesson-video and lesson-resource Edge Functions (prompts/15, 16): CORS + JSON
// responses, Clerk session-token checks, a Supabase client that acts AS the learner (so RLS
// decides access), and presigned links to the private R2 bucket.
import { createClient } from "npm:@supabase/supabase-js@2.49.4";
import { AwsClient } from "npm:aws4fetch@1.0.20";
import { createRemoteJWKSet, jwtVerify } from "npm:jose@5.9.6";

const CLERK_ISSUER = "https://still-mastiff-2250.clerk.accounts.dev";
export const LINK_SECONDS = 60 * 60;

const jwks = createRemoteJWKSet(new URL(`${CLERK_ISSUER}/.well-known/jwks.json`));

export const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

export function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });
}

export function env(name: string): string {
  const value = Deno.env.get(name)?.trim();
  if (!value) throw new Error(`${name} is not set`);
  return value;
}

/** The request's Clerk session token when Clerk's JWKS verifies it, else null. */
export async function verifiedBearer(request: Request): Promise<string | null> {
  const bearer = request.headers.get("Authorization")?.match(/^Bearer (.+)$/)?.[1];
  if (!bearer) return null;
  try {
    await jwtVerify(bearer, jwks, { issuer: CLERK_ISSUER });
    return bearer;
  } catch {
    return null;
  }
}

/** A Supabase client that sends the learner's token: every query runs under their RLS. */
export function asLearner(bearer: string) {
  return createClient(env("SUPABASE_URL"), env("SUPABASE_ANON_KEY"), {
    global: { headers: { Authorization: `Bearer ${bearer}` } },
    auth: { persistSession: false },
  });
}

/**
 * A presigned R2 GET link (S3 query-string signature), valid for LINK_SECONDS. With
 * `downloadName`, browsers save the file under that name instead of showing it.
 */
export async function signR2(key: string, { downloadName }: { downloadName?: string } = {}): Promise<string> {
  const r2 = new AwsClient({
    accessKeyId: env("R2_ACCESS_KEY_ID"),
    secretAccessKey: env("R2_SECRET_ACCESS_KEY"),
    service: "s3",
    region: "auto",
  });
  const path = key.split("/").map(encodeURIComponent).join("/");
  const url = new URL(`https://${env("R2_ACCOUNT_ID")}.r2.cloudflarestorage.com/${env("R2_BUCKET")}/${path}`);
  url.searchParams.set("X-Amz-Expires", String(LINK_SECONDS));
  if (downloadName) {
    const safe = downloadName.replace(/["\\\r\n]/g, "_");
    url.searchParams.set("response-content-disposition", `attachment; filename="${safe}"`);
  }
  const signed = await r2.sign(new Request(url, { method: "GET" }), { aws: { signQuery: true } });
  return signed.url;
}

export function expiresAt(): string {
  return new Date(Date.now() + LINK_SECONDS * 1000).toISOString();
}
