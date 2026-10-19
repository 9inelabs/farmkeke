// Farmkeke's password sign-in, built on Convex Auth's credentials primitives
// (same storage and hashing as its stock Password provider), plus:
//  - farmers can sign in with their phone number instead of email (M-50)
//  - errors the app can show: wrong details with tries left, paused, taken
//  - password reset by an emailed link (M-53 to M-57)
import { ConvexCredentials } from "@convex-dev/auth/providers/ConvexCredentials";
import { Email } from "@convex-dev/auth/providers/Email";
import {
  type ConvexCredentialsConfig,
  createAccount,
  invalidateSessions,
  modifyAccountCredentials,
  retrieveAccount,
  signInViaProvider,
} from "@convex-dev/auth/server";
import { ConvexError } from "convex/values";
import { Scrypt } from "lucia";
import { internal } from "../_generated/api";
import type { DataModel, Doc, Id } from "../_generated/dataModel";
import { env } from "../_generated/server";
import { PASSWORD_PROVIDER } from "../accountsInternal";
import { sendEmail } from "./email";
// The reset email in the shared design (same signature as email.ts's older one)
import { passwordResetEmail } from "./emails";
import { looksLikeEmail, normalizeNigerianPhone } from "./phone";
import { STAFF_FLOWS, staffAuthorize, staffProviders } from "./staffAuth";

export type AuthErrorCode =
  | "INVALID_CREDENTIALS"
  | "TOO_MANY_ATTEMPTS"
  | "EMAIL_TAKEN"
  | "INVALID_EMAIL"
  | "WEAK_PASSWORD"
  | "NAME_REQUIRED"
  | "INVALID_CODE"
  | "BLOCKED";

const fail = (code: AuthErrorCode, extra: Record<string, number> = {}): never => {
  throw new ConvexError({ code, ...extra });
};

/** Rules shown as you type on M-51 and M-55. */
export function passwordProblems(password: string) {
  return {
    length: password.length >= 8,
    number: /\d/.test(password),
    letter: /[a-zA-Z]/.test(password),
  };
}

export function assertStrongPassword(password: string) {
  const rules = passwordProblems(password);
  if (!rules.length || !rules.number || !rules.letter) fail("WEAK_PASSWORD");
}

const normalizeEmail = (value: unknown) => String(value ?? "").trim().toLowerCase();

const RESET_LINK_MINUTES = 30;

/** Emails the reset link. Single use; expires after 30 minutes (M-54, M-57). */
const passwordReset = Email<DataModel>({
  id: "password-reset",
  maxAge: RESET_LINK_MINUTES * 60,
  async generateVerificationToken() {
    const bytes = new Uint8Array(24);
    crypto.getRandomValues(bytes);
    return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
  },
  async sendVerificationRequest({ identifier: email, token }) {
    // The link opens a small Convex-hosted page that hands off to the app, so
    // it works in every mail client (many strip custom-scheme links).
    const link = `${env.CONVEX_SITE_URL}/reset-password?email=${encodeURIComponent(email)}&code=${token}`;
    await sendEmail(passwordResetEmail(email, link));
  },
});

type Authorized = { userId: Id<"users">; sessionId?: Id<"authSessions"> } | null;
type FoundAccount = { accountId: Id<"authAccounts">; userId: Id<"users">; email?: string } | null;

