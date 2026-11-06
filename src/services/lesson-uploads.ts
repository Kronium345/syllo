import { FunctionsHttpError } from "@supabase/supabase-js";
import { File, UploadType } from "expo-file-system";

import type { AppSupabaseClient } from "@/lib/supabase";

import { NotAllowedError, UploadError } from "./errors";
import {
  addLessonResource,
  deleteLessonResource,
  removeCourseCover,
  removeLessonVideo,
  setCourseCover,
  setLessonVideo,
} from "./tutor";

// Tutor uploads to R2 (prompts/23). The lesson-upload Edge Function signs a PUT link for the
// lesson's own uploads/<course>/<lesson>/ folder (type and size are part of the signature), the
// file goes straight from the phone to R2, and the RPCs in tutor.ts then save the key. Replaced
// and deleted files are removed through the same function. No React here.

export type UploadKind = "video" | "resource" | "cover";

const MB = 1024 * 1024;

/** What each kind accepts: the same lists and limits as the Edge Function and the RPCs. */
export const UPLOAD_RULES: Record<UploadKind, { maxBytes: number; mimeTypes: string[] }> = {
  video: { maxBytes: 500 * MB, mimeTypes: ["video/mp4", "video/quicktime"] },
  resource: {
    maxBytes: 25 * MB,
    mimeTypes: ["application/pdf", "text/csv", "text/plain", "image/png", "image/jpeg", "application/zip"],
  },
  // Course covers (prompts/24).
  cover: { maxBytes: 5 * MB, mimeTypes: ["image/jpeg", "image/png"] },
};

/** A file picked on the device, ready to upload. */
export type PickedFile = { uri: string; name: string; mimeType: string; sizeBytes: number };

/** Android and iOS report some types under other names; map them to the ones the server accepts. */
export function normaliseMimeType(mimeType: string | null | undefined, name: string): string {
  const lower = (mimeType ?? "").toLowerCase();
  const extension = name.split(".").pop()?.toLowerCase() ?? "";
  if (lower === "image/jpg") return "image/jpeg";
  if (lower === "application/x-zip-compressed" || extension === "zip") return "application/zip";
  if (extension === "csv") return "text/csv";
  if (lower === "" || lower === "application/octet-stream") {
    const byExtension: Record<string, string> = {
      pdf: "application/pdf",
      txt: "text/plain",
      png: "image/png",
      jpg: "image/jpeg",
      jpeg: "image/jpeg",
      mp4: "video/mp4",
      mov: "video/quicktime",
    };
    return byExtension[extension] ?? lower;
  }
  return lower;
}

/** The file's own size from disk (pickers don't always report it). */
export function fileSize(uri: string): number {
  return new File(uri).size;
}

const httpStatus = (error: unknown) => (error instanceof FunctionsHttpError ? (error.context as Response).status : 0);

async function callUploadFunction<T>(supabase: AppSupabaseClient, body: Record<string, unknown>): Promise<T> {
  // Edge Function calls have no .throwOnError(); throw the returned error ourselves.
  const { data, error } = await supabase.functions.invoke<T>("lesson-upload", { method: "POST", body });
  if (error) {
    const status = httpStatus(error);
    if (status === 403) throw new NotAllowedError("Not allowed to change this lesson.");
    // 422: the function refused the file itself (wrong type, too big) and says why.
    if (status === 422) {
      const reply = await ((error as FunctionsHttpError).context as Response)
        .json()
        .catch(() => null as { error?: string } | null);
      throw new UploadError(reply?.error ?? "That file can't be uploaded.", "refused");
    }
    throw error;
  }
  if (!data) throw new Error("lesson-upload returned nothing");
  return data;
}

/** Asks for a signed PUT link; resolves to the link and the R2 key the file will have. */
export async function signUpload(
  supabase: AppSupabaseClient,
  lessonId: string,
  kind: UploadKind,
  file: PickedFile,
): Promise<{ url: string; key: string }> {
  return callUploadFunction<{ url: string; key: string }>(supabase, {
    action: "sign",
    lessonId,
    kind,
    fileName: file.name,
    mimeType: file.mimeType,
    sizeBytes: file.sizeBytes,
  });
}

/** PUTs the file to a signed link, reporting progress from 0 to 1. */
export async function putFile(url: string, file: PickedFile, onProgress?: (fraction: number) => void): Promise<void> {
  let status: number;
  try {
    const result = await new File(file.uri).upload(url, {
      httpMethod: "PUT",
      uploadType: UploadType.BINARY_CONTENT,
      headers: { "Content-Type": file.mimeType },
      onProgress: ({ bytesSent, totalBytes }) => {
        if (totalBytes > 0) onProgress?.(Math.min(1, bytesSent / totalBytes));
      },
    });
    status = result.status;
  } catch {
    throw new UploadError("The connection dropped during the upload. Check your connection and try again.", "network");
  }
  if (status >= 200 && status < 300) return;
  // The link is signed for the file's exact type and size; R2 answers 403 to anything else
  // (prompts/24: a cropped copy whose reported size was wrong), or once the link has expired.
  if (status === 403) {
    throw new UploadError(
      "Storage refused the file: it no longer matches what was prepared (its size or type changed, or the upload took over an hour). Pick the file again.",
      "rejected",
    );
  }
  throw new UploadError(`Storage couldn't save the file (error ${status}). Try again in a moment.`, "storage");
}

