// Admin → Messages (30 Oct 2026): staff with messages.send (Admin,
// Operations, Support) send a notification to every shopper, every farmer,
// both, or one person. It goes in the app's Notifications and by push, never
// by text or email. Delivery runs in the background in batches; each person
// gets an ordinary notifications row, so the inbox, badge and push work as
// for order updates. A service update ("broadcast") always pushes; an offer
// ("offer") only pushes to people who turned on Offers and news (shoppers)
// or Farmkeke news (farmers).
import { paginationOptsValidator } from "convex/server";
import { ConvexError, v } from "convex/values";
import { internal } from "../_generated/api";
import type { Doc, Id } from "../_generated/dataModel";
import { internalMutation, mutation, query, type QueryCtx } from "../_generated/server";
import { writeAudit } from "../lib/audit";
import { requireStaff } from "../lib/auth";
import { notify } from "../lib/notify";
import { normalizeNigerianPhone } from "../lib/phone";
import { broadcastLink } from "../schema";

const TITLE_MAX = 60;
const BODY_MAX = 200;
// People per delivery batch (each gets a row and a scheduled push)
const BATCH = 100;
// The reach preview counts this many at most, then shows "5,000+"
const COUNT_CAP = 5000;
const MAX_SCHEDULE_MS = 30 * 86_400_000;

type Side = "shop" | "farm";
type Link = Doc<"broadcasts">["link"];

const SHOP_LINKS = new Set<Link["to"]>(["message", "home", "orders", "product", "farm", "category"]);
const FARM_LINKS = new Set<Link["to"]>(["message", "dashboard", "listings", "sales", "earnings"]);

/** The in-app route the notification opens. */
export function hrefFor(side: Side, link: Link): string {
  switch (link.to) {
    case "message":
      return side === "farm" ? "/notifications?side=farm" : "/notifications";
    case "home":
      return "/home";
    case "orders":
      return "/orders";
    case "product":
      return `/product/${link.id}`;
    case "farm":
      return `/farm/${link.id}`;
    case "category":
      return `/category/${link.id}`;
    case "dashboard":
      return "/dashboard";
    case "listings":
      return "/listings";
    case "sales":
      return "/sales";
    case "earnings":
      return "/earnings";
  }
}

/** Shoppers are signed-in accounts (not guests) that aren't blocked. */
const isShopper = (u: Doc<"users">) => !u.isAnonymous && u.blockedAt === undefined;

async function checkLink(ctx: QueryCtx, side: Doc<"broadcasts">["side"], link: Link) {
  if (side === "both" && link.to !== "message") throw new ConvexError({ code: "LINK_NOT_FOR_BOTH" });
  if (side === "shop" && !SHOP_LINKS.has(link.to)) throw new ConvexError({ code: "LINK_WRONG_SIDE" });
  if (side === "farm" && !FARM_LINKS.has(link.to)) throw new ConvexError({ code: "LINK_WRONG_SIDE" });
  const id = link.id?.trim() ?? "";
  if (link.to === "product") {
    const listingId = ctx.db.normalizeId("listings", id);
    const listing = listingId ? await ctx.db.get("listings", listingId) : null;
    if (listing === null || listing.status !== "live") throw new ConvexError({ code: "LINK_NOT_FOUND" });
  } else if (link.to === "farm") {
    const farmId = ctx.db.normalizeId("farms", id);
    const farm = farmId ? await ctx.db.get("farms", farmId) : null;
    if (farm === null || farm.status !== "active") throw new ConvexError({ code: "LINK_NOT_FOUND" });
  } else if (link.to === "category") {
    const category = await ctx.db
      .query("categories")
      .withIndex("by_slug", (q) => q.eq("slug", id))
      .unique();
    if (category === null || category.hidden) throw new ConvexError({ code: "LINK_NOT_FOUND" });
  }
  return link.to === "product" || link.to === "farm" || link.to === "category" ? { to: link.to, id } : { to: link.to };
}

