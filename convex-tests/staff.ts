// Test helper: makes a seeded user approved Admin Portal staff with a
// portal-verified session (what the emailed sign-in code does for real).
// The old staffRole names map to the built-in roles; super_admin, which used
// to pass every check, becomes the Founder.
import { BUILT_IN_ROLES } from "../convex/lib/permissions";

const LEGACY: Record<string, string> = {
  super_admin: "founder",
  operations: "operations",
  finance: "finance",
  support: "support",
};

export async function grantStaff(ctx: any, user: { id: any; sessionId: any }, legacyRole: string) {
  const key = LEGACY[legacyRole] ?? legacyRole;
  let role = await ctx.db
    .query("staffRoles")
    .withIndex("by_key", (q: any) => q.eq("key", key))
    .unique();
  if (role === null) {
    const def = BUILT_IN_ROLES.find((r) => r.key === key)!;
    const id = await ctx.db.insert("staffRoles", {
      key: def.key,
      name: def.name,
      description: def.description,
      permissions: [...def.permissions],
      builtIn: true,
      sortOrder: BUILT_IN_ROLES.indexOf(def) + 1,
    });
    role = { _id: id };
  }
  const u = await ctx.db.get(user.id);
  await ctx.db.insert("staffMembers", {
    userId: user.id,
    name: u.name ?? "Staff",
    email: u.email,
    jobTitle: key,
    status: "approved",
    roleId: role._id,
    appliedAt: Date.now(),
  });
  await ctx.db.insert("staffSessions", { sessionId: user.sessionId, userId: user.id, verifiedAt: Date.now() });
}
