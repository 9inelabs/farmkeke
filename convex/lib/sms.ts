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
