/// <reference types="vite/client" />
// Termii SMS: number format, length cap, sending through notifications,
// failures logged, and nothing sent until TERMII_API_KEY is set. Termii is
// mocked (fetch).
import { convexTest } from "convex-test";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { internal } from "../convex/_generated/api";
import { fitSms, termiiNumber } from "../convex/lib/sms";
import schema from "../convex/schema";
import { modules } from "./modules";

type Sent = { url: string; body: Record<string, unknown> };

function termii(reply: { status?: number; body?: unknown } = {}) {
  const sent: Sent[] = [];
  vi.stubGlobal("fetch", async (url: string, init: { body: string }) => {
    if (String(url).includes("termii")) {
      sent.push({ url: String(url), body: JSON.parse(init.body) });
      return new Response(JSON.stringify(reply.body ?? { message_id: "9001", message: "Successfully Sent" }), {
        status: reply.status ?? 200,
      });
    }
    return new Response(JSON.stringify({ data: [] }));
  });
  return sent;
}

beforeEach(() => {
  process.env.TERMII_API_KEY = "tk_test";
});
afterEach(() => {
  delete process.env.TERMII_API_KEY;
  delete process.env.TERMII_SENDER_ID;
  delete process.env.TERMII_CHANNEL;
  delete process.env.SMS_ENABLED;
  vi.unstubAllGlobals();
});

test("numbers become 234…, bad numbers are refused, long texts are capped", () => {
  expect(termiiNumber("08031234567")).toBe("2348031234567");
  expect(termiiNumber("+234 803 123 4567")).toBe("2348031234567");
  expect(termiiNumber("12345")).toBeNull();
  const long = fitSms("a ".repeat(400));
  expect(long.length).toBe(306);
  expect(long.endsWith("…")).toBe(true);
});

test("testSms sends through Termii with the Sender ID and DND route, and logs it", async () => {
  const sent = termii();
  const t = convexTest(schema, modules);
  const result = await t.action(internal.notifications.deliver.testSms, { to: "0803 123 4567" });
  expect(result).toEqual({ status: "sent", reference: "9001" });
  expect(sent).toHaveLength(1);
  expect(sent[0]!.url).toBe("https://v3.api.termii.com/api/sms/send");
  expect(sent[0]!.body).toMatchObject({
    api_key: "tk_test",
    to: "2348031234567",
    from: "Farmkeke",
    type: "plain",
    channel: "dnd",
  });
  const log = await t.run((ctx) => ctx.db.query("smsLog").collect());
  expect(log).toHaveLength(1);
  expect(log[0]).toMatchObject({ status: "sent", provider: "termii", providerReference: "9001" });
});

test("Termii errors are logged as failed, never thrown", async () => {
  termii({ status: 400, body: { message: "Insufficient balance" } });
  const t = convexTest(schema, modules);
  const result = await t.action(internal.notifications.deliver.testSms, { to: "08031234567" });
  expect(result.status).toBe("failed");
  const log = await t.run((ctx) => ctx.db.query("smsLog").collect());
  expect(log[0]).toMatchObject({ status: "failed", provider: "termii" });
  expect(String(log[0]!.error)).toContain("Insufficient balance");
});

test("without a key (or when paused) nothing is sent", async () => {
  const sent = termii();
  delete process.env.TERMII_API_KEY;
  const t = convexTest(schema, modules);
  expect(await t.action(internal.notifications.deliver.testSms, { to: "08031234567" })).toEqual({
    status: "not_configured",
  });
  process.env.TERMII_API_KEY = "tk_test";
  process.env.SMS_ENABLED = "false";
  expect(await t.action(internal.notifications.deliver.testSms, { to: "08031234567" })).toEqual({
    status: "not_configured",
  });
  expect(sent).toHaveLength(0);
});

test("a guest's order notification goes out as a real text", async () => {
  const sent = termii();
  const t = convexTest(schema, modules);
  const notificationId = await t.run(async (ctx) => {
    const userId = await ctx.db.insert("users", { isAnonymous: true });
    return await ctx.db.insert("notifications", {
      userId,
      side: "shop",
      kind: "order_accepted",
      title: "Your order was accepted",
      body: "Okafor Farms accepted FK-10001.",
      href: "/orders/x",
      smsTo: "+2348031234567",
    } as never);
  });
  await t.action(internal.notifications.deliver.send, { notificationId });
  expect(sent).toHaveLength(1);
  expect(sent[0]!.body.to).toBe("2348031234567");
  expect(String(sent[0]!.body.sms)).toContain("Your order was accepted");
  const log = await t.run((ctx) => ctx.db.query("smsLog").collect());
  expect(log[0]).toMatchObject({ status: "sent", provider: "termii" });
});
