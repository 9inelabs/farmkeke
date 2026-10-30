// Admin → Messages (30 Oct 2026): staff send a notification to every shopper,
// every farmer, both, or one person, in the app and by push only.
import { convexTest } from "convex-test";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { api } from "../convex/_generated/api";
import schema from "../convex/schema";
import { modules } from "./modules";
import { grantStaff } from "./staff";

type T = ReturnType<typeof convexTest>;
type U = { id: any; sessionId: any };
const as = (t: T, u: U) => t.withIdentity({ subject: `${u.id}|${u.sessionId}`, tokenIdentifier: `test|${u.id}` });

// What reached Expo's push service and Resend/Termii
let pushed: { to: string; title: string }[] = [];
let other: string[] = [];
beforeEach(() => {
  vi.useFakeTimers();
  pushed = [];
  other = [];
  vi.stubGlobal("fetch", async (url: string, init: any) => {
    if (String(url).includes("exp.host")) {
      const body = JSON.parse(init.body);
      for (const m of body) pushed.push({ to: m.to, title: m.title });
      return new Response(JSON.stringify({ data: body.map(() => ({ status: "ok", id: "x" })) }));
    }
    other.push(String(url));
    return new Response(JSON.stringify({ id: "x", data: [] }));
  });
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

const flush = (t: T) => t.finishAllScheduledFunctions(() => vi.advanceTimersByTime(1));
const hours = [0, 1, 2, 3, 4, 5, 6].map((day) => ({ day, opens: "07:00", closes: "19:00" }));

async function seed(t: T) {
  return await t.run(async (ctx) => {
    const user = async (fields: Record<string, unknown>, token?: string) => {
      const id = await ctx.db.insert("users", fields as any);
      const sessionId = await ctx.db.insert("authSessions", { userId: id, expirationTime: Date.now() + 1e10 });
      if (typeof fields.staffRole === "string") await grantStaff(ctx, { id, sessionId }, fields.staffRole);
      if (token) await ctx.db.insert("pushTokens", { userId: id, token, platform: "android", sessionId });
      return { id, sessionId };
    };
    const ada = await user({ name: "Ada", email: "ada@example.com", phone: "+2348031110001" }, "ExponentPushToken[ada]");
    const bayo = await user({ name: "Bayo", email: "bayo@example.com" });
    const guest = await user({ isAnonymous: true }, "ExponentPushToken[guest]");
    const blocked = await user({ name: "Blocked", email: "x@example.com", blockedAt: Date.now() });
    const farmer = await user({ name: "Okafor", phone: "+2348030000001" }, "ExponentPushToken[farmer]");
    const appId = await ctx.db.insert("farmerApplications", { userId: farmer.id, status: "approved", categoryIds: [], seasons: [], collectionHours: [] } as any);
    await ctx.db.insert("farms", {
      userId: farmer.id, applicationId: appId, name: "Okafor Farms", phone: "+2348030000001", state: "Imo", lga: "Owerri North", address: "x",
      farmSize: "1_to_5", farmType: "crops", categoryIds: [], collectionAddress: "x", collectionHours: hours, leadTimeHours: 4,
      openDays: [0, 1, 2, 3, 4, 5, 6], holidayMode: false, bankCode: "058", bankName: "GTBank", accountNumber: "0123456789",
      accountName: "Okafor", status: "active", trusted: true,
    } as any);
    const support = await user({ name: "Sue", email: "sue@example.com", staffRole: "support" });
    const finance = await user({ name: "Fin", email: "fin@example.com", staffRole: "finance" });
    return { ada, bayo, guest, blocked, farmer, support, finance };
  });
}

const inbox = async (t: T, u: U, side: "shop" | "farm") =>
  (await as(t, u).query(api.notifications.list, { side, paginationOpts: { numItems: 20, cursor: null } })).page;

const update = { kind: "update" as const, title: "No deliveries on Monday", body: "Our riders are off for the holiday.", link: { to: "message" as const } };

test("support sends an update to everyone; it reaches every account's inbox and pushes, never texts or emails", async () => {
  const t = convexTest(schema, modules);
  const s = await seed(t);
  const support = as(t, s.support);

  // Finance has no messages.send
  await expect(as(t, s.finance).mutation(api.admin.messages.send, { ...update, side: "both", audience: "everyone" })).rejects.toThrow(/FORBIDDEN/);

  // Reach: Ada, Bayo and the farmer (also an account, so a shopper too); not the guest or the blocked
  const reach = await support.query(api.admin.messages.reach, { side: "both", audience: "everyone" });
  expect(reach.people).toBe(5); // Ada, Bayo, Okafor, plus the two staff accounts
  expect(reach.withPush).toBe(2);

  await support.mutation(api.admin.messages.send, { ...update, side: "both", audience: "everyone" });
  await flush(t);

  for (const u of [s.ada, s.bayo]) {
    const [n] = await inbox(t, u, "shop");
    expect(n).toMatchObject({ kind: "broadcast", title: "No deliveries on Monday", href: "/notifications", read: false });
  }
  expect(await inbox(t, s.guest, "shop")).toHaveLength(0);
  expect(await inbox(t, s.blocked, "shop")).toHaveLength(0);
  expect((await inbox(t, s.farmer, "farm"))[0]).toMatchObject({ kind: "broadcast", href: "/notifications?side=farm" });

  // Push to every phone that has the app (the farmer gets one per side), nothing else
  expect(pushed.map((p) => p.to).sort()).toEqual(["ExponentPushToken[ada]", "ExponentPushToken[farmer]", "ExponentPushToken[farmer]"]);
  expect(other).toEqual([]);

  const [row] = (await support.query(api.admin.messages.list, { paginationOpts: { numItems: 10, cursor: null } })).page;
  expect(row).toMatchObject({ status: "sent", recipients: 6, sentBy: "Sue" });

  // Opened counts reads; withdraw takes it out of everyone's inbox
  const [adaNote] = await inbox(t, s.ada, "shop");
  await as(t, s.ada).mutation(api.notifications.markRead, { notificationId: adaNote!._id });
  expect((await support.query(api.admin.messages.opened, { broadcastId: row!._id })).count).toBe(1);
  await support.mutation(api.admin.messages.withdraw, { broadcastId: row!._id });
  await flush(t);
  expect(await inbox(t, s.ada, "shop")).toHaveLength(0);
  expect(await inbox(t, s.farmer, "farm")).toHaveLength(0);
});

test("offers only push to people who turned on offers; the farmer's Farmkeke news setting works the same", async () => {
  const t = convexTest(schema, modules);
  const s = await seed(t);
  const offer = { kind: "offer" as const, title: "Fresh ugwu is back", body: "Picked this morning.", link: { to: "message" as const } };

  // Farmers now have a Farmkeke news switch, off by default
  const farmPrefs = await as(t, s.farmer).query(api.notifications.preferences, { side: "farm" });
  expect(farmPrefs!.alerts.find((p: any) => p.alert === "news")).toMatchObject({ title: "Farmkeke news", push: false });
  await as(t, s.farmer).mutation(api.notifications.setPreference, { side: "farm", alert: "news", channel: "push", on: true });

  await as(t, s.support).mutation(api.admin.messages.send, { ...offer, side: "farm", audience: "everyone" });
  await as(t, s.support).mutation(api.admin.messages.send, { ...offer, side: "shop", audience: "everyone" });
  await flush(t);

  // Everyone has it in the app; only the farmer, who opted in, got a push
  expect((await inbox(t, s.ada, "shop"))[0]).toMatchObject({ kind: "offer" });
  expect(pushed).toEqual([{ to: "ExponentPushToken[farmer]", title: "Fresh ugwu is back" }]);
});

test("one person, links, scheduling and a test to yourself", async () => {
  const t = convexTest(schema, modules);
  const s = await seed(t);
  const support = as(t, s.support);

  // One person by phone or email; a farmer message needs a farm
  expect((await support.query(api.admin.messages.reach, { side: "shop", audience: "one", contact: "0803 111 0001" })).person).toMatchObject({ name: "Ada" });
  await expect(support.mutation(api.admin.messages.send, { ...update, side: "farm", audience: "one", contact: "ada@example.com" })).rejects.toThrow(/NOT_A_FARMER/);
  await expect(support.mutation(api.admin.messages.send, { ...update, side: "shop", audience: "one", contact: "nobody@example.com" })).rejects.toThrow(/PERSON_NOT_FOUND/);
  await support.mutation(api.admin.messages.send, { ...update, side: "shop", audience: "one", contact: "ada@example.com", link: { to: "orders" } });
  await flush(t);
  expect((await inbox(t, s.ada, "shop")).map((n: any) => n.href)).toEqual(["/orders"]);
  expect(await inbox(t, s.bayo, "shop")).toHaveLength(0);

  // Links must fit the side, and point at something real
  await expect(support.mutation(api.admin.messages.send, { ...update, side: "both", audience: "everyone", link: { to: "home" } })).rejects.toThrow(/LINK_NOT_FOR_BOTH/);
  await expect(support.mutation(api.admin.messages.send, { ...update, side: "farm", audience: "everyone", link: { to: "home" } })).rejects.toThrow(/LINK_WRONG_SIDE/);
  await expect(support.mutation(api.admin.messages.send, { ...update, side: "shop", audience: "everyone", link: { to: "product", id: "nope" } })).rejects.toThrow(/LINK_NOT_FOUND/);
  await expect(support.mutation(api.admin.messages.send, { ...update, side: "shop", audience: "everyone", title: "x".repeat(61) })).rejects.toThrow(/TOO_LONG/);

  // Scheduled: nothing until the time; cancelled ones never go
  const at = Date.now() + 3 * 3_600_000;
  const { broadcastId: keep } = await support.mutation(api.admin.messages.send, { ...update, title: "Later", side: "shop", audience: "everyone", sendAt: at });
  const { broadcastId: drop } = await support.mutation(api.admin.messages.send, { ...update, title: "Never", side: "shop", audience: "everyone", sendAt: at });
  await support.mutation(api.admin.messages.cancel, { broadcastId: drop });
  await flush(t);
  expect((await inbox(t, s.bayo, "shop")).map((n: any) => n.title)).toEqual([]);
  expect((await support.query(api.admin.messages.list, { status: "scheduled", paginationOpts: { numItems: 10, cursor: null } })).page.map((r: any) => r._id)).toEqual([keep]);
  vi.advanceTimersByTime(3 * 3_600_000);
  await flush(t);
  expect((await inbox(t, s.bayo, "shop")).map((n: any) => n.title)).toEqual(["Later"]);

  // A test goes only to the sender
  await support.mutation(api.admin.messages.sendTest, { ...update, side: "shop", audience: "everyone" });
  await flush(t);
  expect((await inbox(t, s.support, "shop"))[0]).toMatchObject({ title: "[Test] No deliveries on Monday" });
  expect((await inbox(t, s.bayo, "shop")).map((n: any) => n.title)).toEqual(["Later"]);
});
