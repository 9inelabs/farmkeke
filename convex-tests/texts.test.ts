/// <reference types="vite/client" />
// Sign-up codes by text or by voice call, logged without the code, and
// Termii's delivery reports marking each one delivered or not. Termii is
// mocked (fetch).
import { convexTest } from "convex-test";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { api } from "../convex/_generated/api";
import { deliveryOf } from "../convex/lib/sms";
import schema from "../convex/schema";
import { modules } from "./modules";
import { grantStaff } from "./staff";

type Sent = { url: string; body: Record<string, unknown> };

function termii(reply: { status?: number; body?: unknown } = {}) {
  const sent: Sent[] = [];
  vi.stubGlobal("fetch", async (url: string, init: { body: string }) => {
    sent.push({ url: String(url), body: JSON.parse(init.body) });
    return new Response(JSON.stringify(reply.body ?? { message_id: "3017", message: "Successfully Sent" }), { status: reply.status ?? 200 });
  });
  return sent;
}

beforeEach(() => {
  process.env.TERMII_API_KEY = "tk_test";
  process.env.TERMII_WEBHOOK_KEY = "hook_key";
});
afterEach(() => {
  delete process.env.TERMII_API_KEY;
  delete process.env.TERMII_WEBHOOK_KEY;
  delete process.env.TERMII_WEBHOOK_SECRET;
  vi.unstubAllGlobals();
});

const logRows = (t: ReturnType<typeof convexTest>) => t.run(async (ctx) => await ctx.db.query("smsLog").collect());

test("Termii's report words map to delivered, failed or still on its way", () => {
  expect(deliveryOf("Delivered")).toBe("delivered");
  expect(deliveryOf("DELIVRD")).toBe("delivered");
  expect(deliveryOf("DND Active on Phone Number")).toBe("failed");
  expect(deliveryOf("Message Failed")).toBe("failed");
  expect(deliveryOf("Rejected")).toBe("failed");
  expect(deliveryOf("Expired")).toBe("failed");
  expect(deliveryOf("Undelivered")).toBe("failed");
  expect(deliveryOf("Sent")).toBe("pending");
  expect(deliveryOf("Message Sent")).toBe("pending");
});

test("a texted sign-up code is logged without the code, waiting for its report", async () => {
  const sent = termii();
  const t = convexTest(schema, modules);
  await t.action(api.phoneAuth.sendCode, { phone: "0803 123 4567" });
  expect(sent).toHaveLength(1);
  expect(sent[0]!.url).toBe("https://v3.api.termii.com/api/sms/send");
  const code = /code is (\d{6})/.exec(String(sent[0]!.body.sms))?.[1];
  expect(code).toBeDefined();
  const [row] = await logRows(t);
  expect(row).toMatchObject({ to: "+2348031234567", kind: "code", channel: "sms", status: "sent", delivery: "pending", providerReference: "3017" });
  expect(row!.body).not.toContain(code!);
});

test("Call me with the code: Termii's voice call reads a fresh code that works", async () => {
  const sent = termii({ body: { code: "ok", message_id: "voice-77", message: "Successfully Sent" } });
  const t = convexTest(schema, modules);
  await t.action(api.phoneAuth.sendCode, { phone: "08031234567" });
  await t.action(api.phoneAuth.sendCode, { phone: "08031234567", by: "voice" });
  expect(sent).toHaveLength(2);
  expect(sent[1]!.url).toBe("https://v3.api.termii.com/api/sms/otp/call");
  expect(sent[1]!.body).toMatchObject({ api_key: "tk_test", phone_number: "2348031234567" });
  const spoken = sent[1]!.body.code;
  expect(typeof spoken).toBe("number");
  expect(String(spoken)).toMatch(/^[1-9]\d{5}$/);
  // The called code is the one that checks out; the earlier texted code no longer does
  const texted = /code is (\d{6})/.exec(String(sent[0]!.body.sms))![1]!;
  if (texted !== String(spoken)) {
    await expect(t.action(api.phoneAuth.checkCode, { phone: "08031234567", code: texted })).rejects.toThrow();
  }
  await expect(t.action(api.phoneAuth.checkCode, { phone: "08031234567", code: String(spoken) })).resolves.toBeNull();
  const rows = await logRows(t);
  expect(rows.map((r) => r.channel)).toEqual(["sms", "voice"]);
  expect(rows[1]).toMatchObject({ kind: "code", status: "sent", providerReference: "voice-77", body: "Sign-up code (hidden)" });
});

test("a call Termii refuses is logged as not sent and tells the app", async () => {
  termii({ status: 400, body: { message: "Insufficient balance" } });
  const t = convexTest(schema, modules);
  await expect(t.action(api.phoneAuth.sendCode, { phone: "08031234567", by: "voice" })).rejects.toThrow(/CALL_FAILED/);
  const [row] = await logRows(t);
  expect(row).toMatchObject({ channel: "voice", status: "failed" });
  expect(row!.error).toContain("Insufficient balance");
  expect(row!.delivery).toBeUndefined();
});

