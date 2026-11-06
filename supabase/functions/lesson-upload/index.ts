// lesson-upload (prompts/23): tutor uploads to the private R2 bucket.
//
// The app calls it with `Authorization: Bearer <Clerk session token>`:
// - `{ action: "sign", lessonId, kind: "video" | "resource", fileName, mimeType, sizeBytes }`
//   → `{ url, key, expiresAt }`: a PUT link signed for 1 hour with the file's type and size, under
//   uploads/<course_id>/<lesson_id>/. The app uploads the file there, then saves the key with the
//   set_lesson_video / add_lesson_resource RPCs, which accept only keys under that prefix.
// - `{ action: "delete", lessonId, key }` → `{ ok: true }`: deletes an old upload of that lesson
//   (a replaced video or a deleted resource). Only keys under the lesson's own uploads/ prefix.
//
// Ownership is checked by calling can_edit_lesson AS THE USER (their session token carries the
// Clerk role), so the rule lives in one place: private.owns_lesson. No service-role key.
import {
  asLearner,
  cors,
  deleteR2,
  expiresAt,
  json,
  signR2Put,
  verifiedBearer,
} from "../_shared/common.ts";

const MB = 1024 * 1024;
const KINDS = {
  video: { maxBytes: 500 * MB, types: { "video/mp4": "mp4", "video/quicktime": "mov" } as Record<string, string> },
  resource: {
    maxBytes: 25 * MB,
    types: {
      "application/pdf": "pdf",
      "text/csv": "csv",
      "text/plain": "txt",
      "image/png": "png",
      "image/jpeg": "jpg",
      "application/zip": "zip",
    } as Record<string, string>,
  },
} as const;

function randomHex(bytes: number): string {
  return [...crypto.getRandomValues(new Uint8Array(bytes))].map((b) => b.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const bearer = await verifiedBearer(request);
  if (!bearer) return json({ error: "Not signed in" }, 401);

  const body = await request.json().catch(() => null);
  const lessonId = typeof body?.lessonId === "string" ? body.lessonId : null;
  if (!lessonId) return json({ error: "lessonId is required" }, 400);

  try {
    const user = asLearner(bearer);
    const { data: canEdit } = await user.rpc("can_edit_lesson", { p_lesson_id: lessonId }).throwOnError();
    if (!canEdit) return json({ error: "Not allowed" }, 403);

    // The lesson's own folder: uploads/<course_id>/<lesson_id>/ (the RPCs check the same prefix).
    const { data: lesson } = await user
      .from("lessons")
      .select("id, chapters(course_id)")
      .eq("id", lessonId)
      .single()
      .throwOnError();
    const courseId = (lesson.chapters as unknown as { course_id: string }).course_id;
    const prefix = `uploads/${courseId}/${lessonId}/`;

    if (body.action === "delete") {
      const key = typeof body.key === "string" ? body.key : "";
      if (!key.startsWith(prefix) || key.includes("..")) return json({ error: "Not allowed" }, 403);
      await deleteR2(key);
      return json({ ok: true });
    }

    if (body.action !== "sign") return json({ error: "Unknown action" }, 400);
    const kind = body.kind === "video" || body.kind === "resource" ? KINDS[body.kind as "video" | "resource"] : null;
    if (!kind) return json({ error: "Unknown kind" }, 400);
    const mimeType = typeof body.mimeType === "string" ? body.mimeType : "";
    const extension = kind.types[mimeType];
    if (!extension) return json({ error: "Unsupported file type" }, 422);
    const sizeBytes = Number(body.sizeBytes);
    if (!Number.isInteger(sizeBytes) || sizeBytes < 1 || sizeBytes > kind.maxBytes) {
      return json({ error: `Files must be ${kind.maxBytes / MB} MB or smaller` }, 422);
    }

    const key = `${prefix}${body.kind === "video" ? "video" : "res"}-${randomHex(6)}.${extension}`;
    const url = await signR2Put(key, mimeType, sizeBytes);
    // Logs: sizes and kinds only, never file names.
    console.log(`lesson-upload signed ${body.kind} ${sizeBytes} bytes`);
    return json({ url, key, expiresAt: expiresAt() });
  } catch (error) {
    console.error("lesson-upload failed:", error);
    return json({ error: "Couldn't prepare the upload" }, 500);
  }
});
