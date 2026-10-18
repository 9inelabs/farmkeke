// Problem reports (M-67 to M-69, W-53, W-54, F-48, A-70 to A-72): shared views.
import type { Doc, Id } from "../_generated/dataModel";
import type { QueryCtx } from "../_generated/server";

export type DisputeViewer = "consumer" | "farmer" | "staff";

export const REASON_LABELS: Record<Doc<"disputes">["reason"], string> = {
  missing: "Missing items",
  damaged: "Damaged or spoiled",
  wrong_item: "Wrong item",
  not_received: "Order not received",
};

async function urls(ctx: QueryCtx, ids: Id<"_storage">[] | undefined) {
  const all = await Promise.all((ids ?? []).map((id) => ctx.storage.getUrl(id)));
  return all.filter((u): u is string => u !== null);
}

/** Messages a viewer may see: both parties see each other; staff notes to one side go to that side only. */
export const visibleTo = (m: Doc<"disputeMessages">, viewer: DisputeViewer) =>
  viewer === "staff" || m.as !== "staff" || m.audience === undefined || m.audience === viewer;

export async function disputeMessages(ctx: QueryCtx, dispute: Doc<"disputes">, viewer: DisputeViewer, viewerId?: Id<"users">) {
  const rows = await ctx.db
    .query("disputeMessages")
    .withIndex("by_disputeId", (q) => q.eq("disputeId", dispute._id))
    .take(300);
  const shown = rows.filter((m) => visibleTo(m, viewer));
  return await Promise.all(
    shown.map(async (m) => {
      const author = m.as === "staff" && m.authorId ? await ctx.db.get("users", m.authorId) : null;
      return {
        _id: m._id,
        from: m.as,
        audience: m.audience ?? null,
        mine: viewer === "staff" ? m.as === "staff" && m.authorId === viewerId : m.as === viewer,
        authorName: m.as === "staff" ? (viewer === "staff" ? (author?.name ?? "Staff") : "Farmkeke support") : null,
        body: m.body,
        photos: await urls(ctx, m.photoIds),
        at: m._creationTime,
      };
    }),
  );
}

/** The case as one party sees it. */
export async function disputeView(ctx: QueryCtx, dispute: Doc<"disputes">, viewer: DisputeViewer, viewerId?: Id<"users">) {
  const order = await ctx.db.get("orders", dispute.orderId);
  const farm = await ctx.db.get("farms", dispute.farmId);
  const messages = await disputeMessages(ctx, dispute, viewer, viewerId);
  const readAt =
    viewer === "consumer" ? dispute.consumerReadAt : viewer === "farmer" ? dispute.farmerReadAt : dispute.staffReadAt;
  const lastFromOthers = messages.filter((m) => !m.mine).at(-1)?.at;
  return {
    _id: dispute._id,
    number: dispute.number,
    orderId: dispute.orderId,
    orderNumber: order?.number ?? "",
    farmId: dispute.farmId,
    farmName: farm?.name ?? "Farm",
    consumerFirstName: order?.contact.name.split(/\s+/)[0] ?? "",
    reason: dispute.reason,
    reasonLabel: REASON_LABELS[dispute.reason],
    items: dispute.itemIndexes.map((index) => {
      const item = order?.items[index];
      return {
        index,
        name: item?.name ?? "",
        quantity: item?.quantity ?? 0,
        unitLabel: item ? (item.quantity === 1 ? item.unitSingular : item.unitPlural) : "",
        lineTotalKobo: item ? item.priceKobo * item.quantity : 0,
      };
    }),
    note: dispute.note,
    photos: await urls(ctx, dispute.photoIds),
    amountKobo: dispute.amountKobo,
    status: dispute.status,
    reportedAt: dispute._creationTime,
    farmReplyBy: dispute.farmReplyBy,
    farmReplyOverdue: dispute.farmReplyOverdueAt !== undefined,
    decideBy: dispute.decideBy,
    farmResponse:
      dispute.farmRespondedAt === undefined
        ? null
        : {
            at: dispute.farmRespondedAt,
            note: dispute.farmResponseNote ?? "",
            photos: await urls(ctx, dispute.farmResponsePhotoIds),
          },
    decision:
      dispute.outcome === undefined
        ? null
        : {
            outcome: dispute.outcome,
            refundKobo: dispute.refundKobo ?? 0,
            releaseKobo: dispute.releaseKobo ?? 0,
            note: dispute.decisionNote ?? "",
            at: dispute.decidedAt ?? null,
          },
    // W-54 "₦12,700 still held"
    heldKobo: order?.escrow === "held" ? order.totalKobo : 0,
    deliveryFeeKobo: order?.deliveryFeeKobo ?? 0,
    itemsTotalKobo: order?.itemsTotalKobo ?? 0,
    canMessage: dispute.status !== "resolved",
    canRespond: viewer === "farmer" && dispute.status === "open",
    unread: lastFromOthers !== undefined && (readAt === undefined || lastFromOthers > readAt),
    messages,
  };
}

/** Short row for lists. */
export async function disputeRow(ctx: QueryCtx, dispute: Doc<"disputes">, viewer: DisputeViewer) {
  const order = await ctx.db.get("orders", dispute.orderId);
  const farm = await ctx.db.get("farms", dispute.farmId);
  const readAt =
    viewer === "consumer" ? dispute.consumerReadAt : viewer === "farmer" ? dispute.farmerReadAt : dispute.staffReadAt;
  return {
    _id: dispute._id,
    number: dispute.number,
    orderId: dispute.orderId,
    orderNumber: order?.number ?? "",
    farmName: farm?.name ?? "Farm",
    consumerName: order?.contact.name ?? "",
    reason: dispute.reason,
    reasonLabel: REASON_LABELS[dispute.reason],
    amountKobo: dispute.amountKobo,
    status: dispute.status,
    outcome: dispute.outcome ?? null,
    reportedAt: dispute._creationTime,
    farmReplyBy: dispute.farmReplyBy,
    farmReplyOverdue: dispute.farmReplyOverdueAt !== undefined,
    decideBy: dispute.decideBy,
    lastMessageAt: dispute.lastMessageAt ?? dispute._creationTime,
    unread: dispute.lastMessageAt !== undefined && (readAt === undefined || dispute.lastMessageAt > readAt),
  };
}
