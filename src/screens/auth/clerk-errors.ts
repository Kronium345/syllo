import { toast } from "@/components/ui/toast";

// Clerk methods resolve to { error }. API errors carry a list; the first one says the most.
export type ClerkFailure = {
  message: string;
  longMessage?: string;
  errors?: { message: string; longMessage?: string; meta?: { paramName?: string } }[];
};

const FALLBACK = "Something went wrong. Try again.";

/** The learner-facing message for a failed Clerk call. */
export function clerkErrorMessage(error: ClerkFailure | null | undefined) {
  const first = error?.errors?.[0] ?? error;
  return first?.longMessage || first?.message || FALLBACK;
}

/** One error toast for a failed Clerk call, matching reportInvalid. */
export function reportClerkError(error: ClerkFailure | null | undefined) {
  toast.error(clerkErrorMessage(error));
}

/**
 * Clerk's message per rejected form param (e.g. "email_address", "password"), for red
 * borders. Maps each param to a form field with `fieldFor`.
 */
export function clerkFieldErrors<Field extends string>(
  error: ClerkFailure | null | undefined,
  fieldFor: Record<string, Field>,
) {
  const fields: Partial<Record<Field, string>> = {};
  for (const item of error?.errors ?? []) {
    const field = item.meta?.paramName ? fieldFor[item.meta.paramName] : undefined;
    if (field && !fields[field]) fields[field] = item.longMessage || item.message;
  }
  return fields;
}