test("delivery reports update the matching text, by message ID or else by number", async () => {
  termii();
  const t = convexTest(schema, modules);
  await t.action(api.phoneAuth.sendCode, { phone: "08031234567" });
  const post = (body: unknown, key = "hook_key") =>
    t.fetch(`/termii/delivery?key=${key}`, { method: "POST", body: JSON.stringify(body), headers: { "Content-Type": "application/json" } });

  // MTN never delivered it: Termii reports it as failed
  expect((await post({ type: "outbound", message_id: "3017", receiver: "2348031234567", status: "DND Active on Phone Number" })).status).toBe(200);
  let [row] = await logRows(t);
  expect(row).toMatchObject({ delivery: "failed", deliveryStatus: "DND Active on Phone Number" });

  // A later report says it arrived after all
  await post({ message_id: "3017", status: "Delivered" });
  [row] = await logRows(t);
  expect(row!.delivery).toBe("delivered");
  // and a late "Sent" never undoes that
  await post({ message_id: "3017", status: "Sent" });
  [row] = await logRows(t);
  expect(row!.delivery).toBe("delivered");

  // A report with an unknown ID falls back to the newest text to that number
  await t.action(api.phoneAuth.sendCode, { phone: "08031234567" });
  await post([{ id: "sig_abc", receiver: "2348031234567", status: "Rejected" }]);
  const rows = await logRows(t);
  expect(rows[1]!.delivery).toBe("failed");
  expect(rows[0]!.delivery).toBe("delivered");

  // Termii's event style: details under "data", the status as the event name
  await t.action(api.phoneAuth.sendCode, { phone: "08031234567" });
  await post({ event: "message.delivered", data: { signal_id: "sig_new", recipient: "2348031234567" } });
  expect((await logRows(t))[2]!.delivery).toBe("delivered");
});

test("the webhook refuses a wrong key, a bad signature and bodies without a status", async () => {
  termii();
  const t = convexTest(schema, modules);
  await t.action(api.phoneAuth.sendCode, { phone: "08031234567" });
  const post = (body: string, key: string, headers: Record<string, string> = {}) =>
    t.fetch(`/termii/delivery?key=${key}`, { method: "POST", body, headers });
  expect((await post(JSON.stringify({ message_id: "3017", status: "Delivered" }), "wrong")).status).toBe(401);
  expect((await post("not json", "hook_key")).status).toBe(400);
  // A report without a status is accepted (so Termii doesn't retry) but changes nothing
  expect((await post(JSON.stringify({ message_id: "3017" }), "hook_key")).status).toBe(200);
  expect((await logRows(t))[0]!.delivery).toBe("pending");

  process.env.TERMII_WEBHOOK_SECRET = "sign_me";
  const raw = JSON.stringify({ message_id: "3017", status: "Delivered" });
  expect((await post(raw, "hook_key", { "x-termii-signature": "00" })).status).toBe(401);
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode("sign_me"), { name: "HMAC", hash: "SHA-512" }, false, ["sign"]);
  const mac = Array.from(new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(raw))), (b) => b.toString(16).padStart(2, "0")).join("");
  expect((await post(raw, "hook_key", { "x-termii-signature": mac })).status).toBe(200);
  // SHA-256 in base64 is accepted too
  const key256 = await crypto.subtle.importKey("raw", new TextEncoder().encode("sign_me"), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const mac256 = btoa(String.fromCharCode(...new Uint8Array(await crypto.subtle.sign("HMAC", key256, new TextEncoder().encode(raw)))));
  expect((await post(raw, "hook_key", { "x-termii-signature": mac256 })).status).toBe(200);
  const [row] = await logRows(t);
  expect(row!.delivery).toBe("delivered");

  delete process.env.TERMII_WEBHOOK_KEY;
  expect((await post(raw, "hook_key")).status).toBe(503);
});

test("staff see texts newest first, filter the undelivered, and get today's counts", async () => {
  termii();
  const t = convexTest(schema, modules);
  await t.action(api.phoneAuth.sendCode, { phone: "08031234567" });
  await t.action(api.phoneAuth.sendCode, { phone: "08031234568" });
  await t.fetch("/termii/delivery?key=hook_key", { method: "POST", body: JSON.stringify({ receiver: "2348031234568", status: "Expired" }) });
  // Signed-out callers are refused
  await expect(t.query(api.admin.texts.list, { paginationOpts: { numItems: 10, cursor: null } })).rejects.toThrow();
  const user = await t.run(async (ctx) => {
    const id = await ctx.db.insert("users", { name: "Sola", email: "sola@farmkeke.com" });
    const sessionId = await ctx.db.insert("authSessions", { userId: id, expirationTime: Date.now() + 1e10 });
    const u = { id, sessionId };
    await grantStaff(ctx, u, "support");
    return u;
  });
  const staff = t.withIdentity({ subject: `${user.id}|${user.sessionId}`, tokenIdentifier: `test|${user.id}` });
  const all = await staff.query(api.admin.texts.list, { paginationOpts: { numItems: 10, cursor: null } });
  expect(all.page.map((r: { to: string }) => r.to)).toEqual(["+2348031234568", "+2348031234567"]);
  const failed = await staff.query(api.admin.texts.list, { paginationOpts: { numItems: 10, cursor: null }, delivery: "failed" });
  expect(failed.page).toHaveLength(1);
  expect(failed.page[0]).toMatchObject({ to: "+2348031234568", kind: "code", deliveryStatus: "Expired" });
  const counts = await staff.query(api.admin.texts.summary, { since: 0 });
  expect(counts).toMatchObject({ total: 2, failed: 1, pending: 1, delivered: 0, notSent: 0 });
});
