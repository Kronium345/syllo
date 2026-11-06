import type { Role } from "@/lib/roles";

// Types Clerk's user public metadata app-wide (https://clerk.com/docs/guides/secure/basic-rbac).
declare global {
  interface UserPublicMetadata {
    role?: Role;
  }
}
