import { ConvexError } from "convex/values";

/** The `code` the backend attaches to ConvexError data, if any. */
export function errorCode(error: unknown): string | null {
  if (error instanceof ConvexError && typeof error.data === "object" && error.data !== null) {
    const code = (error.data as { code?: unknown }).code;
    return typeof code === "string" ? code : null;
  }
  return null;
}

export function errorData<T extends object>(error: unknown): Partial<T> {
  return error instanceof ConvexError && typeof error.data === "object" && error.data !== null
    ? (error.data as Partial<T>)
    : {};
}

const MESSAGES: Record<string, string> = {
  INVALID_CREDENTIALS: "That email and password don't match. Check them and try again.",
  WRONG_PASSWORD: "That password isn't right.",
  TOO_MANY_ATTEMPTS: "Too many tries. Wait a few minutes, or reset your password.",
  EMAIL_TAKEN: "This email already has an account.",
  INVALID_EMAIL: "Enter a full email address, like name@example.com.",
  WEAK_PASSWORD: "Use at least 8 characters, with one number and one letter.",
  NAME_REQUIRED: "Enter your name.",
  NAME_TOO_LONG: "That name is too long.",
  BLOCKED: "This account can't be used. Contact support@farmkeke.com.",
  NOT_SIGNED_IN: "You've been signed out. Sign in again to continue.",
  ACCOUNT_REQUIRED: "Sign in to do this.",
  STREET_REQUIRED: "Enter the house number and street.",
  LANDMARK_REQUIRED: "Add a landmark so riders can find you.",
  AREA_NOT_SERVED: "We don't deliver to that area yet.",
  TOO_MANY_ADDRESSES: "You can save up to 20 addresses.",
  EMAIL_NOT_CONFIGURED: "Email isn't working right now. Try again later.",
  EMAIL_FAILED: "We couldn't send the email. Try again.",
  STAFF_ACCOUNT: "Staff accounts are closed by Farmkeke, not from the app.",
};

/** Plain-words message for any error (shared state rule 3). */
export function errorMessage(error: unknown): string {
  const code = errorCode(error);
  if (code !== null && MESSAGES[code] !== undefined) return MESSAGES[code];
  if (error instanceof Error && /network|fetch|connection/i.test(error.message)) {
    return "No connection. Check your mobile data or Wi-Fi and try again.";
  }
  return "Something went wrong. It isn't anything you did. Try again.";
}