export const FarmkekePassword: ConvexCredentialsConfig = ConvexCredentials<DataModel>({
  id: PASSWORD_PROVIDER,
  extraProviders: [passwordReset, ...staffProviders],
  crypto: {
    hashSecret: async (password) => await new Scrypt().hash(password),
    verifySecret: async (password, hash) => await new Scrypt().verify(hash, password),
  },
  authorize: async (params, ctx): Promise<Authorized> => {
    // Admin Portal flows (lib/staffAuth.ts)
    if (STAFF_FLOWS.has(String(params.flow))) return await staffAuthorize(params, ctx);
    switch (params.flow) {
      case "signUp": {
        const email = normalizeEmail(params.email);
        const name = String(params.name ?? "").trim();
        const password = String(params.password ?? "");
        if (name.length === 0) fail("NAME_REQUIRED");
        if (!looksLikeEmail(email)) fail("INVALID_EMAIL");
        assertStrongPassword(password);
        const existing: FoundAccount = await ctx.runQuery(internal.accountsInternal.passwordAccountByEmail, {
          email,
        });
        if (existing !== null) fail("EMAIL_TAKEN");
        const { user }: { user: Doc<"users"> } = await createAccount(ctx, {
          provider: PASSWORD_PROVIDER,
          account: { id: email, secret: password },
          profile: { email, name },
          shouldLinkViaEmail: false,
          shouldLinkViaPhone: false,
        });
        // Welcome email (Resend), sent in the background
        await ctx.scheduler.runAfter(0, internal.notifications.deliver.welcome, { userId: user._id });
        return { userId: user._id };
      }

      case "signIn": {
        // "identifier" is an email, or a farmer's phone number.
        const identifier = String(params.identifier ?? "").trim();
        const password = String(params.password ?? "");
        const phone = looksLikeEmail(identifier) ? null : normalizeNigerianPhone(identifier);
        const found: FoundAccount = phone
          ? await ctx.runQuery(internal.accountsInternal.passwordAccountByPhone, { phone })
          : await ctx.runQuery(internal.accountsInternal.passwordAccountByEmail, {
              email: normalizeEmail(identifier),
            });
        if (found === null) fail("INVALID_CREDENTIALS");
        const email: string = phone ? found!.email! : normalizeEmail(identifier);
        try {
          const { user }: { user: Doc<"users"> } = await retrieveAccount(ctx, {
            provider: PASSWORD_PROVIDER,
            account: { id: email, secret: password },
          });
          if (user.blockedAt !== undefined) fail("BLOCKED");
          return { userId: user._id };
        } catch (error) {
          if (error instanceof ConvexError) throw error;
          const reason = error instanceof Error ? error.message : "";
          if (reason === "TooManyFailedAttempts") fail("TOO_MANY_ATTEMPTS");
          const attemptsLeft: number = await ctx.runQuery(internal.accountsInternal.signInAttemptsLeft, {
            accountId: found!.accountId,
            now: Date.now(),
          });
          return attemptsLeft < 1
            ? fail("TOO_MANY_ATTEMPTS")
            : fail("INVALID_CREDENTIALS", { attemptsLeft });
        }
      }

      case "reset": {
        const email = normalizeEmail(params.email);
        const found: FoundAccount = await ctx.runQuery(internal.accountsInternal.passwordAccountByEmail, {
          email,
        });
        // Unknown emails get the same "check your email" result, so the form
        // can't be used to find out who has an account.
        if (found === null) return null;
        await signInViaProvider(ctx, passwordReset, {
          accountId: found.accountId,
          params: { email },
        });
        return null;
      }

      case "reset-verification": {
        const email = normalizeEmail(params.email);
        const newPassword = String(params.newPassword ?? "");
        assertStrongPassword(newPassword);
        const found: FoundAccount = await ctx.runQuery(internal.accountsInternal.passwordAccountByEmail, {
          email,
        });
        if (found === null) fail("INVALID_CODE");
        let result: Authorized;
        try {
          result = await signInViaProvider(ctx, passwordReset, {
            params: { email, code: String(params.code ?? "") },
          });
        } catch {
          // Wrong, expired or already-used link (M-57)
          result = null;
        }
        if (result === null || result.userId !== found!.userId) fail("INVALID_CODE");
        await modifyAccountCredentials(ctx, {
          provider: PASSWORD_PROVIDER,
          account: { id: email, secret: newPassword },
        });
        // Other phones signed in to this account are signed out (M-56).
        const keep = result!.sessionId;
        await invalidateSessions(ctx, { userId: result!.userId, except: keep ? [keep] : [] });
        // W-42d security email, in the background
        await ctx.scheduler.runAfter(0, internal.notifications.deliver.accountEmail, {
          email: { kind: "password_changed", userId: result!.userId, how: "reset" },
        });
        return { userId: result!.userId, sessionId: result!.sessionId };
      }

      default:
        throw new ConvexError({ code: "BAD_FLOW" });
    }
  },
});
