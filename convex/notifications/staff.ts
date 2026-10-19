// Admin Portal staff emails (A-01, A-02, A-89): application received, new
// application (to the people who approve staff), approved with the role,
// rejected, more information, role changed, access removed or back.
// Scheduled by admin/access.ts and admin/staff.ts, so a failed email never
// fails the decision itself.
import { v } from "convex/values";
import { internal } from "../_generated/api";
import { env, internalAction, internalQuery } from "../_generated/server";
import { sendEmail } from "../lib/email";
import {
  staffAccessEmail,
  staffApplicationReceivedEmail,
  staffApprovedEmail,
  staffMoreInfoEmail,
  staffNewApplicationEmail,
  staffRejectedEmail,
  staffRoleChangedEmail,
  type Email,
} from "../lib/emails";
import { staffWithPermission } from "../lib/notify";
import { PERMISSIONS } from "../lib/permissions";

const emailOn = () => Boolean(env.AUTH_RESEND_KEY) || env.AUTH_DEV_LOG_EMAILS === "true";

async function emailQuietly(email: Email) {
  if (!emailOn()) return;
  try {
    await sendEmail(email);
  } catch (error) {
    console.error("Email not sent", email.subject, error instanceof Error ? error.message : error);
  }
}

/** The member, their role, and the people who approve staff (for "new application"). */
export const emailData = internalQuery({
  args: { memberId: v.id("staffMembers"), withManagers: v.boolean() },
  handler: async (ctx, args) => {
    const member = await ctx.db.get("staffMembers", args.memberId);
    if (member === null) return null;
    const role = member.roleId ? await ctx.db.get("staffRoles", member.roleId) : null;
    const labels = new Map<string, string>(PERMISSIONS.map((p) => [p.key, p.label]));
    const managers = args.withManagers
      ? (await staffWithPermission(ctx, "staff.manage")).map((m) => ({ email: m.email, name: m.name }))
      : [];
    return {
      member: {
        name: member.name,
        email: member.email,
        jobTitle: member.jobTitle,
        note: member.note ?? null,
        decisionNote: member.decisionNote ?? null,
      },
      role: role
        ? {
            name: role.name,
            description: role.description,
            can: role.permissions.map((p) => labels.get(p)).filter((l): l is string => l !== undefined),
          }
        : null,
      managers,
    };
  },
});

export const send = internalAction({
  args: {
    email: v.union(
      v.object({ kind: v.literal("application_received"), memberId: v.id("staffMembers") }),
      v.object({ kind: v.literal("new_application"), memberId: v.id("staffMembers"), updated: v.optional(v.boolean()) }),
      v.object({ kind: v.literal("approved"), memberId: v.id("staffMembers") }),
      v.object({ kind: v.literal("rejected"), memberId: v.id("staffMembers") }),
      v.object({ kind: v.literal("more_info"), memberId: v.id("staffMembers") }),
      v.object({ kind: v.literal("role_changed"), memberId: v.id("staffMembers"), from: v.string(), reason: v.string() }),
      v.object({ kind: v.literal("access"), memberId: v.id("staffMembers"), removed: v.boolean(), reason: v.string() }),
    ),
  },
  handler: async (ctx, args) => {
    const e = args.email;
    const data = await ctx.runQuery(internal.notifications.staff.emailData, {
      memberId: e.memberId,
      withManagers: e.kind === "new_application",
    });
    if (data === null) return null;
    const { member, role } = data;
    const to = member.email;
    switch (e.kind) {
      case "application_received":
        await emailQuietly(staffApplicationReceivedEmail({ to, name: member.name, jobTitle: member.jobTitle }));
        return null;
      case "new_application":
        for (const manager of data.managers) {
          await emailQuietly(
            staffNewApplicationEmail({
              to: manager.email,
              name: manager.name,
              memberId: e.memberId,
              applicant: member.name,
              applicantEmail: member.email,
              jobTitle: member.jobTitle,
              note: member.note ?? undefined,
              updated: e.updated,
            }),
          );
        }
        return null;
      case "approved":
        if (role) {
          await emailQuietly(
            staffApprovedEmail({ to, name: member.name, role: role.name, roleDescription: role.description, can: role.can }),
          );
        }
        return null;
      case "rejected":
        await emailQuietly(staffRejectedEmail({ to, name: member.name, reason: member.decisionNote ?? "" }));
        return null;
      case "more_info":
        await emailQuietly(staffMoreInfoEmail({ to, name: member.name, message: member.decisionNote ?? "" }));
        return null;
      case "role_changed":
        if (role) {
          await emailQuietly(
            staffRoleChangedEmail({
              to,
              name: member.name,
              from: e.from,
              role: role.name,
              roleDescription: role.description,
              reason: e.reason,
            }),
          );
        }
        return null;
      case "access":
        await emailQuietly(staffAccessEmail({ to, name: member.name, removed: e.removed, reason: e.reason, role: role?.name }));
        return null;
    }
  },
});
