// Paystack over plain fetch (default Convex runtime, no Node needed).
// Docs: https://paystack.com/docs/api/
import { env } from "../_generated/server";

const BASE = "https://api.paystack.co";

/** Real payments are on when the secret key is set. */
export const paymentsLive = () => !!env.PAYSTACK_SECRET_KEY;

/** The "Pay (test)" step: no key yet, or switched on explicitly. */
export const testStepOn = () => !env.PAYSTACK_SECRET_KEY || env.PAYMENTS_TEST_STEP === "true";

export const websiteUrl = () => (env.WEBSITE_URL ?? "https://farmkeke.com").replace(/\/+$/, "");

export type PaystackResult<T> =
  | { ok: true; data: T; message: string }
  | { ok: false; status: number; message: string; data?: T };

/** Calls Paystack with the secret key. Never throws on HTTP errors. */
export async function paystack<T>(
  path: string,
  init: { method?: "GET" | "POST"; body?: Record<string, unknown> } = {},
): Promise<PaystackResult<T>> {
  const key = env.PAYSTACK_SECRET_KEY;
  if (!key) return { ok: false, status: 0, message: "Paystack isn't set up" };
  try {
    const response = await fetch(`${BASE}${path}`, {
      method: init.method ?? (init.body ? "POST" : "GET"),
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: init.body ? JSON.stringify(init.body) : undefined,
    });
    const json = (await response.json().catch(() => ({}))) as { status?: boolean; message?: string; data?: T };
    if (!response.ok || json.status !== true) {
      return { ok: false, status: response.status, message: json.message ?? `HTTP ${response.status}`, data: json.data };
    }
    return { ok: true, data: json.data as T, message: json.message ?? "" };
  } catch (error) {
    return { ok: false, status: 0, message: error instanceof Error ? error.message : "Network error" };
  }
}

/** Checks the x-paystack-signature header: HMAC-SHA512 of the raw body with the secret key. */
export async function validSignature(rawBody: string, signature: string | null): Promise<boolean> {
  const key = env.PAYSTACK_SECRET_KEY;
  if (!key || !signature) return false;
  const encoder = new TextEncoder();
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    encoder.encode(key),
    { name: "HMAC", hash: "SHA-512" },
    false,
    ["sign"],
  );
  const mac = new Uint8Array(await crypto.subtle.sign("HMAC", cryptoKey, encoder.encode(rawBody)));
  const hex = Array.from(mac, (b) => b.toString(16).padStart(2, "0")).join("");
  const expected = signature.trim().toLowerCase();
  if (hex.length !== expected.length) return false;
  // Constant-time compare
  let diff = 0;
  for (let i = 0; i < hex.length; i++) diff |= hex.charCodeAt(i) ^ expected.charCodeAt(i);
  return diff === 0;
}

/** Fields of a Paystack transaction we use (verify and charge.success). */
export type PaystackTransaction = {
  reference: string;
  status: string;
  amount: number;
  currency: string;
  channel?: string;
  paid_at?: string | null;
  gateway_response?: string;
  customer?: { email?: string };
  authorization?: {
    authorization_code?: string;
    card_type?: string;
    last4?: string;
    exp_month?: string;
    exp_year?: string;
    bank?: string;
    reusable?: boolean;
    signature?: string;
  };
};

/** Turns a Paystack transaction into settleCharge's arguments. */
export function chargeArgs(tx: PaystackTransaction) {
  const a = tx.authorization;
  const card =
    a?.authorization_code && a.last4 && tx.channel === "card"
      ? {
          authorizationCode: a.authorization_code,
          brand: (a.card_type ?? "card").trim(),
          last4: a.last4,
          expMonth: a.exp_month ?? "",
          expYear: a.exp_year ?? "",
          bank: a.bank ?? undefined,
          reusable: a.reusable === true,
          signature: a.signature ?? undefined,
        }
      : undefined;
  const paidAt = tx.paid_at ? Date.parse(tx.paid_at) : NaN;
  return {
    reference: tx.reference,
    status: tx.status,
    amountKobo: typeof tx.amount === "number" ? tx.amount : undefined,
    currency: tx.currency,
    channel: tx.channel,
    email: tx.customer?.email,
    paidAt: Number.isNaN(paidAt) ? undefined : paidAt,
    reason: tx.status === "success" ? undefined : tx.gateway_response,
    card,
    // W-27 "Card ending 4081", even when the payment failed
    cardBrand: tx.channel === "card" && a?.last4 ? (a.card_type ?? "card").trim() : undefined,
    cardLast4: tx.channel === "card" ? (a?.last4 ?? undefined) : undefined,
  };
}

/** Paystack needs an email; guests may not give one. */
export const paymentEmail = (email: string | undefined, phone: string) =>
  email && email.includes("@") ? email : `${phone.replace(/\D/g, "")}@guest.farmkeke.com`;
