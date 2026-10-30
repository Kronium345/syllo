import type { PostgrestError } from "@supabase/supabase-js";

// supabase-js resolves to { data, error } instead of throwing. TanStack Query needs a
// thrown error to mark a query or mutation as failed, so every query function unwraps.

/** Returns the rows a read (or a write with `.select()`) sent back, or throws the Supabase error. */
export function unwrap<T>({ data, error }: { data: T; error: PostgrestError | null }): NonNullable<T> {
  if (error) throw error;
  if (data === null || data === undefined) throw new Error("Supabase returned no data.");
  return data;
}

/** For writes without `.select()`, which return no rows: throws the Supabase error, if any. */
export function throwIfError({ error }: { error: PostgrestError | null }) {
  if (error) throw error;
}

/** A write that RLS refused: Postgres affects 0 rows instead of returning an error. */
export class NotAllowedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "NotAllowedError";
  }
}
