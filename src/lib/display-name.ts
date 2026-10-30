// Names for greetings, from Clerk's user or the sign-up form.

type NamedUser = {
  firstName: string | null;
  primaryEmailAddress?: { emailAddress: string } | null;
} | null | undefined;

/** "joanna.smith@example.com" → "Joanna". Used when an account has no first name. */
export function firstNameFromEmail(email: string) {
  const local = email.trim().split("@")[0].split(/[._+-]/)[0];
  return local ? local[0].toUpperCase() + local.slice(1).toLowerCase() : "";
}

/** The name to greet a learner by: Clerk's first name, else one from the email, else "there". */
export function displayFirstName(user: NamedUser) {
  return (
    user?.firstName?.trim() ||
    firstNameFromEmail(user?.primaryEmailAddress?.emailAddress ?? "") ||
    "there"
  );
}

/** The learner's photo, or undefined when Clerk only has its generated default image. */
export function profileImageUrl(user: { hasImage: boolean; imageUrl: string } | null | undefined) {
  return user?.hasImage ? user.imageUrl : undefined;
}

/** "Alex van Morgan" → { firstName: "Alex", lastName: "van Morgan" }. One word has no last name. */
export function splitFullName(fullName: string) {
  const [firstName, ...rest] = fullName.trim().split(/\s+/);
  return { firstName, lastName: rest.length > 0 ? rest.join(" ") : undefined };
}
