import { toast } from "@/components/ui/toast";
import { NotAllowedError, UploadError } from "@/services/errors";

/**
 * One toast for a failed tutor change (prompts/22, 23): not allowed, a rule the database refused
 * (code 22023, shown with the database's message), an upload that failed (UploadError, with its
 * reason), or a connection problem.
 */
export function reportTutorFailure(
  error: unknown,
  title = "Couldn't save your changes.",
  message = "Check your connection and try again.",
) {
  if (error instanceof NotAllowedError) {
    toast.error("You're not allowed to change this course.");
  } else if (error instanceof UploadError) {
    toast.error("Upload failed.", error.message);
  } else if ((error as { code?: string }).code === "22023") {
    toast.error((error as { message?: string }).message ?? "That change isn't valid.");
  } else {
    toast.error(title, message);
  }
}