/** One person, by their phone number or email. */
async function findPerson(ctx: QueryCtx, contact: string) {
  const value = contact.trim();
  if (value.includes("@")) {
    return await ctx.db
      .query("users")
      .withIndex("email", (q) => q.eq("email", value.toLowerCase()))
      .first();
  }
  const phone = normalizeNigerianPhone(value);
  if (phone === null) return null;
  return await ctx.db
    .query("users")
    .withIndex("phone", (q) => q.eq("phone", phone))
    .first();
}

async function farmOf(ctx: QueryCtx, userId: Id<"users">) {
  return await ctx.db
    .query("farms")
    .withIndex("by_userId", (q) => q.eq("userId", userId))
    .unique();
}

/** The person a one-person message goes to, checked for the side. */
async function personFor(ctx: QueryCtx, side: Doc<"broadcasts">["side"], contact: string | undefined) {
  if (side === "both") throw new ConvexError({ code: "ONE_NEEDS_A_SIDE" });
  const person = contact ? await findPerson(ctx, contact) : null;
  if (person === null || person.isAnonymous) throw new ConvexError({ code: "PERSON_NOT_FOUND" });
  if (side === "farm" && (await farmOf(ctx, person._id)) === null) throw new ConvexError({ code: "NOT_A_FARMER" });
  return person;
}

const audienceArgs = {
  side: v.union(v.literal("shop"), v.literal("farm"), v.literal("both")),
  audience: v.union(v.literal("everyone"), v.literal("one")),
  // Phone number or email, for a one-person message
  contact: v.optional(v.string()),
};

/** "Who it reaches": how many people, and how many have push alerts on a phone. */
export const reach = query({
  args: audienceArgs,
  handler: async (ctx, args) => {
    await requireStaff(ctx, "messages.send");
    if (args.audience === "one") {
      if (!args.contact?.trim()) return { people: 0, withPush: 0, capped: false, person: null };
      try {
        const person = await personFor(ctx, args.side, args.contact);
        const tokens = await ctx.db
          .query("pushTokens")
          .withIndex("by_userId", (q) => q.eq("userId", person._id))
          .take(1);
        return { people: 1, withPush: tokens.length, capped: false, person: { name: person.name ?? null, phone: person.phone ?? null, email: person.email ?? null } };
      } catch {
        return { people: 0, withPush: 0, capped: false, person: null };
      }
    }
    const people = new Set<Id<"users">>();
    let capped = false;
    if (args.side !== "farm") {
      const users = await ctx.db.query("users").take(COUNT_CAP);
      capped ||= users.length === COUNT_CAP;
      for (const u of users) if (isShopper(u)) people.add(u._id);
    }
    if (args.side !== "shop") {
      const farms = await ctx.db.query("farms").take(COUNT_CAP);
      capped ||= farms.length === COUNT_CAP;
      for (const f of farms) people.add(f.userId);
    }
    const tokens = await ctx.db.query("pushTokens").take(COUNT_CAP);
    const withPush = new Set(tokens.filter((t) => people.has(t.userId)).map((t) => t.userId)).size;
    return { people: people.size, withPush, capped, person: null };
  },
});

const message = {
  ...audienceArgs,
  kind: v.union(v.literal("update"), v.literal("offer")),
  title: v.string(),
  body: v.string(),
  link: broadcastLink,
};

function cleanCopy(title: string, body: string) {
  const t = title.trim();
  const b = body.trim();
  if (!t || !b) throw new ConvexError({ code: "TEXT_REQUIRED" });
  if (t.length > TITLE_MAX || b.length > BODY_MAX) throw new ConvexError({ code: "TOO_LONG" });
  return { title: t, body: b };
}

const notificationKind = (kind: Doc<"broadcasts">["kind"]) => (kind === "offer" ? "offer" : "broadcast");

