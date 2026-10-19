// Delivery for one stored notification (Phase 9): push through the Expo push
// API (plain fetch), SMS recorded in smsLog until a provider is chosen, and
// email through Resend. Never throws into the order flows that scheduled it.
import { v, type Infer } from "convex/values";
import { internal } from "../_generated/api";
import { env, internalAction, type ActionCtx } from "../_generated/server";
import { sendEmail } from "../lib/email";
import {
  accountDeletionEmail,
  emailChangedConfirmEmail,
  emailChangedNoticeEmail,
  guestOrdersAddedEmail,
  guestOrdersConfirmEmail,
  lagosTime,
  links,
  passwordChangedEmail,
  welcomeEmail,
  type Email,
} from "../lib/emails";
import { MESSAGE_EMAIL_WINDOW_MS } from "./store";

const EXPO_SEND = "https://exp.host/--/api/v2/push/send";
const EXPO_RECEIPTS = "https://exp.host/--/api/v2/push/getReceipts";
const MAX_PUSH_ATTEMPTS = 4;
// Expo's receipts are ready after a few minutes; check after 15.
const RECEIPT_DELAY_MS = 15 * 60_000;

const pushMessage = v.object({
  to: v.string(),
  title: v.string(),
  body: v.string(),
  sound: v.literal("default"),
  priority: v.literal("high"),
  channelId: v.string(),
  data: v.object({ href: v.string(), kind: v.string(), notificationId: v.string(), side: v.string() }),
});
type PushMessage = Infer<typeof pushMessage>;

type Ticket = { status: "ok"; id: string } | { status: "error"; message?: string; details?: { error?: string } };

/** Sends push messages (100 per request). Failed requests are retried with backoff. */
async function pushNow(ctx: ActionCtx, messages: PushMessage[], attempt: number) {
  const dead: string[] = [];
  const tickets: { id: string; token: string }[] = [];
  const retry: PushMessage[] = [];
  for (let i = 0; i < messages.length; i += 100) {
    const chunk = messages.slice(i, i + 100);
    try {
      const response = await fetch(EXPO_SEND, {
        method: "POST",
        headers: { Accept: "application/json", "Content-Type": "application/json" },
        body: JSON.stringify(chunk),
      });
      if (!response.ok) {
        // 429 and 5xx are worth another go; other errors are our fault
        if (response.status === 429 || response.status >= 500) retry.push(...chunk);
        else console.error("Expo push rejected", response.status, await response.text());
        continue;
      }
      const json = (await response.json()) as { data?: Ticket[] };
      (json.data ?? []).forEach((ticket, index) => {
        const token = chunk[index]?.to;
        if (token === undefined) return;
        if (ticket.status === "ok") tickets.push({ id: ticket.id, token });
        else if (ticket.details?.error === "DeviceNotRegistered") dead.push(token);
        else console.error("Expo push error", ticket.message ?? ticket.details?.error);
      });
    } catch (error) {
      retry.push(...chunk);
      console.error("Expo push failed", error instanceof Error ? error.message : error);
    }
  }
  if (dead.length > 0) await ctx.runMutation(internal.notifications.store.dropTokens, { tokens: dead });
  if (tickets.length > 0) {
    await ctx.scheduler.runAfter(RECEIPT_DELAY_MS, internal.notifications.deliver.receipts, { tickets });
  }
  if (retry.length > 0 && attempt + 1 < MAX_PUSH_ATTEMPTS) {
    await ctx.scheduler.runAfter(30_000 * 2 ** attempt, internal.notifications.deliver.retryPush, {
      attempt: attempt + 1,
      messages: retry,
    });
  }
}

/** Whether email can go out: a Resend key, or dev logging. */
const emailOn = () => Boolean(env.AUTH_RESEND_KEY) || env.AUTH_DEV_LOG_EMAILS === "true";

/** Sends an email if Resend is set up. Without a key: logs in dev, otherwise skips quietly. */
async function emailQuietly(email: Email) {
  if (!emailOn()) return;
  try {
    await sendEmail(email);
  } catch (error) {
    console.error("Email not sent", email.subject, error instanceof Error ? error.message : error);
  }
}

export const send = internalAction({
  args: { notificationId: v.id("notifications") },
  handler: async (ctx, args) => {
    const plan = await ctx.runQuery(internal.notifications.store.plan, args);
    if (plan === null) return null;
    if (plan.push.length > 0) await pushNow(ctx, plan.push, 0);
    // No SMS provider yet: record what would be sent.
    if (plan.sms) await ctx.runMutation(internal.notifications.store.logSms, { ...plan.sms, status: "recorded" });
    if (plan.email && emailOn()) {
      // Message emails: at most one per thread every 30 minutes
      const allowed =
        plan.emailThrottleKey === undefined ||
        (await ctx.runMutation(internal.notifications.store.claimEmailSlot, {
          key: plan.emailThrottleKey,
          windowMs: MESSAGE_EMAIL_WINDOW_MS,
        }));
      if (allowed) await emailQuietly(plan.email);
    }
    return null;
  },
});

