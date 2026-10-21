import { defineApp } from "convex/server";
import { v } from "convex/values";

const app = defineApp({
  env: {
    // Convex Auth (set in Phase 1)
    JWT_PRIVATE_KEY: v.optional(v.string()),
    JWKS: v.optional(v.string()),
    SITE_URL: v.optional(v.string()),
    // Resend, for every email Farmkeke sends (PRD)
    AUTH_RESEND_KEY: v.optional(v.string()),
    // e.g. "Farmkeke <no-reply@farmkeke.com>"; the domain must be verified in Resend
    AUTH_EMAIL_FROM: v.optional(v.string()),
    // Dev only: "true" logs email links to the Convex logs when no Resend key is set
    AUTH_DEV_LOG_EMAILS: v.optional(v.string()),
    // Paystack (Phase 7). Payments are live when the secret key is set.
    PAYSTACK_SECRET_KEY: v.optional(v.string()),
    PAYSTACK_PUBLIC_KEY: v.optional(v.string()),
    // "true" keeps the "Pay (test)" step on even with a key (test keys only)
    PAYMENTS_TEST_STEP: v.optional(v.string()),
    // Where Paystack returns website shoppers, e.g. "https://farmkeke.com"
    WEBSITE_URL: v.optional(v.string()),
    // Optional folder for email images (holds wordmark.png). Unset: emails use
    // this deployment's GET /email/wordmark.png route.
    EMAIL_ASSETS_URL: v.optional(v.string()),
    // Where replies to Farmkeke emails go, e.g. "Farmkeke Support <support@farmkeke.com>"
    EMAIL_REPLY_TO: v.optional(v.string()),
    // Termii SMS (convex/lib/sms.ts). Without TERMII_API_KEY texts are only recorded.
    TERMII_API_KEY: v.optional(v.string()),
    // Approved Sender ID, e.g. "Farmkeke"
    TERMII_SENDER_ID: v.optional(v.string()),
    // Base URL from the Termii dashboard (default https://v3.api.termii.com)
    TERMII_BASE_URL: v.optional(v.string()),
    // "dnd" (default, reaches Do-Not-Disturb numbers) or "generic"
    TERMII_CHANNEL: v.optional(v.string()),
    // "false" pauses texting without removing the key
    SMS_ENABLED: v.optional(v.string()),
  },
});

export default app;
