// Farmer sign-up by phone (24 Oct 2026): codes, who the code signs in, and
// PIN rules. The Convex Auth action around these is in lib/phoneAuth.ts.
import { convexTest } from "convex-test";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { internal } from "../convex/_generated/api";
import { pinProblem } from "../convex/lib/phoneAuth";
import schema from "../convex/schema";
import { modules } from "./modules";

const PHONE = "+2348030001111";
const issue = (t: ReturnType<typeof convexTest>, codeHash = "good") => t.mutation(internal.phoneAuth.issueCode, { phone: PHONE, codeHash });
// The action throws a returned { error }; do the same here
const use = async (t: ReturnType<typeof convexTest>, codeHash = "good", currentUserId: any = null) => {
  const r = await t.mutation(internal.phoneAuth.useCode, { phone: PHONE, codeHash, currentUserId });
  if ("error" in r) throw new Error(r.error);
  return r;
};

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

test("a code works once, for 10 minutes, with 5 tries", async () => {
  const t = convexTest(schema, modules);
  await issue(t);
  await expect(use(t, "bad")).rejects.toThrow(/INVALID_CODE/);
  const first = await use(t);
  expect(first.hasPin).toBe(false);
  // Used up
  await expect(use(t)).rejects.toThrow(/CODE_EXPIRED/);

  await issue(t);
  vi.advanceTimersByTime(11 * 60_000);
  await expect(use(t)).rejects.toThrow(/CODE_EXPIRED/);

  await issue(t);
  for (let i = 0; i < 5; i++) await expect(use(t, "bad")).rejects.toThrow(/INVALID_CODE/);
  await expect(use(t)).rejects.toThrow(/TOO_MANY_ATTEMPTS/);
});

test("a phone gets at most 5 codes an hour", async () => {
  const t = convexTest(schema, modules);
  for (let i = 0; i < 5; i++) await issue(t);
  await expect(issue(t)).rejects.toThrow(/RATE_LIMITED/);
});

test("a new phone gets a new account with a phone sign-in", async () => {
  const t = convexTest(schema, modules);
  await issue(t);
  const { userId } = await use(t);
  const { user, accounts } = await t.run(async (ctx) => ({
    user: await ctx.db.get("users", userId),
    accounts: await ctx.db.query("authAccounts").collect(),
  }));
  expect(user!.phone).toBe(PHONE);
  expect(user!.phoneVerificationTime).toBeDefined();
  expect(accounts.map((a) => [a.provider, a.providerAccountId, a.userId])).toEqual([["phone-code", PHONE, userId]]);
  // Signing up again with the same phone signs in to the same account
  await issue(t);
  expect((await use(t)).userId).toBe(userId);
});

test("a guest on the phone becomes the account, keeping their orders", async () => {
  const t = convexTest(schema, modules);
  const guest = await t.run((ctx) => ctx.db.insert("users", { isAnonymous: true }));
  await issue(t);
  expect((await use(t, "good", guest)).userId).toBe(guest);
  const user = await t.run((ctx) => ctx.db.get("users", guest));
  expect(user!.isAnonymous).toBe(false);
  expect(user!.phone).toBe(PHONE);
});

test("a proved phone signs in to its owner; another account can't take it", async () => {
  const t = convexTest(schema, modules);
  const owner = await t.run((ctx) => ctx.db.insert("users", { name: "Bola", phone: PHONE, phoneVerificationTime: 1 }));
  const other = await t.run((ctx) => ctx.db.insert("users", { name: "Other", email: "o@example.com" }));
  await issue(t);
  await expect(use(t, "good", other)).rejects.toThrow(/PHONE_TAKEN/);
  await issue(t);
  expect((await use(t)).userId).toBe(owner);
});

test("a number typed into a profile but never proved isn't an owner", async () => {
  const t = convexTest(schema, modules);
  const typed = await t.run((ctx) => ctx.db.insert("users", { name: "Typo", email: "t@example.com", phone: PHONE }));
  await issue(t);
  const { userId } = await use(t);
  expect(userId).not.toBe(typed);
});

test("PINs: four digits, not repeated or a straight run", () => {
  expect(pinProblem("12a4")).toBe("PIN_FORMAT");
  expect(pinProblem("123")).toBe("PIN_FORMAT");
  for (const weak of ["0000", "7777", "1234", "6789", "4321"]) expect(pinProblem(weak)).toBe("WEAK_PIN");
  for (const ok of ["2580", "1357", "9024"]) expect(pinProblem(ok)).toBeNull();
});
