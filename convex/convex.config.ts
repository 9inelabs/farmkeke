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
  },
});

export default app;
