// Admin Portal sign-in (A-01, A-02), added to the "password" provider as
// extra flows. Staff sign in with email and password, then a 6-digit code we
// email them; only sessions that passed the code are recorded in
// staffSessions, and every admin function checks for one (lib/auth.ts).
//
//   staffApply       { name, email, password, phone?, jobTitle, note? }  → emails a code
//   staffSignIn      { email, password }                                 → emails a code
//   staffCode        { email, code }                                     → signed in
//   staffReset       { email }                                           → emails a password link
//   staffSetPassword { email, code, newPassword }                        → signed in
import { Email } from "@convex-dev/auth/providers/Email";
import {
  createAccount,
  type GenericActionCtxWithAuthConfig,
  invalidateSessions,
  modifyAccountCredentials,
  retrieveAccount,
  signInViaProvider,
} from "@convex-dev/auth/server";
import { ConvexError } from "convex/values";
import { internal } from "../_generated/api";
import type { DataModel, Doc, Id } from "../_generated/dataModel";
import { PASSWORD_PROVIDER } from "../accountsInternal";
import { sendEmail } from "./email";
import { adminLinks, staffCodeEmail, staffPasswordLinkEmail } from "./emails";
import { looksLikeEmail, normalizeNigerianPhone } from "./phone";

type Ctx = GenericActionCtxWithAuthConfig<DataModel>;
type Params = Record<string, unknown>;
type Authorized = { userId: Id<"users">; sessionId?: Id<"authSessions"> } | null;
type FoundAccount = { accountId: Id<"authAccounts">; userId: Id<"users">; email?: string } | null;
type Member = Doc<"staffMembers"> | null;

export const STAFF_CODE_MINUTES = 10;
export const STAFF_LINK_MINUTES = 60;

const fail = (code: string, extra: Record<string, number> = {}): never => {
  throw new ConvexError({ code, ...extra });
};
const normalizeEmail = (value: unknown) => String(value ?? "").trim().toLowerCase();
const text = (value: unknown, max: number) => String(value ?? "").trim().slice(0, max);

/** Staff passwords: 10+ characters with a letter and a number. */
export function assertStaffPassword(password: string) {
  if (password.length < 10 || !/[a-zA-Z]/.test(password) || !/\d/.test(password)) fail("WEAK_PASSWORD");
}

const memberByEmail = (ctx: Ctx, email: string): Promise<Member> =>
  ctx.runQuery(internal.admin.access.memberByEmail, { email });

// Convex Auth passes the action ctx to sendVerificationRequest as a second
// argument, but its types don't declare it yet.
type Send = (params: { identifier: string; token: string }, ctx: Ctx) => Promise<void>;
const withCtx = (send: Send) => send as unknown as (params: { identifier: string; token: string }) => Promise<void>;

/** The 6-digit code sent after the password (and to confirm an applicant's email). */
const staffCode = Email<DataModel>({
  id: "staff-code",
  maxAge: STAFF_CODE_MINUTES * 60,
  async generateVerificationToken() {
    const n = new Uint32Array(1);
    crypto.getRandomValues(n);
    return String(n[0] % 1_000_000).padStart(6, "0");
  },
  sendVerificationRequest: withCtx(async ({ identifier: email, token }, ctx) => {
    const member = await memberByEmail(ctx, email);
    await sendEmail(
      staffCodeEmail({
        to: email,
        name: member?.name,
        code: token,
        purpose: member?.status === "email_unconfirmed" ? "confirm" : "signin",
        minutes: STAFF_CODE_MINUTES,
      }),
    );
  }),
});

/** The emailed link to make a password: forgot password, and the Founder's first sign-in. */
const staffLink = Email<DataModel>({
  id: "staff-link",
  maxAge: STAFF_LINK_MINUTES * 60,
  async generateVerificationToken() {
    const bytes = new Uint8Array(24);
    crypto.getRandomValues(bytes);
    return Array.from(bytes, (x) => x.toString(16).padStart(2, "0")).join("");
  },
  sendVerificationRequest: withCtx(async ({ identifier: email, token }, ctx) => {
    const member = await memberByEmail(ctx, email);
    await sendEmail(
      staffPasswordLinkEmail({
        to: email,
        name: member?.name,
        link: adminLinks.setPassword(email, token),
        invite: member?.invitePending === true,
        minutes: STAFF_LINK_MINUTES,
      }),
    );
  }),
});

export const staffProviders = [staffCode, staffLink];

export const STAFF_FLOWS = new Set(["staffApply", "staffSignIn", "staffCode", "staffReset", "staffSetPassword"]);

/** Checks the password, with the same errors and pause as the shop's sign-in. */
async function checkPassword(ctx: Ctx, found: NonNullable<FoundAccount>, email: string, password: string) {
  try {
    const { user }: { user: Doc<"users"> } = await retrieveAccount(ctx, {
      provider: PASSWORD_PROVIDER,
      account: { id: email, secret: password },
    });
    if (user.blockedAt !== undefined) fail("BLOCKED");
    return user;
  } catch (error) {
    if (error instanceof ConvexError) throw error;
    const reason = error instanceof Error ? error.message : "";
    if (reason === "TooManyFailedAttempts") fail("TOO_MANY_ATTEMPTS");
    const attemptsLeft: number = await ctx.runQuery(internal.accountsInternal.signInAttemptsLeft, {
      accountId: found.accountId,
      now: Date.now(),
    });
    return attemptsLeft < 1 ? fail("TOO_MANY_ATTEMPTS") : fail("INVALID_CREDENTIALS", { attemptsLeft });
  }
}

