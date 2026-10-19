// Admin Portal access (A-01, A-02): who is using the portal, applications,
// and the 12-hour verified staff sessions. The sign-in flows themselves are
// in lib/staffAuth.ts.
import { getAuthSessionId } from "@convex-dev/auth/server";
import { ConvexError, v } from "convex/values";
import { api, internal } from "../_generated/api";
import { action, internalMutation, internalQuery, mutation, query } from "../_generated/server";
import { getStaff, getViewer, requireAccount, requireStaff, requireStaffContext } from "../lib/auth";
import { notifyStaff } from "../lib/notify";
import { PERMISSIONS } from "../lib/permissions";

const HOUR = 60 * 60 * 1000;
/** How long a verified staff session lasts before the code is needed again. */
export const STAFF_SESSION_HOURS = 12;

/**
 * The portal's gate. One of:
 *   signed_out   no account on this browser
 *   not_staff    signed in, but never applied
 *   application  applied; not approved (yet), with the status and any note
 *   deactivated  access removed
 *   verify       approved, but this session hasn't passed the emailed code
 *   staff        approved and verified: role and permissions
 */
export const me = query({
  args: {},
  handler: async (ctx) => {
    const user = await getViewer(ctx);
    if (user === null || user.isAnonymous) return { state: "signed_out" as const };
    const member = await ctx.db
      .query("staffMembers")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .unique();
    if (member === null) return { state: "not_staff" as const, email: user.email ?? null, name: user.name ?? null };
    const base = { email: member.email, name: member.name };
    if (member.status === "deactivated") {
      return { state: "deactivated" as const, ...base, note: member.decisionNote ?? null };
    }
    if (member.status !== "approved") {
      return {
        state: "application" as const,
        ...base,
        status: member.status,
        jobTitle: member.jobTitle,
        phone: member.phone ?? null,
        applicationNote: member.note ?? null,
        appliedAt: member.appliedAt,
        note: member.decisionNote ?? null,
      };
    }
    const staff = await getStaff(ctx);
    if (staff === null) return { state: "verify" as const, ...base };
    const sessionId = await getAuthSessionId(ctx);
    const session = sessionId
      ? await ctx.db
          .query("staffSessions")
          .withIndex("by_sessionId", (q) => q.eq("sessionId", sessionId))
          .unique()
      : null;
    return {
      state: "staff" as const,
      ...base,
      userId: user._id,
      memberId: member._id,
      role: { id: staff.role._id, key: staff.role.key, name: staff.role.name },
      permissions: [...staff.permissions],
      isFounder: staff.role.key === "founder",
      sessionEndsAt: session ? session.verifiedAt + STAFF_SESSION_HOURS * HOUR : null,
    };
  },
});

/** Every permission, grouped, for the roles screen. Any staff member. */
export const permissionCatalog = query({
  args: {},
  handler: async (ctx) => {
    await requireStaff(ctx, null);
    return PERMISSIONS.map((p) => ({ key: p.key, group: p.group, label: p.label, description: p.description }));
  },
});

/**
 * Applicant: answer a "more information" request (or fix details while
 * waiting). Goes back to pending and tells the people who approve staff.
 */
export const updateApplication = mutation({
  args: { jobTitle: v.string(), phone: v.optional(v.string()), note: v.string() },
  handler: async (ctx, args) => {
    const user = await requireAccount(ctx);
    const member = await ctx.db
      .query("staffMembers")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .unique();
    if (member === null || (member.status !== "pending" && member.status !== "more_info")) {
      throw new ConvexError({ code: "NOT_EDITABLE" });
    }
    const jobTitle = args.jobTitle.trim().slice(0, 80);
    const note = args.note.trim().slice(0, 1000);
    if (jobTitle.length === 0) throw new ConvexError({ code: "JOB_REQUIRED" });
    const wasMoreInfo = member.status === "more_info";
    await ctx.db.patch("staffMembers", member._id, {
      jobTitle,
      phone: args.phone?.trim() || undefined,
      note: note || undefined,
      status: "pending",
    });
    if (wasMoreInfo) {
      await notifyStaff(
        ctx,
        {
          kind: "staff_application_updated",
          title: `Application updated: ${member.name}`,
          body: `${member.name} answered your question.`,
          href: `/admin/staff/${member._id}`,
        },
        "staff.manage",
      );
      await ctx.scheduler.runAfter(0, internal.notifications.staff.send, {
        email: { kind: "new_application", memberId: member._id, updated: true },
      });
    }
    return null;
  },
});

