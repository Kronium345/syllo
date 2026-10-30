// Field checks for the auth forms. Each returns an error message, or undefined when valid.

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
/** Keep equal to the Clerk instance's password minimum. */
export const MIN_PASSWORD_LENGTH = 8;

export function validateName(value: string) {
  return value.trim() ? undefined : "Enter your full name.";
}

export function validateEmail(value: string) {
  if (!value.trim()) return "Enter your email address.";
  return EMAIL_PATTERN.test(value.trim()) ? undefined : "Enter a valid email address.";
}

export function validateNewPassword(value: string) {
  return value.length >= MIN_PASSWORD_LENGTH
    ? undefined
    : `Use at least ${MIN_PASSWORD_LENGTH} characters.`;
}

export function validatePassword(value: string) {
  return value ? undefined : "Enter your password.";
}

/** The first field with an error, in form order, or undefined when all are valid. */
export function firstInvalid<Field extends string>(errors: Partial<Record<Field, string>>, order: Field[]) {
  return order.find((field) => errors[field]);
}