const sendCode = (ctx: Ctx, accountId: Id<"authAccounts">, email: string) =>
  signInViaProvider(ctx, staffCode, { accountId, params: { email } });

export async function staffAuthorize(params: Params, ctx: Ctx): Promise<Authorized> {
  switch (params.flow) {
    case "staffApply": {
      const email = normalizeEmail(params.email);
      const name = text(params.name, 80);
      const jobTitle = text(params.jobTitle, 80);
      const note = text(params.note, 1000);
      const password = String(params.password ?? "");
      const rawPhone = text(params.phone, 30);
      if (name.length === 0) fail("NAME_REQUIRED");
      if (!looksLikeEmail(email)) fail("INVALID_EMAIL");
      if (jobTitle.length === 0) fail("JOB_REQUIRED");
      const phone = rawPhone ? normalizeNigerianPhone(rawPhone) : undefined;
      if (rawPhone && !phone) fail("INVALID_PHONE");

      const existing: FoundAccount = await ctx.runQuery(internal.accountsInternal.passwordAccountByEmail, { email });
      let accountId: Id<"authAccounts">;
      let userId: Id<"users">;
      if (existing !== null) {
        // Already has a Farmkeke account (shopping or farming): applying uses
        // that account, so its password proves it's theirs.
        await checkPassword(ctx, existing, email, password);
        accountId = existing.accountId;
        userId = existing.userId;
      } else {
        assertStaffPassword(password);
        const { account, user }: { account: Doc<"authAccounts">; user: Doc<"users"> } = await createAccount<DataModel>(ctx, {
          provider: PASSWORD_PROVIDER,
          account: { id: email, secret: password },
          profile: { email, name },
          shouldLinkViaEmail: false,
          shouldLinkViaPhone: false,
        });
        accountId = account._id;
        userId = user._id;
      }
      await ctx.runMutation(internal.admin.access.recordApplication, {
        userId,
        email,
        name,
        jobTitle,
        phone: phone ?? undefined,
        note: note || undefined,
      });
      await sendCode(ctx, accountId, email);
      return null;
    }

    case "staffSignIn": {
      const email = normalizeEmail(params.email);
      const password = String(params.password ?? "");
      const found: FoundAccount = await ctx.runQuery(internal.accountsInternal.passwordAccountByEmail, { email });
      if (found === null) fail("INVALID_CREDENTIALS");
      await checkPassword(ctx, found!, email, password);
      const member = await memberByEmail(ctx, email);
      if (member === null || member.userId !== found!.userId) fail("NOT_STAFF");
      if (member!.status === "deactivated") fail("STAFF_DEACTIVATED");
      await sendCode(ctx, found!.accountId, email);
      return null;
    }

    case "staffCode": {
      const email = normalizeEmail(params.email);
      const found: FoundAccount = await ctx.runQuery(internal.accountsInternal.passwordAccountByEmail, { email });
      if (found === null) fail("INVALID_CODE");
      let result: Authorized = null;
      try {
        result = await signInViaProvider(ctx, staffCode, { params: { email, code: text(params.code, 12) } });
      } catch {
        result = null;
      }
      if (result === null || result.userId !== found!.userId || result.sessionId === undefined) fail("INVALID_CODE");
      await ctx.runMutation(internal.admin.access.codeVerified, {
        userId: result!.userId,
        sessionId: result!.sessionId!,
      });
      return result;
    }

    case "staffReset": {
      const email = normalizeEmail(params.email);
      const found: FoundAccount = await ctx.runQuery(internal.accountsInternal.passwordAccountByEmail, { email });
      const member = found === null ? null : await memberByEmail(ctx, email);
      // Unknown emails get the same "check your email" result.
      if (found === null || member === null || member.userId !== found.userId || member.status === "deactivated") {
        return null;
      }
      await signInViaProvider(ctx, staffLink, { accountId: found.accountId, params: { email } });
      return null;
    }

    case "staffSetPassword": {
      const email = normalizeEmail(params.email);
      const newPassword = String(params.newPassword ?? "");
      assertStaffPassword(newPassword);
      const found: FoundAccount = await ctx.runQuery(internal.accountsInternal.passwordAccountByEmail, { email });
      if (found === null) fail("INVALID_CODE");
      let result: Authorized = null;
      try {
        result = await signInViaProvider(ctx, staffLink, { params: { email, code: text(params.code, 100) } });
      } catch {
        result = null;
      }
      if (result === null || result.userId !== found!.userId || result.sessionId === undefined) fail("INVALID_CODE");
      await modifyAccountCredentials(ctx, {
        provider: PASSWORD_PROVIDER,
        account: { id: email, secret: newPassword },
      });
      // Every other device signed in to this account is signed out.
      await invalidateSessions(ctx, { userId: result!.userId, except: [result!.sessionId!] });
      // The emailed link proves the inbox, so this session counts as verified.
      await ctx.runMutation(internal.admin.access.codeVerified, {
        userId: result!.userId,
        sessionId: result!.sessionId!,
        passwordSet: true,
      });
      await ctx.scheduler.runAfter(0, internal.notifications.deliver.accountEmail, {
        email: { kind: "password_changed", userId: result!.userId, how: "reset" },
      });
      return result;
    }

    default:
      throw new ConvexError({ code: "BAD_FLOW" });
  }
}
