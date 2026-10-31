// premium-sync (prompts/09): mirrors a learner's RevenueCat "premium" entitlement into
// public.premium_entitlements, the only Pro status the database trusts (quiz limit).
//
// Two callers:
// - The app, after sign-in, a purchase or a restore: `Authorization: Bearer <Clerk session
//   token>`. The token is verified with Clerk's JWKS and that user is synced.
// - A RevenueCat webhook (no auth header): every Clerk id in the event is synced. The
//   webhook only triggers a re-read from RevenueCat's API, so a forged call grants nothing.
//
// Secrets: REVENUECAT_SECRET_API_KEY (Supabase secret, never in the app). SUPABASE_URL and
// SUPABASE_SERVICE_ROLE_KEY are provided to every Edge Function.
import { createClient } from "npm:@supabase/supabase-js@2.49.4";
import { createRemoteJWKSet, jwtVerify } from "npm:jose@5.9.6";

const CLERK_ISSUER = "https://still-mastiff-2250.clerk.accounts.dev";
const ENTITLEMENT = "premium";

const jwks = createRemoteJWKSet(new URL(`${CLERK_ISSUER}/.well-known/jwks.json`));
const admin = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "", {
  auth: { persistSession: false },
});

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });
}

type Sync = { userId: string; premium: boolean; expiresAt: string | null };

/** Reads the subscriber from RevenueCat and writes (or clears) their entitlement row. */
async function syncUser(userId: string): Promise<Sync> {
  const key = Deno.env.get("REVENUECAT_SECRET_API_KEY");
  if (!key) throw new Error("REVENUECAT_SECRET_API_KEY is not set");

  const response = await fetch(`https://api.revenuecat.com/v1/subscribers/${encodeURIComponent(userId)}`, {
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
  });
  if (!response.ok) throw new Error(`RevenueCat responded ${response.status}`);
  const body = await response.json();
  const entitlement = body?.subscriber?.entitlements?.[ENTITLEMENT] as { expires_date?: string | null } | undefined;
  const expiresAt = entitlement ? (entitlement.expires_date ?? null) : null;
  const premium = !!entitlement && (expiresAt === null || new Date(expiresAt).getTime() > Date.now());

  if (entitlement) {
    // The row references profiles; the app normally creates the profile first.
    await admin.from("profiles").upsert({ id: userId }, { onConflict: "id", ignoreDuplicates: true }).throwOnError();
    await admin
      .from("premium_entitlements")
      .upsert({ user_id: userId, expires_at: expiresAt, updated_at: new Date().toISOString() })
      .throwOnError();
  } else {
    await admin.from("premium_entitlements").delete().eq("user_id", userId).throwOnError();
  }
  return { userId, premium, expiresAt };
}

/** Clerk user ids mentioned in a RevenueCat webhook event (anonymous ids are skipped). */
function clerkIdsIn(event: Record<string, unknown>): string[] {
  const candidates = [
    event.app_user_id,
    event.original_app_user_id,
    ...(Array.isArray(event.aliases) ? event.aliases : []),
    ...(Array.isArray(event.transferred_to) ? event.transferred_to : []),
    ...(Array.isArray(event.transferred_from) ? event.transferred_from : []),
  ];
  return [...new Set(candidates.filter((id): id is string => typeof id === "string" && id.startsWith("user_")))];
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const bearer = request.headers.get("Authorization")?.match(/^Bearer (.+)$/)?.[1];
    if (bearer) {
      let userId: string;
      try {
        const { payload } = await jwtVerify(bearer, jwks, { issuer: CLERK_ISSUER });
        if (typeof payload.sub !== "string") throw new Error("no sub");
        userId = payload.sub;
      } catch {
        return json({ error: "Not signed in" }, 401);
      }
      return json(await syncUser(userId));
    }

    const body = await request.json().catch(() => null);
    const event = body?.event;
    if (!event || typeof event !== "object") return json({ error: "Not signed in" }, 401);
    const results = [];
    for (const userId of clerkIdsIn(event)) results.push(await syncUser(userId));
    return json({ synced: results.length });
  } catch (error) {
    console.error("premium-sync failed:", error);
    return json({ error: "Sync failed" }, 500);
  }
});