/** Deletes an old upload of this lesson from R2 (only its own uploads/ folder is allowed). */
export async function deleteUpload(supabase: AppSupabaseClient, lessonId: string, key: string): Promise<void> {
  await callUploadFunction<{ ok: true }>(supabase, { action: "delete", lessonId, key });
}

/**
 * Best-effort cleanup of a replaced or deleted file. Seeded files (clips/, resources/) are never
 * touched; a failed delete only leaves an orphan in the bucket, so it's logged, not thrown.
 */
async function deleteOldUpload(supabase: AppSupabaseClient, lessonId: string, key: string | null): Promise<void> {
  if (!key?.startsWith("uploads/")) return;
  await deleteUpload(supabase, lessonId, key).catch((error: Error) =>
    console.warn("Couldn't delete the old upload:", error.message),
  );
}

/** Uploads a video and makes it the lesson's video (the old upload, if any, is deleted). */
export async function uploadLessonVideo(
  supabase: AppSupabaseClient,
  input: { lessonId: string; file: PickedFile; durationSeconds: number; onProgress?: (fraction: number) => void },
): Promise<void> {
  const { url, key } = await signUpload(supabase, input.lessonId, "video", input.file);
  await putFile(url, input.file, input.onProgress);
  let previous: string | null;
  try {
    previous = await setLessonVideo(supabase, input.lessonId, key, input.durationSeconds);
  } catch (error) {
    // The database refused it: don't leave the new file behind.
    await deleteOldUpload(supabase, input.lessonId, key);
    throw error;
  }
  await deleteOldUpload(supabase, input.lessonId, previous);
}

/** Removes the lesson's video and deletes the file if it was a tutor upload. */
export async function removeLessonVideoFile(supabase: AppSupabaseClient, lessonId: string): Promise<void> {
  const previous = await removeLessonVideo(supabase, lessonId);
  await deleteOldUpload(supabase, lessonId, previous);
}

/** Uploads a resource file and lists it on the lesson. */
export async function uploadLessonResource(
  supabase: AppSupabaseClient,
  input: { lessonId: string; title: string; file: PickedFile; onProgress?: (fraction: number) => void },
): Promise<void> {
  const { url, key } = await signUpload(supabase, input.lessonId, "resource", input.file);
  await putFile(url, input.file, input.onProgress);
  try {
    await addLessonResource(supabase, {
      lessonId: input.lessonId,
      title: input.title,
      fileName: input.file.name,
      sizeBytes: input.file.sizeBytes,
      mimeType: input.file.mimeType,
      key,
    });
  } catch (error) {
    await deleteOldUpload(supabase, input.lessonId, key);
    throw error;
  }
}

/** Deletes a resource and its file (if it was a tutor upload). */
export async function deleteLessonResourceFile(
  supabase: AppSupabaseClient,
  lessonId: string,
  resourceId: string,
): Promise<void> {
  const key = await deleteLessonResource(supabase, resourceId);
  await deleteOldUpload(supabase, lessonId, key);
}

/** Course covers (prompts/24): the same function, addressed by course instead of lesson. */
async function deleteOldCover(supabase: AppSupabaseClient, courseId: string, key: string | null): Promise<void> {
  if (!key?.startsWith(`uploads/${courseId}/cover-`)) return;
  await callUploadFunction<{ ok: true }>(supabase, { action: "delete", courseId, key }).catch((error: Error) =>
    console.warn("Couldn't delete the old cover:", error.message),
  );
}

/** Uploads a cover image and makes it the course's cover (the old upload, if any, is deleted). */
export async function uploadCourseCover(
  supabase: AppSupabaseClient,
  input: { courseId: string; file: PickedFile; onProgress?: (fraction: number) => void },
): Promise<void> {
  const { url, key } = await callUploadFunction<{ url: string; key: string }>(supabase, {
    action: "sign",
    courseId: input.courseId,
    kind: "cover",
    mimeType: input.file.mimeType,
    sizeBytes: input.file.sizeBytes,
  });
  await putFile(url, input.file, input.onProgress);
  let previous: string | null;
  try {
    previous = await setCourseCover(supabase, input.courseId, key);
  } catch (error) {
    await deleteOldCover(supabase, input.courseId, key);
    throw error;
  }
  await deleteOldCover(supabase, input.courseId, previous);
}

/** Removes the course's uploaded cover and deletes the file. */
export async function removeCourseCoverFile(supabase: AppSupabaseClient, courseId: string): Promise<void> {
  const previous = await removeCourseCover(supabase, courseId);
  await deleteOldCover(supabase, courseId, previous);
}
