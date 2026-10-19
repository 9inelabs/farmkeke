// One-time Admin Portal setup, run by a deployment admin from the Convex
// dashboard (Functions → admin/setup) or the CLI. None of these are callable
// from the website or the app.
//
// 1. Create each Founder (also creates the built-in roles). Each Founder gets
//    an email with a link to make their password:
//      npx convex run admin/setup:createFounder '{"email":"you@farmkeke.com","name":"Your Name"}'
// 2. Staff given a role before the portal existed: copy them over.
//      npx convex run admin/setup:migrateLegacyStaff
import { createAccount } from "@convex-dev/auth/server";
import { ConvexError, v } from "convex/values";
import { api, internal } from "../_generated/api";
import type { DataModel, Doc, Id } from "../_generated/dataModel";
import { internalAction, internalMutation, type MutationCtx } from "../_generated/server";
import { PASSWORD_PROVIDER } from "../accountsInternal";
import { writeAudit } from "../lib/audit";
import { BUILT_IN_ROLES, LEGACY_ROLE_MAP } from "../lib/permissions";
import { looksLikeEmail } from "../lib/phone";

/**
 * Creates any missing built-in role. The Founder role always gets every
 * permission (so new permissions reach it); other built-in roles keep the
 * permissions staff have given them.
 */
async function ensureRolesImpl(ctx: MutationCtx) {
  const ids: Record<string, Id<"staffRoles">> = {};
  let order = 0;
  for (const def of BUILT_IN_ROLES) {
    order++;
    const existing = await ctx.db
      .query("staffRoles")
      .withIndex("by_key", (q) => q.eq("key", def.key))
      .unique();
    if (existing === null) {
      ids[def.key] = await ctx.db.insert("staffRoles", {
        key: def.key,
        name: def.name,
        description: def.description,
        permissions: [...def.permissions],
        builtIn: true,
        sortOrder: order,
      });
    } else {
      ids[def.key] = existing._id;
      if (def.key === "founder") await ctx.db.patch("staffRoles", existing._id, { permissions: [...def.permissions] });
    }
  }
  return ids;
}

export const ensureRoles = internalMutation({
  args: {},
  handler: async (ctx) => {
    await ensureRolesImpl(ctx);
    return null;
  },
});

/**
 * Makes the account a Founder. There can be more than one, but only from
 * here: the portal never gives out the Founder role.
 */
export const makeFounder = internalMutation({
  args: { userId: v.id("users"), email: v.string(), name: v.string(), invitePending: v.boolean() },
  handler: async (ctx, args) => {
    const ids = await ensureRolesImpl(ctx);
    const now = Date.now();
    const fields = {
      name: args.name,
      email: args.email,
      jobTitle: "Founder",
      status: "approved" as const,
      roleId: ids.founder,
      emailConfirmedAt: now,
      decidedAt: now,
      invitePending: args.invitePending || undefined,
    };
    const member = await ctx.db
      .query("staffMembers")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .unique();
    const memberId = member?._id ?? (await ctx.db.insert("staffMembers", { ...fields, userId: args.userId, appliedAt: now }));
    if (member !== null) await ctx.db.patch("staffMembers", member._id, fields);
    await writeAudit(ctx, {
      actorId: args.userId,
      action: "staff.createFounder",
      targetTable: "staffMembers",
      targetId: memberId,
      reason: "Founder account created from the Convex dashboard",
    });
    return memberId;
  },
});

const randomSecret = () => {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
};

/**
 * Creates a Founder account and emails them a link to make their password
 * (it works for 60 minutes; after that, "Forgot password" on the portal's
 * sign-in page sends a new one). If the email already has a Farmkeke
 * account, that account becomes a Founder; the link is sent either way, and
 * their old password keeps working until they make a new one. Run it once
 * per Founder.
 */
export const createFounder = internalAction({
  args: { email: v.string(), name: v.string() },
  handler: async (ctx, args): Promise<string> => {
    const email = args.email.trim().toLowerCase();
    const name = args.name.trim();
    if (!looksLikeEmail(email)) throw new ConvexError("That doesn't look like an email address");
    if (name.length === 0) throw new ConvexError("Add the Founder's name");
    const existing: { userId: Id<"users"> } | null = await ctx.runQuery(
      internal.accountsInternal.passwordAccountByEmail,
      { email },
    );
    let userId: Id<"users">;
    if (existing !== null) {
      userId = existing.userId;
    } else {
      // A random password nobody knows; the Founder makes their own from the email.
      const { user }: { user: Doc<"users"> } = await createAccount<DataModel>(ctx, {
        provider: PASSWORD_PROVIDER,
        account: { id: email, secret: randomSecret() },
        profile: { email, name },
        shouldLinkViaEmail: false,
        shouldLinkViaPhone: false,
      });
      userId = user._id;
    }
    await ctx.runMutation(internal.admin.setup.makeFounder, { userId, email, name, invitePending: existing === null });
    await ctx.runAction(api.auth.signIn, { provider: "password", params: { flow: "staffReset", email } });
    if (existing !== null) {
      return `${email} already had a Farmkeke account and is now a Founder. They can sign in at /admin/signin with that password, or use the link just emailed to make a new one.`;
    }
    return `Founder account created. A link to make the password was emailed to ${email}.`;
  },
});

/**
 * Copies staff given a role before the portal (users.staffRole) into
 * staffMembers: super_admin → Admin, the others → the role of the same name.
 * Safe to run more than once.
 */
export const migrateLegacyStaff = internalMutation({
  args: {},
  handler: async (ctx) => {
    const ids = await ensureRolesImpl(ctx);
    const moved: string[] = [];
    for (const [legacy, key] of Object.entries(LEGACY_ROLE_MAP)) {
      const users = await ctx.db
        .query("users")
        .withIndex("by_staffRole", (q) => q.eq("staffRole", legacy as keyof typeof LEGACY_ROLE_MAP))
        .take(200);
      for (const user of users) {
        if (user.isAnonymous || !user.email) continue;
        const member = await ctx.db
          .query("staffMembers")
          .withIndex("by_userId", (q) => q.eq("userId", user._id))
          .unique();
        if (member !== null) continue;
        const now = Date.now();
        await ctx.db.insert("staffMembers", {
          userId: user._id,
          name: user.name ?? user.email,
          email: user.email,
          jobTitle: key === "admin" ? "Admin" : key[0].toUpperCase() + key.slice(1),
          status: "approved",
          roleId: ids[key],
          appliedAt: now,
          emailConfirmedAt: now,
          decidedAt: now,
        });
        moved.push(`${user.email} → ${key}`);
      }
    }
    return moved;
  },
});
