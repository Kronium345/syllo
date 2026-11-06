import { useUser } from "@clerk/expo";

/**
 * App roles, stored in Clerk as `publicMetadata.role` (Clerk's basic RBAC guide). Set them in the
 * Clerk Dashboard (Users → user → Metadata → Public: `{ "role": "tutor" }`) or the Backend API;
 * the app can read public metadata but never write it.
 */
export type Role = "tutor";

/**
 * Whether the signed-in user is a tutor. UI gating only (the tutor routes and the Profile row):
 * anything a tutor writes must also be checked by RLS on the server.
 */
export function useIsTutor(): boolean {
  const { user } = useUser();
  return user?.publicMetadata.role === "tutor";
}