export const retryPush = internalAction({
  args: { attempt: v.number(), messages: v.array(pushMessage) },
  handler: async (ctx, args) => {
    await pushNow(ctx, args.messages, args.attempt);
    return null;
  },
});

/** Reads Expo's receipts and forgets tokens for uninstalled apps. */
export const receipts = internalAction({
  args: { tickets: v.array(v.object({ id: v.string(), token: v.string() })) },
  handler: async (ctx, args) => {
    const dead: string[] = [];
    for (let i = 0; i < args.tickets.length; i += 300) {
      const chunk = args.tickets.slice(i, i + 300);
      try {
        const response = await fetch(EXPO_RECEIPTS, {
          method: "POST",
          headers: { Accept: "application/json", "Content-Type": "application/json" },
          body: JSON.stringify({ ids: chunk.map((t) => t.id) }),
        });
        if (!response.ok) continue;
        const json = (await response.json()) as { data?: Record<string, Ticket> };
        for (const t of chunk) {
          const receipt = json.data?.[t.id];
          if (receipt?.status === "error" && receipt.details?.error === "DeviceNotRegistered") dead.push(t.token);
        }
      } catch (error) {
        console.error("Expo receipts failed", error instanceof Error ? error.message : error);
      }
    }
    if (dead.length > 0) await ctx.runMutation(internal.notifications.store.dropTokens, { tokens: dead });
    return null;
  },
});

/** Welcome email, scheduled by the password provider after sign-up. */
export const welcome = internalAction({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const user = await ctx.runQuery(internal.accountsInternal.userById, { userId: args.userId });
    if (user === null || user.isAnonymous || !user.email) return null;
    await emailQuietly(welcomeEmail({ to: user.email, name: user.name }));
    return null;
  },
});

/**
 * Account security emails (both the app and the website). Always sent,
 * whatever the notification preferences. Scheduled by account.ts,
 * accountsInternal.ts, lib/passwordProvider.ts and orders/consumer.ts, so a
 * failed email never fails the change itself.
 */
export const accountEmail = internalAction({
  args: {
    email: v.union(
      v.object({ kind: v.literal("password_changed"), userId: v.id("users"), how: v.union(v.literal("changed"), v.literal("reset")) }),
      v.object({ kind: v.literal("email_changed"), userId: v.id("users"), oldEmail: v.string(), newEmail: v.string() }),
      v.object({ kind: v.literal("deletion_waiting"), to: v.string(), name: v.optional(v.string()), orders: v.number() }),
      v.object({ kind: v.literal("deletion_done"), to: v.string(), name: v.optional(v.string()) }),
      v.object({ kind: v.literal("guest_orders_added"), userId: v.id("users"), numbers: v.array(v.string()), total: v.number() }),
      // Phase 5 (W-42 / W-44): the one-time link that adds guest orders found by email
      v.object({ kind: v.literal("guest_orders_confirm"), userId: v.id("users"), token: v.string(), total: v.number() }),
    ),
  },
  handler: async (ctx, args) => {
    const e = args.email;
    const at = lagosTime(Date.now());
    switch (e.kind) {
      case "deletion_waiting":
        await emailQuietly(accountDeletionEmail({ to: e.to, name: e.name, status: "waiting", orders: e.orders }));
        return null;
      case "deletion_done":
        await emailQuietly(accountDeletionEmail({ to: e.to, name: e.name, status: "deleted" }));
        return null;
    }
    const user = await ctx.runQuery(internal.accountsInternal.userById, { userId: e.userId });
    if (user === null || user.isAnonymous) return null;
    switch (e.kind) {
      case "password_changed":
        if (user.email) await emailQuietly(passwordChangedEmail({ to: user.email, name: user.name, how: e.how, at }));
        return null;
      case "email_changed":
        // The old address hears about it (security), the new one confirms it.
        await emailQuietly(emailChangedNoticeEmail({ to: e.oldEmail, name: user.name, newEmail: e.newEmail, at }));
        await emailQuietly(emailChangedConfirmEmail({ to: e.newEmail, name: user.name, oldEmail: e.oldEmail }));
        return null;
      case "guest_orders_added":
        if (user.email && e.total > 0) {
          await emailQuietly(guestOrdersAddedEmail({ to: user.email, name: user.name, numbers: e.numbers, total: e.total }));
        }
        return null;
      case "guest_orders_confirm":
        // Only ever to the account's own address
        if (user.email && e.total > 0) {
          await emailQuietly(
            guestOrdersConfirmEmail({ to: user.email, name: user.name, total: e.total, link: links.linkGuestOrders(e.token) }),
          );
        }
        return null;
    }
  },
});