/** Send now, or at `sendAt` (up to 30 days ahead). */
export const send = mutation({
  args: { ...message, sendAt: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const staff = await requireStaff(ctx, "messages.send");
    const { title, body } = cleanCopy(args.title, args.body);
    const link = await checkLink(ctx, args.side, args.link);
    const person = args.audience === "one" ? await personFor(ctx, args.side, args.contact) : null;
    const now = Date.now();
    const later = args.sendAt !== undefined && args.sendAt > now + 60_000;
    if (later && args.sendAt! > now + MAX_SCHEDULE_MS) throw new ConvexError({ code: "TOO_FAR_AHEAD" });
    const sendAt = later ? args.sendAt! : now;
    const broadcastId = await ctx.db.insert("broadcasts", {
      side: args.side,
      audience: args.audience,
      recipientId: person?._id,
      kind: args.kind,
      title,
      body,
      link,
      status: later ? "scheduled" : "sending",
      sendAt,
      createdBy: staff._id,
      recipients: 0,
    });
    await writeAudit(ctx, {
      actorId: staff._id,
      action: later ? "messages.schedule" : "messages.send",
      targetTable: "broadcasts",
      targetId: broadcastId,
      reason: title,
      details: { side: args.side, audience: args.audience, kind: args.kind, ...(person ? { to: person._id } : {}), ...(later ? { sendAt } : {}) },
    });
    const first = { broadcastId, phase: args.side === "farm" ? ("farm" as const) : ("shop" as const), cursor: null };
    if (later) await ctx.scheduler.runAt(sendAt, internal.admin.messages.deliverBatch, first);
    else await ctx.scheduler.runAfter(0, internal.admin.messages.deliverBatch, first);
    return { broadcastId, scheduled: later };
  },
});

/** "Send a test to my phone": to the staff member's own account only. */
export const sendTest = mutation({
  args: message,
  handler: async (ctx, args) => {
    const staff = await requireStaff(ctx, "messages.send");
    const { title, body } = cleanCopy(args.title, args.body);
    const link = await checkLink(ctx, args.side, args.link);
    const side: Side = args.side === "farm" ? "farm" : "shop";
    await notify(ctx, { userId: staff._id, side, kind: notificationKind(args.kind), title: `[Test] ${title}`, body, href: hrefFor(side, link) });
    return null;
  },
});

/** Delivers one batch, then schedules the next (shoppers, then farmers). */
export const deliverBatch = internalMutation({
  args: { broadcastId: v.id("broadcasts"), phase: v.union(v.literal("shop"), v.literal("farm")), cursor: v.union(v.string(), v.null()) },
  handler: async (ctx, args) => {
    const b = await ctx.db.get("broadcasts", args.broadcastId);
    // Cancelled before it went, or withdrawn while sending
    if (b === null || (b.status !== "scheduled" && b.status !== "sending")) return null;
    if (b.status === "scheduled") await ctx.db.patch("broadcasts", b._id, { status: "sending" });
    const kind = notificationKind(b.kind);
    const href = hrefFor(args.phase, b.link);
    const deliver = async (userId: Id<"users">) =>
      await notify(ctx, { userId, side: args.phase, kind, title: b.title, body: b.body, href, broadcastId: b._id });

    if (b.audience === "one") {
      if (b.recipientId) await deliver(b.recipientId);
      await ctx.db.patch("broadcasts", b._id, { status: "sent", sentAt: Date.now(), recipients: b.recipientId ? 1 : 0 });
      return null;
    }

    let sent = 0;
    let next: string | null = null;
    if (args.phase === "shop") {
      const page = await ctx.db.query("users").paginate({ numItems: BATCH, cursor: args.cursor });
      for (const u of page.page) {
        if (!isShopper(u)) continue;
        await deliver(u._id);
        sent++;
      }
      next = page.isDone ? null : page.continueCursor;
    } else {
      const page = await ctx.db.query("farms").paginate({ numItems: BATCH, cursor: args.cursor });
      for (const f of page.page) {
        await deliver(f.userId);
        sent++;
      }
      next = page.isDone ? null : page.continueCursor;
    }
    await ctx.db.patch("broadcasts", b._id, { recipients: b.recipients + sent });

    if (next !== null) {
      await ctx.scheduler.runAfter(0, internal.admin.messages.deliverBatch, { broadcastId: b._id, phase: args.phase, cursor: next });
    } else if (args.phase === "shop" && b.side === "both") {
      await ctx.scheduler.runAfter(0, internal.admin.messages.deliverBatch, { broadcastId: b._id, phase: "farm", cursor: null });
    } else {
      await ctx.db.patch("broadcasts", b._id, { status: "sent", sentAt: Date.now() });
    }
    return null;
  },
});

