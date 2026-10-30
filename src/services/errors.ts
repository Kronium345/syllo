// Errors the services throw besides Supabase's own PostgrestError (which .throwOnError() rejects with).

/** A write that RLS refused: Postgres affects 0 rows instead of returning an error. */
export class NotAllowedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "NotAllowedError";
  }
}
