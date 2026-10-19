// Admin Portal access (A-01, A-02, A-89): the portal gate, verified staff
// sessions, permission checks, applications and their emails, roles, and
// the Founder setup. Resend is mocked (fetch). The sign-in flows themselves
// (password + emailed code) run inside Convex Auth and are exercised through
// their database steps: recordApplication and codeVerified.
import { convexTest } from "convex-test";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { api, internal } from "../convex/_generated/api";
import schema from "../convex/schema";
import { modules } from "./modules";
import { grantStaff } from "./staff";

beforeEach(() => {
  vi.useFakeTimers();
  delete process.env.WEBSITE_URL;
  process.env.AUTH_RESEND_KEY = "re_test";
});
afterEach(() => {
  delete process.env.AUTH_RESEND_KEY;
  delete process.env.JWT_PRIVATE_KEY;
  delete process.env.CONVEX_SITE_URL;
  delete process.env.SITE_URL;
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

type T = ReturnType<typeof convexTest>;
type U = { id: any; sessionId: any };
type Mail = { to: string[]; subject: string; html: string; text: string };

function mailbox() {
  const sent: Mail[] = [];
  vi.stubGlobal("fetch", async (url: string, init: any) => {
    if (String(url).includes("resend")) sent.push(JSON.parse(init.body));
    return new Response(JSON.stringify({ id: "x" }));
  });
  const to = (address: string) => sent.filter((m) => m.to[0] === address).map((m) => m.subject);
  return { sent, to, clear: () => (sent.length = 0) };
}

const flush = (t: T) => t.finishAllScheduledFunctions(() => vi.advanceTimersByTime(1));
const as = (t: T, u: U) => t.withIdentity({ subject: `${u.id}|${u.sessionId}`, tokenIdentifier: `test|${u.id}` });

async function seed(t: T) {
  await t.mutation(internal.admin.setup.ensureRoles, {});
  return await t.run(async (ctx) => {
    const user = async (fields: Record<string, unknown>) => {
      const id = await ctx.db.insert("users", fields as any);
      const sessionId = await ctx.db.insert("authSessions", { userId: id, expirationTime: Date.now() + 1e10 });
      return { id, sessionId };
    };
    const founder = await user({ name: "Femi Founder", email: "femi@farmkeke.com" });
    await grantStaff(ctx, founder, "founder");
    const ops = await user({ name: "Obi Ops", email: "obi@farmkeke.com" });
    await grantStaff(ctx, ops, "operations");
    const applicant = await user({ name: "Amaka Nwosu", email: "amaka@example.com" });
    const shopper = await user({ name: "Ada Obi", email: "ada@example.com" });
    const roles = Object.fromEntries((await ctx.db.query("staffRoles").collect()).map((r) => [r.key, r._id]));
    return { founder, ops, applicant, shopper, roles };
  });
}

const memberOf = (t: T, userId: any) =>
  t.run(async (ctx) => await ctx.db.query("staffMembers").withIndex("by_userId", (q) => q.eq("userId", userId)).unique());

test("the portal gate: signed out, not staff, application, verify, staff", async () => {
  mailbox();
  const t = convexTest(schema, modules);
  const s = await seed(t);

  expect(await t.query(api.admin.access.me, {})).toEqual({ state: "signed_out" });
  expect((await as(t, s.shopper).query(api.admin.access.me, {})).state).toBe("not_staff");

  const founderMe = await as(t, s.founder).query(api.admin.access.me, {});
  expect(founderMe.state).toBe("staff");
  if (founderMe.state === "staff") {
    expect(founderMe.isFounder).toBe(true);
    expect(founderMe.permissions).toContain("staff.manage");
  }

  // A second session on the same account hasn't passed the code yet
  const otherSession = await t.run(async (ctx) =>
    ctx.db.insert("authSessions", { userId: s.ops.id, expirationTime: Date.now() + 1e10 }),
  );
  const unverified = { id: s.ops.id, sessionId: otherSession };
  expect((await as(t, unverified).query(api.admin.access.me, {})).state).toBe("verify");
  await expect(as(t, unverified).query(api.admin.areas.listAllServiceAreas, {})).rejects.toThrow(/STAFF_VERIFY/);

  // The code verifies it for 12 hours
  await t.mutation(internal.admin.access.codeVerified, { userId: s.ops.id, sessionId: otherSession });
  expect((await as(t, unverified).query(api.admin.access.me, {})).state).toBe("staff");
  vi.advanceTimersByTime(12 * 3_600_000 + 1);
  await flush(t);
  expect((await as(t, unverified).query(api.admin.access.me, {})).state).toBe("verify");
});

test("permissions: a role only reaches the functions it allows", async () => {
  mailbox();
  const t = convexTest(schema, modules);
  const s = await seed(t);
  // Operations can see areas and money, but not staff
  await as(t, s.ops).query(api.admin.areas.listAllServiceAreas, {});
  await as(t, s.ops).query(api.admin.ledger.releaseQueue, {});
  await expect(as(t, s.ops).query(api.admin.staff.pendingCount, {})).rejects.toThrow(/FORBIDDEN/);
  await expect(as(t, s.ops).query(api.admin.staff.listMembers, {})).rejects.toThrow(/FORBIDDEN/);
  // Shoppers are never staff
  await expect(as(t, s.shopper).query(api.admin.areas.listAllServiceAreas, {})).rejects.toThrow(/NOT_STAFF/);
});

test("applications: confirm email, review, approve with a role, and the emails", async () => {
  const mail = mailbox();
  const t = convexTest(schema, modules);
  const s = await seed(t);

  await t.mutation(internal.admin.access.recordApplication, {
    userId: s.applicant.id,
    email: "amaka@example.com",
    name: "Amaka Nwosu",
    jobTitle: "Customer support lead",
    note: "I ran support at a delivery startup.",
  });
  expect((await memberOf(t, s.applicant.id))!.status).toBe("email_unconfirmed");
  // Not reviewable until the email is confirmed
  expect(await as(t, s.founder).query(api.admin.staff.pendingCount, {})).toBe(0);

  // The emailed code confirms the email: pending, emails out, managers alerted
  await t.mutation(internal.admin.access.codeVerified, { userId: s.applicant.id, sessionId: s.applicant.sessionId });
  await flush(t);
  const member = (await memberOf(t, s.applicant.id))!;
  expect(member.status).toBe("pending");
  expect(mail.to("amaka@example.com")).toEqual(["We received your Farmkeke admin application"]);
  expect(mail.to("femi@farmkeke.com")).toEqual(["New staff application: Amaka Nwosu"]);
  expect(mail.to("obi@farmkeke.com")).toEqual([]);
  expect(await as(t, s.founder).query(api.admin.staff.unreadAlerts, {})).toBe(1);
  const gate = await as(t, s.applicant).query(api.admin.access.me, {});
  expect(gate.state === "application" && gate.status).toBe("pending");

  // Operations can't decide applications
  await expect(
    as(t, s.ops).mutation(api.admin.staff.approve, { memberId: member._id, roleId: s.roles.support }),
  ).rejects.toThrow(/FORBIDDEN/);

  // More information, answered by the applicant
  mail.clear();
  await as(t, s.founder).mutation(api.admin.staff.requestInfo, { memberId: member._id, message: "Which city are you in?" });
  await flush(t);
  expect(mail.to("amaka@example.com")).toEqual(["We need a bit more for your Farmkeke admin application"]);
  await as(t, s.applicant).mutation(api.admin.access.updateApplication, {
    jobTitle: "Customer support lead",
    note: "Owerri.",
  });
  await flush(t);
  expect(mail.to("femi@farmkeke.com")).toEqual(["Amaka Nwosu updated their staff application"]);

  // The Founder role can't be handed out
  await expect(
    as(t, s.founder).mutation(api.admin.staff.approve, { memberId: member._id, roleId: s.roles.founder }),
  ).rejects.toThrow(/FOUNDER_ROLE/);

  mail.clear();
  await as(t, s.founder).mutation(api.admin.staff.approve, { memberId: member._id, roleId: s.roles.support });
  await flush(t);
  expect(mail.to("amaka@example.com")).toEqual(["You're approved: your Farmkeke admin role is Support"]);
  const approvedMail = mail.sent.find((m) => m.to[0] === "amaka@example.com")!;
  expect(approvedMail.text).toContain("Reply to support messages");

  // Their current session already passed the code, so they're in
  const me = await as(t, s.applicant).query(api.admin.access.me, {});
  expect(me.state).toBe("staff");
  await as(t, s.applicant).query(api.admin.support.list, { paginationOpts: { numItems: 5, cursor: null } });

  // Role change and removing access, with emails; you can't change your own
  mail.clear();
  await as(t, s.founder).mutation(api.admin.staff.changeRole, { memberId: member._id, roleId: s.roles.viewer, reason: "Training first" });
  await flush(t);
  expect(mail.to("amaka@example.com")).toEqual(["Your Farmkeke admin role is now Viewer"]);
  const founderMember = (await memberOf(t, s.founder.id))!;
  await expect(
    as(t, s.founder).mutation(api.admin.staff.setActive, { memberId: founderMember._id, active: false, reason: "x" }),
  ).rejects.toThrow(/OWN_ACCESS/);
  await as(t, s.founder).mutation(api.admin.staff.setActive, { memberId: member._id, active: false, reason: "Left the team" });
  await flush(t);
  expect(mail.to("amaka@example.com")).toContain("Your Farmkeke admin access was removed");
  expect((await as(t, s.applicant).query(api.admin.access.me, {})).state).toBe("deactivated");
  await expect(as(t, s.applicant).query(api.admin.support.list, { paginationOpts: { numItems: 5, cursor: null } })).rejects.toThrow(/NOT_STAFF/);

  // Every decision is in the audit log
  const log = await as(t, s.founder).query(api.admin.staff.listAuditLog, { paginationOpts: { numItems: 20, cursor: null } });
  expect(log.page.map((e) => e.action)).toEqual([
    "staff.deactivate",
    "staff.changeRole",
    "staff.approve",
    "staff.requestInfo",
  ]);
});

test("rejected applicants can apply again", async () => {
  const mail = mailbox();
  const t = convexTest(schema, modules);
  const s = await seed(t);
  const apply = () =>
    t.mutation(internal.admin.access.recordApplication, {
      userId: s.applicant.id,
      email: "amaka@example.com",
      name: "Amaka Nwosu",
      jobTitle: "Driver",
    });
  await apply();
  await t.mutation(internal.admin.access.codeVerified, { userId: s.applicant.id, sessionId: s.applicant.sessionId });
  const member = (await memberOf(t, s.applicant.id))!;
  await as(t, s.founder).mutation(api.admin.staff.reject, { memberId: member._id, reason: "We're not hiring drivers here" });
  await flush(t);
  expect(mail.to("amaka@example.com")).toContain("Your Farmkeke admin application wasn't approved");
  await apply();
  expect((await memberOf(t, s.applicant.id))!.status).toBe("email_unconfirmed");
});

test("roles: create, edit and delete custom roles; the Founder role is fixed", async () => {
  mailbox();
  const t = convexTest(schema, modules);
  const s = await seed(t);
  const founder = as(t, s.founder);
  const roleId = await founder.mutation(api.admin.staff.createRole, {
    name: "Rider desk",
    description: "Riders only",
    permissions: ["riders.view", "riders.manage"],
  });
  await expect(
    founder.mutation(api.admin.staff.createRole, { name: "Bad", description: "", permissions: ["nope.view"] }),
  ).rejects.toThrow(/UNKNOWN_PERMISSION/);
  await founder.mutation(api.admin.staff.updateRole, {
    roleId,
    name: "Rider desk",
    description: "Riders and dispatch",
    permissions: ["riders.view", "riders.manage", "dispatch.manage"],
  });
  await expect(
    founder.mutation(api.admin.staff.updateRole, { roleId: s.roles.founder, name: "x", description: "", permissions: [] }),
  ).rejects.toThrow(/FOUNDER_ROLE/);
  await expect(founder.mutation(api.admin.staff.deleteRole, { roleId: s.roles.viewer })).rejects.toThrow(/BUILT_IN_ROLE/);
  await founder.mutation(api.admin.staff.deleteRole, { roleId });
  const roles = await founder.query(api.admin.staff.listRoles, {});
  expect(roles.map((r) => r.key)).toEqual(["founder", "admin", "operations", "support", "finance", "catalog", "dispatch", "viewer"]);
  // Only roles.manage can edit roles
  await expect(as(t, s.ops).mutation(api.admin.staff.createRole, { name: "x", description: "", permissions: [] })).rejects.toThrow(
    /FORBIDDEN/,
  );
});

test("setup: one Founder only, and legacy staff move over", async () => {
  mailbox();
  const t = convexTest(schema, modules);
  const s = await seed(t);
  await expect(
    t.mutation(internal.admin.setup.makeFounder, { userId: s.shopper.id, email: "ada@example.com", name: "Ada", invitePending: true }),
  ).rejects.toThrow(/already a Founder/);

  const legacy = await t.run(async (ctx) =>
    ctx.db.insert("users", { name: "Fin Old", email: "fin@farmkeke.com", staffRole: "finance" }),
  );
  expect(await t.mutation(internal.admin.setup.migrateLegacyStaff, {})).toEqual(["fin@farmkeke.com → finance"]);
  expect(await t.mutation(internal.admin.setup.migrateLegacyStaff, {})).toEqual([]);
  expect((await memberOf(t, legacy))!.status).toBe("approved");
});

test("staff emails render with portal links", async () => {
  const { staffCodeEmail, staffPasswordLinkEmail, adminLinks } = await import("../convex/lib/emails");
  const code = staffCodeEmail({ to: "a@b.com", name: "Amaka", code: "042917", purpose: "signin", minutes: 10 });
  expect(code.subject).toBe("042917 is your Farmkeke admin code");
  expect(code.text).toContain("https://farmkeke.com/admin/forgot-password");
  const link = adminLinks.setPassword("a@b.com", "abc");
  expect(link).toBe("https://farmkeke.com/admin/set-password?email=a%40b.com&code=abc");
  const invite = staffPasswordLinkEmail({ to: "a@b.com", link, invite: true, minutes: 60 });
  expect(invite.subject).toBe("Set up your Farmkeke admin account");
  expect(invite.html).toContain("Founder");
});

// ---------------------------------------------------------------------------
// The real sign-in flows, through Convex Auth's signIn action

/** A throwaway signing key so Convex Auth can issue tokens in the test. */
async function authEnv() {
  const pair = (await crypto.subtle.generateKey(
    { name: "RSASSA-PKCS1-v1_5", modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: "SHA-256" },
    true,
    ["sign", "verify"],
  )) as CryptoKeyPair;
  const pkcs8 = new Uint8Array(await crypto.subtle.exportKey("pkcs8", pair.privateKey));
  const b64 = btoa(String.fromCharCode(...pkcs8));
  process.env.JWT_PRIVATE_KEY = `-----BEGIN PRIVATE KEY-----\n${b64.match(/.{1,64}/g)!.join("\n")}\n-----END PRIVATE KEY-----`;
  process.env.CONVEX_SITE_URL = "https://example.convex.site";
  process.env.SITE_URL = "https://farmkeke.com";
}

const signIn = (t: T, params: Record<string, unknown>) =>
  t.action(api.auth.signIn, { provider: "password", params }) as Promise<{ tokens?: { token: string } | null }>;
const lastCode = (mail: ReturnType<typeof mailbox>, to: string) => {
  const m = [...mail.sent].reverse().find((x) => x.to[0] === to && /admin code/.test(x.subject))!;
  return /YOUR CODE: (\d{6})/.exec(m.text)![1];
};
const sessionOf = (t: T, userId: any) =>
  t.run(async (ctx) => (await ctx.db.query("staffSessions").withIndex("by_userId", (q) => q.eq("userId", userId)).collect()).at(-1)!);

test("sign-in flows: apply with a code, sign in with a code, Founder sets a password from the link", async () => {
  vi.useRealTimers();
  const mail = mailbox();
  await authEnv();
  const t = convexTest(schema, modules);
  await t.mutation(internal.admin.setup.ensureRoles, {});

  // Apply: weak passwords are refused (staff need 10+ characters)
  const application = { flow: "staffApply", email: "Amaka@Example.com", name: "Amaka Nwosu", jobTitle: "Support lead" };
  await expect(signIn(t, { ...application, password: "short1" })).rejects.toThrow(/WEAK_PASSWORD/);
  const applied = await signIn(t, { ...application, password: "longpassword1" });
  expect(applied.tokens ?? null).toBeNull();
  expect(mail.to("amaka@example.com")).toEqual([expect.stringMatching(/^\d{6} is your Farmkeke admin code$/)]);
  expect(mail.sent.at(-1)!.text).toContain("Confirm your email");

  // A wrong code fails; the right one signs in and sends the application
  await expect(signIn(t, { flow: "staffCode", email: "amaka@example.com", code: "000000" })).rejects.toThrow(/INVALID_CODE/);
  const confirmed = await signIn(t, { flow: "staffCode", email: "amaka@example.com", code: lastCode(mail, "amaka@example.com") });
  expect(confirmed.tokens?.token).toBeTruthy();
  await t.finishAllScheduledFunctions(() => {});
  const amaka = await t.run(async (ctx) => (await ctx.db.query("staffMembers").collect())[0]);
  expect(amaka.status).toBe("pending");
  expect(mail.to("amaka@example.com")).toContain("We received your Farmkeke admin application");

  // Someone who never applied can't use the portal sign-in
  await t.run(async (ctx) => ctx.db.insert("users", { name: "Ada", email: "ada@example.com" }));
  await expect(signIn(t, { flow: "staffSignIn", email: "nobody@example.com", password: "longpassword1" })).rejects.toThrow(
    /INVALID_CREDENTIALS/,
  );

  // The Founder: account made from the dashboard, password from the emailed link
  mail.clear();
  const message = await t.action(internal.admin.setup.createFounder, { email: "femi@farmkeke.com", name: "Femi Founder" });
  expect(message).toContain("emailed to femi@farmkeke.com");
  const invite = mail.sent.find((m) => m.to[0] === "femi@farmkeke.com")!;
  expect(invite.subject).toBe("Set up your Farmkeke admin account");
  const code = /set-password\?email=[^&]+&code=([0-9a-f]+)/.exec(invite.text)![1];
  await expect(
    signIn(t, { flow: "staffSetPassword", email: "femi@farmkeke.com", code, newPassword: "short" }),
  ).rejects.toThrow(/WEAK_PASSWORD/);
  const set = await signIn(t, { flow: "staffSetPassword", email: "femi@farmkeke.com", code, newPassword: "founderpass2026" });
  expect(set.tokens?.token).toBeTruthy();
  const femi = await t.run(async (ctx) =>
    (await ctx.db.query("staffMembers").withIndex("by_email", (q) => q.eq("email", "femi@farmkeke.com")).unique())!,
  );
  expect(femi.invitePending).toBeUndefined();
  const femiSession = await sessionOf(t, femi.userId);
  const femiMe = await as(t, { id: femi.userId, sessionId: femiSession.sessionId }).query(api.admin.access.me, {});
  expect(femiMe.state === "staff" && femiMe.role.key).toBe("founder");
  // The link only works once
  await expect(
    signIn(t, { flow: "staffSetPassword", email: "femi@farmkeke.com", code, newPassword: "founderpass2027" }),
  ).rejects.toThrow(/INVALID_CODE/);

  // Signing in again: password, then a sign-in code
  mail.clear();
  await expect(signIn(t, { flow: "staffSignIn", email: "femi@farmkeke.com", password: "wrongpass2026" })).rejects.toThrow(
    /INVALID_CREDENTIALS/,
  );
  await signIn(t, { flow: "staffSignIn", email: "femi@farmkeke.com", password: "founderpass2026" });
  expect(mail.sent.at(-1)!.text).toContain("Your sign-in code");
  const again = await signIn(t, { flow: "staffCode", email: "femi@farmkeke.com", code: lastCode(mail, "femi@farmkeke.com") });
  expect(again.tokens?.token).toBeTruthy();

  // Forgot password: a link for staff, nothing for unknown emails
  mail.clear();
  await signIn(t, { flow: "staffReset", email: "femi@farmkeke.com" });
  await signIn(t, { flow: "staffReset", email: "nobody@example.com" });
  expect(mail.sent.map((m) => m.subject)).toEqual(["Reset your Farmkeke admin password"]);

  // From the account page, signed in (no sign-in flow call from the browser)
  mail.clear();
  const now = await sessionOf(t, femi.userId);
  await as(t, { id: femi.userId, sessionId: now.sessionId }).action(api.admin.access.sendPasswordLink, {});
  expect(mail.sent.map((m) => m.subject)).toEqual(["Reset your Farmkeke admin password"]);
  await expect(t.action(api.admin.access.sendPasswordLink, {})).rejects.toThrow(/NOT_SIGNED_IN/);
});

// ---------------------------------------------------------------------------
// Phase 2: queues, search and home banners

test("farmer and product queues, farm search, and home banners", async () => {
  mailbox();
  const t = convexTest(schema, modules);
  const s = await seed(t);
  const hours = [{ day: 1, opens: "07:00", closes: "19:00" }];
  const ids = await t.run(async (ctx) => {
    const unitId = await ctx.db.insert("units", { slug: "basket", singular: "basket", plural: "baskets", sortOrder: 1, retired: false });
    await ctx.db.insert("farmerApplications", { userId: s.shopper.id, status: "submitted", submittedAt: Date.now(), categoryIds: [], seasons: [], collectionHours: [] } as any);
    const appId = await ctx.db.insert("farmerApplications", { userId: s.applicant.id, status: "approved", categoryIds: [], seasons: [], collectionHours: [] } as any);
    const farm = (name: string) =>
      ctx.db.insert("farms", {
        userId: s.applicant.id, applicationId: appId, name, phone: "+2348030000009", state: "Imo", lga: "Owerri North", address: "x",
        farmSize: "1_to_5", farmType: "crops", categoryIds: [], collectionAddress: "x", collectionHours: hours, leadTimeHours: 4,
        openDays: [1], holidayMode: false, bankCode: "058", bankName: "GTBank", accountNumber: "0123456789", accountName: "x",
        status: "active", trusted: false,
      } as any);
    const greens = await farm("Ada Greens");
    await farm("Musa Poultry");
    const live = await ctx.db.insert("listings", { farmId: greens, status: "live", name: "Tomatoes", photoIds: [], units: [{ unitId, priceKobo: 450000, stock: 5, minOrder: 1 }], delivery: true, pickup: true, liveAt: Date.now() });
    const waiting = await ctx.db.insert("listings", { farmId: greens, status: "under_review", name: "Peppers", photoIds: [], units: [{ unitId, priceKobo: 200000, stock: 5, minOrder: 1 }], delivery: true, pickup: true, submittedAt: Date.now() });
    return { greens, live, waiting };
  });
  const ops = as(t, s.ops);
  expect(await ops.query(api.admin.farmerRequests.counts, {})).toEqual({ submitted: 1, more_info: 0 });
  expect(await ops.query(api.admin.listings.queueCount, {})).toBe(1);
  const found = await ops.query(api.admin.farmers.list, { search: "musa", paginationOpts: { numItems: 10, cursor: null } });
  expect(found.page.map((f: any) => f.name)).toEqual(["Musa Poultry"]);
  const products = await ops.query(api.admin.listings.list, { status: "live", search: "tomat", paginationOpts: { numItems: 10, cursor: null } });
  expect(products.page.map((l: any) => l.name)).toEqual(["Tomatoes"]);

  // Banners: only live products; the first one that's on and buyable is shown
  const banner = { tag: "Harvest of the week", title: "Fresh tomatoes", buttonLabel: "Shop", active: true, reason: "Launch" };
  await expect(ops.mutation(api.admin.banners.create, { ...banner, listingId: ids.waiting })).rejects.toThrow(/live listing/);
  const first = await ops.mutation(api.admin.banners.create, { ...banner, listingId: ids.live });
  const second = await ops.mutation(api.admin.banners.create, { ...banner, title: "Back-up", listingId: ids.live });
  let rows = await ops.query(api.admin.banners.list, {});
  expect(rows.map((b: any) => [b.title, b.shown])).toEqual([["Fresh tomatoes", true], ["Back-up", false]]);
  await ops.mutation(api.admin.banners.reorder, { orderedIds: [second, first], reason: "Swap" });
  await ops.mutation(api.admin.banners.update, { bannerId: first, ...banner, active: false, listingId: ids.live });
  rows = await ops.query(api.admin.banners.list, {});
  expect(rows.map((b: any) => [b.title, b.active, b.shown])).toEqual([["Back-up", true, true], ["Fresh tomatoes", false, false]]);
  await ops.mutation(api.admin.banners.remove, { bannerId: first, reason: "Old" });
  expect((await ops.query(api.admin.banners.list, {})).length).toBe(1);
  // Finance can't manage banners
  const fin = await t.run(async (ctx) => {
    const id = await ctx.db.insert("users", { name: "Fin", email: "fin@farmkeke.com" });
    const sessionId = await ctx.db.insert("authSessions", { userId: id, expirationTime: Date.now() + 1e10 });
    await grantStaff(ctx, { id, sessionId }, "finance");
    return { id, sessionId };
  });
  await expect(as(t, fin).mutation(api.admin.banners.remove, { bannerId: second, reason: "x" })).rejects.toThrow(/FORBIDDEN/);
});

// ---------------------------------------------------------------------------
// Phase 3: areas, rules, rider profiles and review, order search

test("areas, order rules, rider profiles and review, and finding orders", async () => {
  mailbox();
  const t = convexTest(schema, modules);
  const s = await seed(t);
  const ops = as(t, s.ops);

  // Service areas: rename, map position (must be in Nigeria), no duplicates
  const areaId = await ops.mutation(api.admin.areas.createServiceArea, {
    state: "Imo", name: "New Owerri", lga: "Owerri North", deliveryFeeKobo: 100000, latitude: 5.48, longitude: 7.03, radiusKm: 5, reason: "Launch",
  });
  await ops.mutation(api.admin.areas.createServiceArea, { state: "Imo", name: "Ikenegbu", lga: "Owerri Municipal", deliveryFeeKobo: 80000, reason: "Launch" });
  await expect(ops.mutation(api.admin.areas.updateServiceArea, { areaId, name: "Ikenegbu", reason: "x" })).rejects.toThrow(/already exists/);
  await expect(ops.mutation(api.admin.areas.updateServiceArea, { areaId, latitude: 51.5, reason: "x" })).rejects.toThrow(/Nigeria/);
  await ops.mutation(api.admin.areas.updateServiceArea, { areaId, name: "Owerri North", deliveryFeeKobo: 120000, reason: "Fuel" });
  const areas = await ops.query(api.admin.areas.listAllServiceAreas, {});
  expect(areas.find((a: any) => a._id === areaId)).toMatchObject({ name: "Owerri North", deliveryFeeKobo: 120000, radiusKm: 5 });

  // Order rules, including the two new ones
  await ops.mutation(api.admin.fees.setRules, { pickupHoldDays: 4, disputeReplyHours: 8, reason: "Owner's decision" });
  await expect(ops.mutation(api.admin.fees.setRules, { pickupHoldDays: 30, reason: "x" })).rejects.toThrow(/INVALID_RULE/);
  const rules = await ops.query(api.admin.fees.get, {});
  expect(rules).toMatchObject({ pickupHoldDays: 4, disputeReplyHours: 8, farmerResponseHours: 24 });
  // The commission needs commission.manage, which Operations doesn't have
  await expect(ops.mutation(api.admin.fees.setCommission, { commissionBps: 500, reason: "x" })).rejects.toThrow(/FORBIDDEN/);

  // Rider: added for review, can't be switched on or approved until complete
  const riderId = await ops.mutation(api.admin.riders.create, {
    name: "Emeka Eze", phone: "08035550000", serviceAreaIds: [areaId], pendingReview: true, reason: "New rider",
  });
  expect(await ops.query(api.admin.riders.pendingCount, {})).toBe(1);
  await expect(ops.mutation(api.admin.riders.setActive, { riderId, active: true, reason: "x" })).rejects.toThrow(/RIDER_NOT_APPROVED/);
  await expect(ops.mutation(api.admin.riders.review, { riderId, approve: true, note: "" })).rejects.toThrow(/Still missing/);
  const photo = await t.run(async (ctx) => ctx.storage.store(new Blob(["x"], { type: "image/png" })));
  await expect(
    ops.mutation(api.admin.riders.saveProfile, { riderId, bankCode: "058", accountNumber: "123", accountName: "Emeka", reason: "x" }),
  ).rejects.toThrow(/INVALID_ACCOUNT_NUMBER/);
  await ops.mutation(api.admin.riders.saveProfile, {
    riderId,
    photoStorageId: photo,
    idType: "nin",
    idNumber: "12345678901",
    idPhotoStorageId: photo,
    vehicleType: "motorbike",
    plateNumber: "abc-123-xy",
    guarantor: { name: "Ngozi Eze", phone: "08031112222", address: "Owerri", relationship: "Aunt" },
    bankCode: "058",
    accountNumber: "0123456789",
    accountName: "EMEKA EZE",
    reason: "Profile",
  });
  let rider = await ops.query(api.admin.riders.get, { riderId });
  expect(rider).toMatchObject({ missing: [], plateNumber: "ABC-123-XY", bankName: "Guaranty Trust Bank (GTBank)", reviewStatus: "pending", active: false });
  await ops.mutation(api.admin.riders.review, { riderId, approve: true, note: "Checked in person" });
  rider = await ops.query(api.admin.riders.get, { riderId });
  expect(rider).toMatchObject({ reviewStatus: "approved", active: true, reviewedBy: "Obi Ops" });
  expect(await ops.query(api.admin.riders.pendingCount, {})).toBe(0);
  // Riders added the old way are approved straight away
  const quick = await ops.mutation(api.admin.riders.create, { name: "Tunde", phone: "08035550001", serviceAreaIds: [], reason: "x" });
  expect((await ops.query(api.admin.riders.get, { riderId: quick }))!.reviewStatus).toBe("approved");

  // Finding an order by number, with or without the prefix
  await expect(ops.query(api.admin.orders.findByNumber, { number: "FK-99999" })).resolves.toBeNull();
  const orderId = await t.run(async (ctx) => {
    const contact = { name: "Ada Obi", phone: "+2348031112222" };
    const money = { itemsTotalKobo: 100000, deliveryFeeKobo: 0, totalKobo: 100000 };
    const appId = await ctx.db.insert("farmerApplications", { userId: s.applicant.id, status: "approved", categoryIds: [], seasons: [], collectionHours: [] } as any);
    const farmId = await ctx.db.insert("farms", {
      userId: s.applicant.id, applicationId: appId, name: "Ada Greens", phone: "+2348030000009", state: "Imo", lga: "Owerri North", address: "x",
      farmSize: "1_to_5", farmType: "crops", categoryIds: [], collectionAddress: "x", collectionHours: [], leadTimeHours: 4,
      openDays: [1], holidayMode: false, bankCode: "058", bankName: "GTBank", accountNumber: "0123456789", accountName: "x",
      status: "active", trusted: false,
    } as any);
    const checkoutId = await ctx.db.insert("checkouts", { userId: s.shopper.id, reference: "CK-1", status: "paid", fulfilment: "pickup", contact, ...money });
    return await ctx.db.insert("orders", {
      number: "FK-10234", checkoutId, userId: s.shopper.id, farmId, status: "paid", escrow: "held", fulfilment: "pickup", items: [], contact, ...money,
    });
  });
  expect(await ops.query(api.admin.orders.findByNumber, { number: "10234" })).toBe(orderId);
  expect(await ops.query(api.admin.orders.findByNumber, { number: "fk-10234" })).toBe(orderId);
});

// ---------------------------------------------------------------------------
// Phase 4: customers, assigning work, care counts

test("customers: find, staff can't be blocked, sign out everywhere, reset link; assigning to portal staff", async () => {
  const mail = mailbox();
  const t = convexTest(schema, modules);
  const s = await seed(t);
  const founder = as(t, s.founder);
  const ops = as(t, s.ops);

  // Support staff for assigning
  const sue = await t.run(async (ctx) => {
    const id = await ctx.db.insert("users", { name: "Sue Support", email: "sue@farmkeke.com" });
    const sessionId = await ctx.db.insert("authSessions", { userId: id, expirationTime: Date.now() + 1e10 });
    await grantStaff(ctx, { id, sessionId }, "support");
    return { id, sessionId };
  });
  const assignable = await founder.query(api.admin.staff.assignable, { permission: "support.manage" });
  expect(assignable.map((a: any) => a.name)).toEqual(["Femi Founder", "Obi Ops", "Sue Support"]);
  await expect(founder.query(api.admin.staff.assignable, { permission: "nope" })).rejects.toThrow(/UNKNOWN_PERMISSION/);

  // Find by email or phone; staff accounts are marked and can't be blocked here
  await t.run(async (ctx) => ctx.db.patch(s.shopper.id, { phone: "+2348031112222" }));
  expect((await ops.query(api.admin.consumers.find, { query: "ADA@example.com" })).map((u: any) => u.name)).toEqual(["Ada Obi"]);
  expect((await ops.query(api.admin.consumers.find, { query: "0803 111 2222" })).map((u: any) => u.name)).toEqual(["Ada Obi"]);
  expect((await ops.query(api.admin.consumers.find, { query: "sue@farmkeke.com" }))[0].isStaff).toBe(true);
  await expect(ops.mutation(api.admin.consumers.setBlocked, { userId: sue.id, blocked: true, reason: "x" })).rejects.toThrow(/staff account/i);

  // Sign out everywhere ends the shopper's sessions
  expect(await ops.mutation(api.admin.consumers.signOutEverywhere, { userId: s.shopper.id, reason: "Lost phone" })).toBe(1);
  const detail = await ops.query(api.admin.consumers.get, { userId: s.shopper.id });
  expect(detail!.signedInDevices).toBe(0);

  // Support tickets can be assigned to portal staff with support.manage only
  const ticketId = await t.run(async (ctx) =>
    ctx.db.insert("supportTickets", { userId: s.shopper.id, side: "shop", status: "open", lastMessageAt: Date.now(), lastFrom: "user", preview: "Help" } as any),
  );
  await as(t, sue).mutation(api.admin.support.assign, { ticketId, assigneeId: sue.id });
  await expect(as(t, sue).mutation(api.admin.support.assign, { ticketId, assigneeId: s.shopper.id })).rejects.toThrow(/NOT_STAFF/);
  expect(await as(t, sue).query(api.admin.support.openCount, {})).toBe(1);
  expect(await as(t, sue).query(api.admin.disputes.openCount, {})).toBe(0);
  void mail;
});

// ---------------------------------------------------------------------------
// Phase 5: money summary

test("money summary: held money, holds, and what needs a person; Operations can see but not move money", async () => {
  mailbox();
  const t = convexTest(schema, modules);
  const s = await seed(t);
  await t.run(async (ctx) => {
    const contact = { name: "Ada Obi", phone: "+2348031112222" };
    const appId = await ctx.db.insert("farmerApplications", { userId: s.applicant.id, status: "approved", categoryIds: [], seasons: [], collectionHours: [] } as any);
    const farmId = await ctx.db.insert("farms", {
      userId: s.applicant.id, applicationId: appId, name: "Ada Greens", phone: "+2348030000009", state: "Imo", lga: "Owerri North", address: "x",
      farmSize: "1_to_5", farmType: "crops", categoryIds: [], collectionAddress: "x", collectionHours: [], leadTimeHours: 4,
      openDays: [1], holidayMode: false, bankCode: "058", bankName: "GTBank", accountNumber: "0123456789", accountName: "x",
      status: "active", trusted: false,
    } as any);
    const order = async (n: string, totalKobo: number, extra: Record<string, unknown>) => {
      const money = { itemsTotalKobo: totalKobo, deliveryFeeKobo: 0, totalKobo };
      const checkoutId = await ctx.db.insert("checkouts", { userId: s.shopper.id, reference: `CK-${n}`, status: "paid", fulfilment: "pickup", contact, ...money });
      await ctx.db.insert("orders", { number: `FK-${n}`, checkoutId, userId: s.shopper.id, farmId, fulfilment: "pickup", items: [], contact, ...money, ...extra } as any);
    };
    await order("1", 500000, { status: "paid", escrow: "held" });
    await order("2", 300000, { status: "completed", escrow: "held", escrowHold: true, holdReason: "Checking" });
    await order("3", 200000, { status: "delivered", escrow: "held", unconfirmedFlaggedAt: Date.now() });
    await order("4", 900000, { status: "completed", escrow: "released" });
  });
  const ops = as(t, s.ops);
  expect(await ops.query(api.admin.ledger.summary, {})).toMatchObject({
    heldKobo: 1000000,
    heldOrders: 3,
    onHold: 1,
    toRelease: 1,
    unconfirmed: 1,
    failedPayouts: 0,
    failedRefunds: 0,
  });
  const queue = await ops.query(api.admin.ledger.releaseQueue, {});
  expect(queue.confirmed.map((r: any) => r.number)).toEqual(["FK-2"]);
  expect(queue.unconfirmed.map((r: any) => r.number)).toEqual(["FK-3"]);
  // Operations can see money but not move it
  await expect(ops.mutation(api.admin.ledger.setHold, { orderId: queue.unconfirmed[0].orderId, hold: true, reason: "x" })).rejects.toThrow(/FORBIDDEN/);
});

test("dashboard, global search and exports, each limited by role", async () => {
  mailbox();
  const t = convexTest(schema, modules);
  const s = await seed(t);
  const finance = await t.run(async (ctx) => {
    const id = await ctx.db.insert("users", { name: "Fola Finance", email: "fola@farmkeke.com" } as any);
    const sessionId = await ctx.db.insert("authSessions", { userId: id, expirationTime: Date.now() + 1e10 });
    await grantStaff(ctx, { id, sessionId }, "finance");
    return { id, sessionId };
  });
  await t.run(async (ctx) => {
    await ctx.db.patch("users", s.shopper.id, { phone: "+2348031112222" } as any);
    const contact = { name: "Ada Obi", phone: "+2348031112222" };
    const appId = await ctx.db.insert("farmerApplications", { userId: s.applicant.id, status: "approved", categoryIds: [], seasons: [], collectionHours: [] } as any);
    const farmId = await ctx.db.insert("farms", {
      userId: s.applicant.id, applicationId: appId, name: "Sunrise Greens", phone: "+2348030000009", state: "Imo", lga: "Owerri North", address: "x",
      farmSize: "1_to_5", farmType: "crops", categoryIds: [], collectionAddress: "x", collectionHours: [], leadTimeHours: 4,
      openDays: [1], holidayMode: false, bankCode: "058", bankName: "GTBank", accountNumber: "0123456789", accountName: "x",
      status: "active", trusted: false,
    } as any);
    const order = async (n: string, totalKobo: number, status: string, fulfilment: string) => {
      const money = { itemsTotalKobo: totalKobo, deliveryFeeKobo: 0, totalKobo };
      const checkoutId = await ctx.db.insert("checkouts", { userId: s.shopper.id, reference: `CK-${n}`, status: "paid", fulfilment, contact, ...money } as any);
      await ctx.db.insert("orders", { number: `FK-${n}`, checkoutId, userId: s.shopper.id, farmId, fulfilment, items: [], contact, escrow: "held", paidAt: Date.now(), ...money, status } as any);
    };
    await order("10001", 500000, "paid", "delivery");
    await order("10002", 300000, "out_for_delivery", "delivery");
    await order("10003", 200000, "accepted", "pickup");
  });

  // Dashboard: today's orders, sales and the pipeline
  const dayStart = Date.now() - 60_000;
  const stats = await as(t, s.ops).query(api.admin.dashboard.stats, { dayStart });
  expect(stats.today).toMatchObject({ orders: 3, salesKobo: 1000000, delivery: 2, pickup: 1 });
  expect(stats.week).toHaveLength(7);
  expect(stats.week[6].orders).toBe(3);
  expect(stats.pipeline).toEqual({ waitingForFarms: 1, inProgress: 1, onTheRoad: 1 });
  expect(stats.catalog.activeFarms).toBe(1);
  await expect(t.withIdentity({ subject: `${s.shopper.id}|${s.shopper.sessionId}` }).query(api.admin.dashboard.stats, { dayStart })).rejects.toThrow(/NOT_STAFF/);

  // Search: order number in any form, email, phone, farm name
  const ops = as(t, s.ops);
  for (const q of ["FK-10002", "fk10002", "10002"]) {
    expect((await ops.query(api.admin.search.find, { query: q })).orders.map((o) => o.number)).toEqual(["FK-10002"]);
  }
  expect((await ops.query(api.admin.search.find, { query: "ADA@example.com" })).people.map((p) => p.name)).toEqual(["Ada Obi"]);
  expect((await ops.query(api.admin.search.find, { query: "0803 111 2222" })).people.map((p) => p.name)).toEqual(["Ada Obi"]);
  expect((await ops.query(api.admin.search.find, { query: "sunrise" })).farms.map((f) => f.name)).toEqual(["Sunrise Greens"]);
  expect(await ops.query(api.admin.search.find, { query: "a" })).toEqual({ orders: [], people: [], farms: [], products: [] });
  // Finance can't see customers, so people never show up for them
  const fin = as(t, finance);
  expect((await fin.query(api.admin.search.find, { query: "ada@example.com" })).people).toEqual([]);
  expect((await fin.query(api.admin.search.find, { query: "10001" })).orders).toHaveLength(1);

  // Exports: by date range, each needing its own permission
  const range = { from: Date.now() - 86_400_000, to: Date.now() + 1 };
  const orders = await ops.query(api.admin.exports.orders, range);
  expect(orders.rows.map((r) => r.number).sort()).toEqual(["FK-10001", "FK-10002", "FK-10003"]);
  expect(orders.rows[0].farm).toBe("Sunrise Greens");
  const customers = await ops.query(api.admin.exports.customers, range);
  expect(customers.rows.map((r) => r.email)).toContain("ada@example.com");
  expect((await fin.query(api.admin.exports.payouts, range)).rows).toEqual([]);
  await expect(fin.query(api.admin.exports.customers, range)).rejects.toThrow(/FORBIDDEN/);
  await expect(ops.query(api.admin.exports.orders, { from: range.to, to: range.from })).rejects.toThrow(/INVALID_RANGE/);
  await expect(ops.query(api.admin.exports.orders, { from: 0, to: Date.now() })).rejects.toThrow(/RANGE_TOO_LONG/);
});