/** A scheduled message that hasn't gone yet. */
export const cancel = mutation({
  args: { broadcastId: v.id("broadcasts") },
  handler: async (ctx, args) => {
    const staff = await requireStaff(ctx, "messages.send");
    const b = await ctx.db.get("broadcasts", args.broadcastId);
    if (b === null) throw new ConvexError({ code: "NOT_FOUND" });
    if (b.status !== "scheduled") throw new ConvexError({ code: "WRONG_STATUS", status: b.status });
    await ctx.db.patch("broadcasts", b._id, { status: "cancelled" });
    await writeAudit(ctx, { actorId: staff._id, action: "messages.cancel", targetTable: "broadcasts", targetId: b._id, reason: b.title });
    return null;
  },
});

/**
 * Takes a sent message out of everyone's Notifications. Push alerts already
 * shown on phones can't be taken back.
 */
export const withdraw = mutation({
  args: { broadcastId: v.id("broadcasts") },
  handler: async (ctx, args) => {
    const staff = await requireStaff(ctx, "messages.send");
    const b = await ctx.db.get("broadcasts", args.broadcastId);
    if (b === null) throw new ConvexError({ code: "NOT_FOUND" });
    if (b.status !== "sent" && b.status !== "sending") throw new ConvexError({ code: "WRONG_STATUS", status: b.status });
    await ctx.db.patch("broadcasts", b._id, { status: "withdrawn", withdrawnAt: Date.now() });
    await writeAudit(ctx, { actorId: staff._id, action: "messages.withdraw", targetTable: "broadcasts", targetId: b._id, reason: b.title });
    await ctx.scheduler.runAfter(0, internal.admin.messages.removeBatch, { broadcastId: b._id });
    return null;
  },
});

export const removeBatch = internalMutation({
  args: { broadcastId: v.id("broadcasts") },
  handler: async (ctx, args) => {
    const rows = await ctx.db
      .query("notifications")
      .withIndex("by_broadcastId_and_readAt", (q) => q.eq("broadcastId", args.broadcastId))
      .take(BATCH * 2);
    for (const n of rows) await ctx.db.delete("notifications", n._id);
    if (rows.length === BATCH * 2) await ctx.scheduler.runAfter(0, internal.admin.messages.removeBatch, args);
    return null;
  },
});

async function row(ctx: QueryCtx, b: Doc<"broadcasts">) {
  const sender = await ctx.db.get("users", b.createdBy);
  const recipient = b.recipientId ? await ctx.db.get("users", b.recipientId) : null;
  return {
    _id: b._id,
    side: b.side,
    audience: b.audience,
    recipient: recipient ? (recipient.name ?? recipient.phone ?? recipient.email ?? "One person") : null,
    kind: b.kind,
    title: b.title,
    body: b.body,
    link: b.link,
    status: b.status,
    sendAt: b.sendAt,
    sentAt: b.sentAt ?? null,
    sentBy: sender?.name ?? sender?.email ?? "Staff",
    recipients: b.recipients,
  };
}

/** Newest first; "scheduled" for the ones still to go. */
export const list = query({
  args: { paginationOpts: paginationOptsValidator, status: v.optional(v.literal("scheduled")) },
  handler: async (ctx, args) => {
    await requireStaff(ctx, "messages.send");
    const result =
      args.status === "scheduled"
        ? await ctx.db
            .query("broadcasts")
            .withIndex("by_status", (q) => q.eq("status", "scheduled"))
            .order("desc")
            .paginate(args.paginationOpts)
        : await ctx.db.query("broadcasts").order("desc").paginate(args.paginationOpts);
    return { ...result, page: await Promise.all(result.page.map((b) => row(ctx, b))) };
  },
});

/** People who opened it in the app (counted up to 5,000). */
export const opened = query({
  args: { broadcastId: v.id("broadcasts") },
  handler: async (ctx, args) => {
    await requireStaff(ctx, "messages.send");
    const read = await ctx.db
      .query("notifications")
      .withIndex("by_broadcastId_and_readAt", (q) => q.eq("broadcastId", args.broadcastId).gt("readAt", 0))
      .take(COUNT_CAP);
    return { count: read.length, capped: read.length === COUNT_CAP };
  },
});

