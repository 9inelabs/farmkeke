// Push alerts stop for a phone once the sign-in that registered it ends
// (sign-out, a password reset on another device, an admin sign-out).
import { convexTest } from "convex-test";
import { expect, test } from "vitest";
import { api, internal } from "../convex/_generated/api";
import schema from "../convex/schema";
import { modules } from "./modules";

type T = ReturnType<typeof convexTest>;
type U = { id: any; sessionId: any };
const as = (t: T, u: U) => t.withIdentity({ subject: `${u.id}|${u.sessionId}`, tokenIdentifier: `test|${u.id}` });

test("a phone gets no push after its sign-in ends, and its token is forgotten", async () => {
  const t = convexTest(schema, modules);
  const ada = await t.run(async (ctx) => {
    const id = await ctx.db.insert("users", { name: "Ada Obi", email: "ada@example.com" } as any);
    const sessionId = await ctx.db.insert("authSessions", { userId: id, expirationTime: Date.now() + 1e10 });
    return { id, sessionId };
  });
  const token = "ExponentPushToken[phone-1]";
  await as(t, ada).mutation(api.notifications.registerPushToken, { platform: "android", token });
  const row = await t.run(async (ctx) => (await ctx.db.query("pushTokens").collect())[0]);
  expect(row.sessionId).toBe(ada.sessionId);

  const make = () =>
    t.run(async (ctx) =>
      ctx.db.insert("notifications", { userId: ada.id, side: "shop", kind: "order_placed", title: "Order placed", body: "Thanks", href: "/orders" } as any),
    );

  // Signed in: the phone is in the plan
  let plan = await t.query(internal.notifications.store.plan, { notificationId: await make() });
  expect(plan?.push.map((p) => p.to)).toEqual([token]);

  // The session ends elsewhere: no push, and the token goes
  await t.run(async (ctx) => ctx.db.delete("authSessions", ada.sessionId));
  plan = await t.query(internal.notifications.store.plan, { notificationId: await make() });
  expect(plan?.push).toEqual([]);
  expect(plan?.staleTokenIds).toEqual([row._id]);
  await t.mutation(internal.notifications.store.dropStaleTokens, { ids: plan!.staleTokenIds });
  expect(await t.run(async (ctx) => (await ctx.db.query("pushTokens").collect()).length)).toBe(0);
});

test("signing back in on the same phone moves the token to the new sign-in", async () => {
  const t = convexTest(schema, modules);
  const { id, first, second } = await t.run(async (ctx) => {
    const id = await ctx.db.insert("users", { name: "Ada Obi" } as any);
    const first = await ctx.db.insert("authSessions", { userId: id, expirationTime: Date.now() + 1e10 });
    const second = await ctx.db.insert("authSessions", { userId: id, expirationTime: Date.now() + 1e10 });
    return { id, first, second };
  });
  const token = "ExponentPushToken[phone-2]";
  await as(t, { id, sessionId: first }).mutation(api.notifications.registerPushToken, { platform: "ios", token });
  await as(t, { id, sessionId: second }).mutation(api.notifications.registerPushToken, { platform: "ios", token });
  const rows = await t.run(async (ctx) => await ctx.db.query("pushTokens").collect());
  expect(rows.map((r) => r.sessionId)).toEqual([second]);
});
