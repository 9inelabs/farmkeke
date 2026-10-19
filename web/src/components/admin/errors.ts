// Messages for the error codes the admin functions and staff sign-in throw.
import { errorCode, errorData } from "@/lib/auth";

const MESSAGES: Record<string, string> = {
  INVALID_CREDENTIALS: "That email and password don't match.",
  TOO_MANY_ATTEMPTS: "Too many tries. Wait a few minutes, then try again, or make a new password.",
  NOT_STAFF: "This email isn't on the admin portal. Apply for access first.",
  STAFF_DEACTIVATED: "Your access to the admin portal was removed. Ask the Founder if you think this is a mistake.",
  STAFF_VERIFY: "Your session needs a new sign-in code. Sign in again.",
  BLOCKED: "This account is blocked. Contact Farmkeke support.",
  INVALID_CODE: "That code is wrong or has expired. Check the latest email, or send a new code.",
  WEAK_PASSWORD: "Use 10 or more characters, with at least one letter and one number.",
  INVALID_EMAIL: "Enter a valid email address.",
  INVALID_PHONE: "Enter a Nigerian phone number, like 0803 123 4567.",
  NAME_REQUIRED: "Enter your full name.",
  JOB_REQUIRED: "Enter your job at Farmkeke.",
  ALREADY_STAFF: "You're already on the admin portal. Sign in instead.",
  EMAIL_FAILED: "We couldn't send the email. Try again in a minute.",
  EMAIL_NOT_CONFIGURED: "Email isn't set up on the server yet, so we can't send codes.",
  FORBIDDEN: "Your role doesn't allow this.",
  REASON_REQUIRED: "Add a reason. It's saved in the audit log.",
  FOUNDER_ROLE: "The Founder role can't be given out, changed or removed.",
  OWN_ROLE: "You can't change your own role.",
  OWN_ACCESS: "You can't remove your own access.",
  ROLE_IN_USE: "Someone still has this role. Move them to another role first.",
  BUILT_IN_ROLE: "Built-in roles can't be deleted.",
  WRONG_STATUS: "This was already changed by someone else. The page has the latest status.",
  NOT_FOUND: "This no longer exists.",
  NOT_EDITABLE: "This application can't be changed right now.",
};

/** A problem found in the form before calling the server; its message is shown as is. */
export class FormError extends Error {}

/** A readable message for any error from Convex. */
export function adminError(error: unknown, fallback = "Something went wrong. Try again."): string {
  if (error instanceof FormError) return error.message;
  const code = errorCode(error);
  if (code === "INVALID_CREDENTIALS") {
    const left = errorData<{ attemptsLeft?: number }>(error)?.attemptsLeft;
    if (typeof left === "number") {
      return `That email and password don't match. ${left === 1 ? "1 try" : `${left} tries`} left before a short pause.`;
    }
  }
  if (code && MESSAGES[code]) return MESSAGES[code];
  const data = errorData<{ message?: string }>(error);
  if (data?.message) return data.message;
  if (typeof (error as { data?: unknown })?.data === "string") return (error as { data: string }).data;
  return fallback;
}
