// Farmer sign-in by phone (24 Oct 2026): the database side of lib/phoneAuth.ts.
// - Sign-up and "Forgot PIN" prove the phone with a texted 6-digit code: only
//   a hash is kept, good for 10 minutes and 5 tries, 5 codes an hour.
// - Logging in is the phone and a 4-digit PIN, kept as the secret of the
//   farmer's "phone-code" auth account (same hashing and lockout as passwords).
import { ConvexError, v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { internal } from "./_generated/api";
import { action, env, internalMutation, internalQuery, query } from "./_generated/server";
import { getViewer } from "./lib/auth";
import { codeHash } from "./lib/codeHash";
import { normalizeNigerianPhone } from "./lib/phone";
import { hitLimit } from "./lib/rateLimit";
import { sendSms, smsConfigured } from "./lib/sms";

export const PHONE_PROVIDER = "phone-code";
const CODE_TTL_MS = 10 * 60_000;
const MAX_TRIES = 5;
const HOUR = 3_600_000;
// After the code checks out, time to choose a PIN before it's used to sign in
const PIN_STEP_MS = 30 * 60_000;

/** Stores a fresh code for the phone (replacing any earlier one). */
export const issueCode = internalMutation({
  args: { phone: v.string(), codeHash: v.string() },
  handler: async (ctx, args) => {
    await hitLimit(ctx, `phone-code:${args.phone}`, 5, HOUR);
    const old = await ctx.db
      .query("phoneCodes")
      .withIndex("by_phone", (q) => q.eq("phone", args.phone))
      .take(10);
    for (const row of old) await ctx.db.delete("phoneCodes", row._id);
    await ctx.db.insert("phoneCodes", { phone: args.phone, codeHash: args.codeHash, expiresAt: Date.now() + CODE_TTL_MS, attempts: 0 });
    return null;
  },
});

function sixDigits() {
  const n = new Uint32Array(1);
  crypto.getRandomValues(n);
  return String(n[0]! % 1_000_000).padStart(6, "0");
}

/**
 * Sign-up and Forgot PIN, step 1: texts a 6-digit code. Not a sign-in call,
 * so whoever is signed in on the phone (a guest with orders) stays signed in
 * until the PIN step. Without Termii, codes are only written to the Convex
 * logs when AUTH_DEV_LOG_EMAILS is "true"; otherwise this fails with SMS_UNAVAILABLE.
 */
export const sendCode = action({
  args: { phone: v.string() },
  handler: async (ctx, args): Promise<null> => {
    const phone = normalizeNigerianPhone(args.phone);
    if (phone === null) throw new ConvexError({ code: "INVALID_PHONE" });
    const devLog = env.AUTH_DEV_LOG_EMAILS === "true";
    if (!smsConfigured() && !devLog) throw new ConvexError({ code: "SMS_UNAVAILABLE" });
    const code = sixDigits();
    await ctx.runMutation(internal.phoneAuth.issueCode, { phone, codeHash: await codeHash(code, phone) });
    if (smsConfigured()) {
      const sent = await sendSms(phone, `Your Farmkeke code is ${code}. It expires in 10 minutes. Don't share it with anyone.`);
      if (sent.status === "failed") {
        console.error("Sign-up code not sent", sent.error);
        throw new ConvexError({ code: "SMS_FAILED" });
      }
    } else {
      console.log(`[dev] Farmkeke code for ${phone}: ${code}`);
    }
    return null;
  },
});

/**
 * Sign-up and Forgot PIN, step 2: is this the code? Wrong tries count as
 * they do when signing in. A right code isn't used up: the PIN step signs
 * in with it (flow "verify" with a pin), so it stays good for 30 minutes.
 */
export const checkCode = action({
  args: { phone: v.string(), code: v.string() },
  handler: async (ctx, args): Promise<null> => {
    const phone = normalizeNigerianPhone(args.phone);
    if (phone === null) throw new ConvexError({ code: "INVALID_PHONE" });
    const code = args.code.replace(/\D/g, "");
    if (code.length !== 6) throw new ConvexError({ code: "INVALID_CODE" });
    const r: { error: "INVALID_CODE"; attemptsLeft: number } | null = await ctx.runMutation(internal.phoneAuth.peekCode, {
      phone,
      codeHash: await codeHash(code, phone),
    });
    if (r !== null) throw new ConvexError({ code: r.error, attemptsLeft: r.attemptsLeft });
    return null;
  },
});

export const peekCode = internalMutation({
  args: { phone: v.string(), codeHash: v.string() },
  // A wrong code is returned, not thrown: a throw would roll back the count of tries
  handler: async (ctx, args): Promise<{ error: "INVALID_CODE"; attemptsLeft: number } | null> => {
    const row = await ctx.db
      .query("phoneCodes")
      .withIndex("by_phone", (q) => q.eq("phone", args.phone))
      .first();
    if (row === null || row.expiresAt < Date.now()) throw new ConvexError({ code: "CODE_EXPIRED" });
    if (row.attempts >= MAX_TRIES) throw new ConvexError({ code: "TOO_MANY_ATTEMPTS" });
    if (row.codeHash !== args.codeHash) {
      await ctx.db.patch("phoneCodes", row._id, { attempts: row.attempts + 1 });
      return { error: "INVALID_CODE", attemptsLeft: MAX_TRIES - row.attempts - 1 };
    }
    await ctx.db.patch("phoneCodes", row._id, { expiresAt: Math.max(row.expiresAt, Date.now() + PIN_STEP_MS) });
    return null;
  },
});

/**
 * Checks a code and decides who is signing in:
 * - the account that already has this phone (sign in as them);
 * - otherwise the person signed in on this phone (the phone is added to
 *   their account; a guest becomes a full account, keeping their orders);
 * - otherwise a new account for the phone.
 * A different account already signed in can't take someone else's phone.
 * The chosen account gets a "phone-code" auth account, which holds the PIN.
 */
export const useCode = internalMutation({
  args: { phone: v.string(), codeHash: v.string(), currentUserId: v.union(v.id("users"), v.null()) },
  // A wrong code is returned, not thrown: a throw would roll back the count of tries
  handler: async (ctx, args): Promise<{ userId: Id<"users">; hasPin: boolean } | { error: "INVALID_CODE"; attemptsLeft: number }> => {
    const row = await ctx.db
      .query("phoneCodes")
      .withIndex("by_phone", (q) => q.eq("phone", args.phone))
      .first();
    if (row === null || row.expiresAt < Date.now()) throw new ConvexError({ code: "CODE_EXPIRED" });
    if (row.attempts >= MAX_TRIES) throw new ConvexError({ code: "TOO_MANY_ATTEMPTS" });
    if (row.codeHash !== args.codeHash) {
      await ctx.db.patch("phoneCodes", row._id, { attempts: row.attempts + 1 });
      return { error: "INVALID_CODE", attemptsLeft: MAX_TRIES - row.attempts - 1 };
    }
    await ctx.db.delete("phoneCodes", row._id);

    const now = Date.now();
    const owners = await ctx.db
      .query("users")
      .withIndex("phone", (q) => q.eq("phone", args.phone))
      .take(10);
    // Only a proved phone, or an approved farm's phone, makes someone its owner.
    // A number typed into a profile and never proved can't be taken over.
    let owner = null;
    for (const u of owners) {
      if (u.isAnonymous) continue;
      const farm = await ctx.db.query("farms").withIndex("by_userId", (q) => q.eq("userId", u._id)).unique();
      if (u.phoneVerificationTime !== undefined || farm !== null) {
        owner = u;
        break;
      }
    }
    const current = args.currentUserId === null ? null : await ctx.db.get("users", args.currentUserId);

    let userId: Id<"users">;
    if (owner !== null) {
      if (current !== null && !current.isAnonymous && current._id !== owner._id) throw new ConvexError({ code: "PHONE_TAKEN" });
      if (owner.blockedAt !== undefined) throw new ConvexError({ code: "BLOCKED" });
      await ctx.db.patch("users", owner._id, { phoneVerificationTime: now });
      userId = owner._id;
    } else if (current !== null) {
      if (current.blockedAt !== undefined) throw new ConvexError({ code: "BLOCKED" });
      await ctx.db.patch("users", current._id, { phone: args.phone, phoneVerificationTime: now, isAnonymous: false });
      userId = current._id;
    } else {
      userId = await ctx.db.insert("users", { phone: args.phone, phoneVerificationTime: now });
    }

    // One "phone-code" account per person, for this phone
    const byPhone = await ctx.db
      .query("authAccounts")
      .withIndex("providerAndAccountId", (q) => q.eq("provider", PHONE_PROVIDER).eq("providerAccountId", args.phone))
      .unique();
    const mine = await ctx.db
      .query("authAccounts")
      .withIndex("userIdAndProvider", (q) => q.eq("userId", userId).eq("provider", PHONE_PROVIDER))
      .unique();
    if (byPhone !== null && byPhone.userId !== userId) await ctx.db.delete("authAccounts", byPhone._id);
    if (mine !== null) {
      if (mine.providerAccountId !== args.phone) {
        // A new number: the old PIN went with the old number
        await ctx.db.patch("authAccounts", mine._id, { providerAccountId: args.phone, phoneVerified: args.phone, secret: undefined });
        return { userId, hasPin: false };
      }
      return { userId, hasPin: mine.secret !== undefined };
    }
    await ctx.db.insert("authAccounts", { userId, provider: PHONE_PROVIDER, providerAccountId: args.phone, phoneVerified: args.phone });
    return { userId, hasPin: false };
  },
});

/** For setting a PIN: the person's phone and when it was last proved with a code. */
export const pinGate = internalQuery({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const user = await ctx.db.get("users", args.userId);
    if (user === null) return null;
    const account = await ctx.db
      .query("authAccounts")
      .withIndex("userIdAndProvider", (q) => q.eq("userId", user._id).eq("provider", PHONE_PROVIDER))
      .unique();
    return { phone: account?.providerAccountId ?? null, verifiedAt: user.phoneVerificationTime ?? null };
  },
});

/** The phone account behind a number (for sign-in tries left), and whether it's blocked. */
export const accountFor = internalQuery({
  args: { phone: v.string() },
  handler: async (ctx, args) => {
    const account = await ctx.db
      .query("authAccounts")
      .withIndex("providerAndAccountId", (q) => q.eq("provider", PHONE_PROVIDER).eq("providerAccountId", args.phone))
      .unique();
    if (account === null) return null;
    const user = await ctx.db.get("users", account.userId);
    return { accountId: account._id, blocked: user?.blockedAt !== undefined };
  },
});

/** The signed-in person's phone sign-in: their number, and whether a PIN is set. */
export const mine = query({
  args: {},
  handler: async (ctx) => {
    const user = await getViewer(ctx);
    if (user === null) return null;
    const account = await ctx.db
      .query("authAccounts")
      .withIndex("userIdAndProvider", (q) => q.eq("userId", user._id).eq("provider", PHONE_PROVIDER))
      .unique();
    return { phone: account?.providerAccountId ?? user.phone ?? null, hasPhoneLogin: account !== null, hasPin: account?.secret !== undefined };
  },
});
