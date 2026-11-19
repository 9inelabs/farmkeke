// Text messages through Termii (https://developers.termii.com). Plain fetch,
// so it runs in the default Convex runtime (actions only: it calls out).
//
// Env (set with `npx convex env set`):
//   TERMII_API_KEY     required to send; without it texts are only recorded in smsLog
//   TERMII_SENDER_ID   the approved Sender ID (default "Farmkeke")
//   TERMII_BASE_URL    the base URL shown on your Termii dashboard (default https://v3.api.termii.com)
//   TERMII_CHANNEL     "dnd" (default: transactional route that also reaches numbers on
//                      Do-Not-Disturb) or "generic" (cheaper, but DND numbers don't get it)
//   SMS_ENABLED        set to "false" to pause sending without removing the key
//   TERMII_WEBHOOK_KEY a long random string; Termii's delivery reports go to
//                      https://<deployment>.convex.site/termii/delivery?key=<it>
//   TERMII_WEBHOOK_SECRET optional: when set, a report's X-Termii-Signature
//                      header must be the HMAC-SHA512 of its body with this key
import { env } from "../_generated/server";
import { normalizeNigerianPhone } from "./phone";

/** Whether texts actually go out (a Termii key is set and sending isn't paused). */
export const smsConfigured = () => Boolean(env.TERMII_API_KEY) && env.SMS_ENABLED !== "false";

// Two SMS pages (2 × 153 characters) keeps cost predictable.
const MAX_LENGTH = 306;

export type SmsResult =
  | { status: "sent"; reference: string | undefined }
  | { status: "failed"; error: string };

/** "+2348031234567" or "08031234567" → "2348031234567" (what Termii expects). */
export function termiiNumber(phone: string): string | null {
  const normalized = normalizeNigerianPhone(phone);
  return normalized ? normalized.slice(1) : null;
}

export function fitSms(body: string): string {
  const clean = body.replace(/\s+/g, " ").trim();
  return clean.length <= MAX_LENGTH ? clean : `${clean.slice(0, MAX_LENGTH - 1)}…`;
}

/** Sends one text. Never throws: failures come back as { status: "failed" }. */
export async function sendSms(to: string, body: string): Promise<SmsResult> {
  const apiKey = env.TERMII_API_KEY;
  if (!apiKey) return { status: "failed", error: "TERMII_API_KEY is not set" };
  const number = termiiNumber(to);
  if (number === null) return { status: "failed", error: `Not a Nigerian mobile number: ${to}` };
  const base = (env.TERMII_BASE_URL ?? "https://v3.api.termii.com").replace(/\/+$/, "");
  try {
    const response = await fetch(`${base}/api/sms/send`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        api_key: apiKey,
        to: number,
        from: env.TERMII_SENDER_ID ?? "Farmkeke",
        sms: fitSms(body),
        type: "plain",
        channel: env.TERMII_CHANNEL ?? "dnd",
      }),
    });
    const text = await response.text();
    let json: { message_id?: string | number; message?: string; code?: string } = {};
    try {
      json = JSON.parse(text);
    } catch {
      // Termii sometimes answers errors as plain text
    }
    if (!response.ok || json.message_id === undefined) {
      return { status: "failed", error: `Termii ${response.status}: ${(json.message ?? text).slice(0, 300)}` };
    }
    return { status: "sent", reference: String(json.message_id) };
  } catch (error) {
    return { status: "failed", error: error instanceof Error ? error.message : String(error) };
  }
}

/**
 * Calls the number and reads `code` out (Termii's Voice Call): the backup when
 * a network drops texts. Never throws. Termii takes the code as a number, so
 * it must not start with 0 (see voiceCode in phoneAuth).
 */
export async function callWithCode(to: string, code: string): Promise<SmsResult> {
  const apiKey = env.TERMII_API_KEY;
  if (!apiKey) return { status: "failed", error: "TERMII_API_KEY is not set" };
  const number = termiiNumber(to);
  if (number === null) return { status: "failed", error: `Not a Nigerian mobile number: ${to}` };
  if (!/^[1-9]\d{3,7}$/.test(code)) return { status: "failed", error: "A voice code is 4 to 8 digits and can't start with 0" };
  const base = (env.TERMII_BASE_URL ?? "https://v3.api.termii.com").replace(/\/+$/, "");
  try {
    const response = await fetch(`${base}/api/sms/otp/call`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ api_key: apiKey, phone_number: number, code: Number(code) }),
    });
    const text = await response.text();
    let json: { message_id?: string | number; pinId?: string; pin_id?: string; message?: string; code?: string } = {};
    try {
      json = JSON.parse(text);
    } catch {
      // Termii sometimes answers errors as plain text
    }
    if (!response.ok) return { status: "failed", error: `Termii ${response.status}: ${(json.message ?? text).slice(0, 300)}` };
    const reference = json.message_id ?? json.pinId ?? json.pin_id;
    return { status: "sent", reference: reference === undefined ? undefined : String(reference) };
  } catch (error) {
    return { status: "failed", error: error instanceof Error ? error.message : String(error) };
  }
}

export type Delivery = "delivered" | "failed" | "pending";

/**
 * Termii's delivery-report status in three words. Delivered; anything that
 * says it failed, was rejected, expired or hit Do-Not-Disturb; otherwise
 * still on its way ("Sent", "Message Sent", "Accepted"...).
 */
export function deliveryOf(status: string): Delivery {
  const s = status.toLowerCase();
  if (/(undeliv|not deliv|fail|reject|expire|dnd|block|invalid|unknown subscriber|absent)/.test(s)) return "failed";
  if (/(deliver|delivrd)/.test(s)) return "delivered";
  return "pending";
}