/**
 * Emails the signed-in staff member a link to make a new password. (Calling
 * the staffReset sign-in flow from the browser would sign this tab out.)
 */
export const sendPasswordLink = action({
  args: {},
  handler: async (ctx) => {
    const email: string = await ctx.runQuery(internal.admin.access.myStaffEmail, {});
    await ctx.runAction(api.auth.signIn, { provider: "password", params: { flow: "staffReset", email } });
    return null;
  },
});

export const myStaffEmail = internalQuery({
  args: {},
  handler: async (ctx) => (await requireStaffContext(ctx, null)).member.email,
});

// ---------------------------------------------------------------------------
// Internal: used by the sign-in flows (lib/staffAuth.ts) and setup

export const memberByEmail = internalQuery({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("staffMembers")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();
  },
});

/**
 * staffApply: a new application, or a fresh one after a rejection. Someone
 * who's already pending just gets a new code (the flow sends it).
 */
export const recordApplication = internalMutation({
  args: {
    userId: v.id("users"),
    email: v.string(),
    name: v.string(),
    jobTitle: v.string(),
    phone: v.optional(v.string()),
    note: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const member = await ctx.db
      .query("staffMembers")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .unique();
    const fields = { name: args.name, email: args.email, jobTitle: args.jobTitle, phone: args.phone, note: args.note };
    if (member === null) {
      await ctx.db.insert("staffMembers", { ...fields, userId: args.userId, status: "email_unconfirmed", appliedAt: Date.now() });
      return null;
    }
    switch (member.status) {
      case "approved":
        throw new ConvexError({ code: "ALREADY_STAFF" });
      case "deactivated":
        throw new ConvexError({ code: "STAFF_DEACTIVATED" });
      case "rejected":
        await ctx.db.patch("staffMembers", member._id, {
          ...fields,
          status: "email_unconfirmed",
          appliedAt: Date.now(),
          decidedAt: undefined,
          decidedBy: undefined,
          decisionNote: undefined,
        });
        return null;
      case "email_unconfirmed":
        await ctx.db.patch("staffMembers", member._id, fields);
        return null;
      default:
        // pending / more_info: signing in again is enough
        return null;
    }
  },
});

/**
 * After a correct code (or a password link): records the verified session for
 * 12 hours, and turns a new applicant's application into a pending one.
 */
export const codeVerified = internalMutation({
  args: { userId: v.id("users"), sessionId: v.id("authSessions"), passwordSet: v.optional(v.boolean()) },
  handler: async (ctx, args) => {
    const member = await ctx.db
      .query("staffMembers")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .unique();
    if (member === null) throw new ConvexError({ code: "NOT_STAFF" });
    const now = Date.now();
    const existing = await ctx.db
      .query("staffSessions")
      .withIndex("by_sessionId", (q) => q.eq("sessionId", args.sessionId))
      .unique();
    if (existing === null) {
      const staffSessionId = await ctx.db.insert("staffSessions", {
        sessionId: args.sessionId,
        userId: args.userId,
        verifiedAt: now,
      });
      await ctx.scheduler.runAfter(STAFF_SESSION_HOURS * HOUR, internal.admin.access.expireSession, { staffSessionId });
    }
    await ctx.db.patch("staffMembers", member._id, {
      lastSignInAt: now,
      ...(args.passwordSet ? { invitePending: undefined } : {}),
    });
    if (member.status === "email_unconfirmed") {
      await ctx.db.patch("staffMembers", member._id, { status: "pending", emailConfirmedAt: now });
      await notifyStaff(
        ctx,
        {
          kind: "staff_application",
          title: `New staff application: ${member.name}`,
          body: `${member.jobTitle} · ${member.email}`,
          href: `/admin/staff/${member._id}`,
        },
        "staff.manage",
      );
      await ctx.scheduler.runAfter(0, internal.notifications.staff.send, {
        email: { kind: "application_received", memberId: member._id },
      });
      await ctx.scheduler.runAfter(0, internal.notifications.staff.send, {
        email: { kind: "new_application", memberId: member._id },
      });
    }
    return null;
  },
});

/** A verified staff session's 12 hours are up: the code is needed again. */
export const expireSession = internalMutation({
  args: { staffSessionId: v.id("staffSessions") },
  handler: async (ctx, args) => {
    const row = await ctx.db.get("staffSessions", args.staffSessionId);
    if (row !== null) await ctx.db.delete("staffSessions", row._id);
    return null;
  },
});
