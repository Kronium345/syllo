import { toast } from "@/components/ui/toast";

/**
 * Shows one toast for a form's validation result. Returns true when something failed.
 * Fields show their own red border; the message lives in the toast, not inline.
 */
export function reportInvalid(errors: Record<string, string | undefined>) {
  const messages = Object.values(errors).filter((message): message is string => Boolean(message));
  if (messages.length === 0) return false;
  if (messages.length === 1) {
    toast.error(messages[0]);
  } else {
    toast.error(`${messages.length} fields need attention`, "Check the highlighted fields.");
  }
  return true;
}
