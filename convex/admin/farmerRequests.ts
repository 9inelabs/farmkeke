// Admin stand-ins for A-20 Farmer requests, A-21 Request review, A-22
// Document viewer, A-23 Approve, A-24 Request more info and A-25 Reject.
import { paginationOptsValidator } from "convex/server";
import { ConvexError, v } from "convex/values";
import type { Id } from "../_generated/dataModel";
import { mutation, query, type MutationCtx } from "../_generated/server";
import { applicationProblems } from "../lib/application";
import { writeAudit } from "../lib/audit";
import { requireStaff } from "../lib/auth";
import { notify } from "../lib/notify";
import { applicationSection, applicationStatus } from "../schema";

// F-09b / F-09c / F-09d: the applicant hears about the decision (push and email).
const APPLICATION_HREF = "/sell/status";


/** A-20: queue by status, oldest submission first (default: new requests). */
export const list = query({
  args: { status: v.optional(applicationStatus), paginationOpts: paginationOptsValidator },
  handler: async (ctx, args) => {
    await requireStaff(ctx, "farmers.view");
    const status = args.status ?? "submitted";
    const page = await ctx.db
      .query("farmerApplications")
      .withIndex("by_status_and_submittedAt", (q) => q.eq("status", status))
      .order("asc")
      .paginate(args.paginationOpts);
    return {
      ...page,
      page: page.page.map((a) => ({
        _id: a._id,
        reference: a.reference ?? null,
        farmName: a.farmName ?? null,
        state: a.state ?? null,
        lga: a.lga ?? null,
        submittedAt: a.submittedAt ?? null,
        status: a.status,
      })),
    };
  },
});

/** A-20 tabs: applications per status (up to 99 each). */
export const counts = query({
  args: {},
  handler: async (ctx) => {
    await requireStaff(ctx, "farmers.view");
    const count = async (status: "submitted" | "more_info") =>
      (
        await ctx.db
          .query("farmerApplications")
          .withIndex("by_status_and_submittedAt", (q) => q.eq("status", status))
          .take(99)
      ).length;
    return { submitted: await count("submitted"), more_info: await count("more_info") };
  },
});

/** A-21 / A-22: everything about one application, with document photo URLs. */
export const get = query({
  args: { applicationId: v.id("farmerApplications") },
  handler: async (ctx, args) => {
    await requireStaff(ctx, "farmers.view");
    const app = await ctx.db.get("farmerApplications", args.applicationId);
    if (app === null) return null;
    const user = await ctx.db.get("users", app.userId);
    const docs = await ctx.db
      .query("farmerDocuments")
      .withIndex("by_applicationId", (q) => q.eq("applicationId", app._id))
      .take(50);
    const documents = await Promise.all(docs.map(async (d) => ({ ...d, url: await ctx.storage.getUrl(d.storageId) })));
    const categories = await Promise.all(app.categoryIds.map((id) => ctx.db.get("categories", id)));
    const history = await ctx.db
      .query("auditLog")
      .withIndex("by_targetTable_and_targetId", (q) => q.eq("targetTable", "farmerApplications").eq("targetId", app._id))
      .order("desc")
      .take(50);
    return {
      application: app,
      applicant: user === null ? null : { _id: user._id, name: user.name, email: user.email, phone: user.phone },
      categories: categories.filter((c) => c !== null).map((c) => c.name),
      documents,
      history,
    };
  },
});

async function loadSubmitted(ctx: MutationCtx, applicationId: Id<"farmerApplications">) {
  const app = await ctx.db.get("farmerApplications", applicationId);
  if (app === null) throw new ConvexError("Application not found");
  if (app.status !== "submitted") throw new ConvexError(`This application is ${app.status}, not waiting for review`);
  return app;
}

/** A-23: approve. Creates the farm, so farmer mode unlocks in the applicant's app. */
export const approve = mutation({
  args: { applicationId: v.id("farmerApplications"), reason: v.string() },
  handler: async (ctx, args) => {
    const actor = await requireStaff(ctx, "farmers.approve");
    const app = await loadSubmitted(ctx, args.applicationId);
    const docs = await ctx.db
      .query("farmerDocuments")
      .withIndex("by_applicationId", (q) => q.eq("applicationId", app._id))
      .take(50);
    const live = docs.filter((d) => d.status !== "rejected" && d.status !== "expired");
    const count = (kind: (typeof docs)[number]["kind"]) => live.filter((d) => d.kind === kind).length;
    const problems = applicationProblems(app, {
      government_id: count("government_id"),
      farm_photo: count("farm_photo"),
      proof_of_address: count("proof_of_address"),
      association_letter: count("association_letter"),
    });
    if (Object.keys(problems).length > 0) throw new ConvexError("Application is incomplete; request more info instead");
    const existing = await ctx.db.query("farms").withIndex("by_userId", (q) => q.eq("userId", app.userId)).unique();
    if (existing !== null) throw new ConvexError("This person already has a farm");

    const farmId = await ctx.db.insert("farms", {
      userId: app.userId,
      applicationId: app._id,
      name: app.farmName!,
      phone: app.phone!,
      state: app.state!,
      lga: app.lga!,
      address: app.address!,
      latitude: app.latitude,
      longitude: app.longitude,
      farmSize: app.farmSize!,
      farmType: app.farmType!,
      categoryIds: app.categoryIds,
      collectionAddress: app.collectionAddress!,
      collectionHours: app.collectionHours,
      leadTimeHours: app.leadTimeHours!,
      // Open on the days riders can collect
      openDays: [...new Set(app.collectionHours.map((h) => h.day))].sort(),
      holidayMode: false,
      bankCode: app.bankCode!,
      bankName: app.bankName!,
      accountNumber: app.accountNumber!,
      accountName: app.accountName!,
      status: "active",
      trusted: false,
    });
    for (const doc of live) await ctx.db.patch("farmerDocuments", doc._id, { status: "approved" });
    await ctx.db.patch("farmerApplications", app._id, { status: "approved", decidedAt: Date.now(), moreInfo: undefined });
    await writeAudit(ctx, {
      actorId: actor._id,
      action: "farmerApplication.approve",
      targetTable: "farmerApplications",
      targetId: app._id,
      reason: args.reason,
      details: { farmId },
    });
    await notify(ctx, {
      userId: app.userId,
      side: "farm",
      kind: "application_approved",
      title: "You're approved",
      body: `${app.farmName} can now sell on Farmkeke. Switch to farmer mode to finish setting up.`,
      href: APPLICATION_HREF,
      smsTo: app.phone,
    });
    return farmId;
  },
});

/** A-24: ask the applicant to fix specific sections (they see F-09b). */
export const requestMoreInfo = mutation({
  args: {
    applicationId: v.id("farmerApplications"),
    sections: v.array(applicationSection),
    note: v.string(),
    // Documents to mark as needing a new photo
    rejectDocumentIds: v.optional(v.array(v.id("farmerDocuments"))),
  },
  handler: async (ctx, args) => {
    const actor = await requireStaff(ctx, "farmers.approve");
    const app = await loadSubmitted(ctx, args.applicationId);
    const note = args.note.trim();
    if (args.sections.length === 0 || note.length === 0) throw new ConvexError("Choose what's missing and add a note");
    for (const id of args.rejectDocumentIds ?? []) {
      const doc = await ctx.db.get("farmerDocuments", id);
      if (doc?.applicationId === app._id) await ctx.db.patch("farmerDocuments", id, { status: "rejected", note });
    }
    await ctx.db.patch("farmerApplications", app._id, {
      status: "more_info",
      moreInfo: { note, sections: [...new Set(args.sections)] },
    });
    await writeAudit(ctx, {
      actorId: actor._id,
      action: "farmerApplication.requestMoreInfo",
      targetTable: "farmerApplications",
      targetId: app._id,
      reason: note,
      details: { sections: args.sections },
    });
    await notify(ctx, {
      userId: app.userId,
      side: "farm",
      kind: "application_more_info",
      title: "We need a bit more",
      body: note.slice(0, 140),
      href: APPLICATION_HREF,
    });
  },
});

/** A-25: reject with a reason and the date they can reapply. Bank details are kept. */
export const reject = mutation({
  args: {
    applicationId: v.id("farmerApplications"),
    reason: v.string(),
    note: v.string(),
    reapplyAfterDays: v.number(),
  },
  handler: async (ctx, args) => {
    const actor = await requireStaff(ctx, "farmers.approve");
    const app = await loadSubmitted(ctx, args.applicationId);
    const reason = args.reason.trim();
    if (reason.length === 0) throw new ConvexError("A reason is required");
    if (!Number.isInteger(args.reapplyAfterDays) || args.reapplyAfterDays < 0 || args.reapplyAfterDays > 365) {
      throw new ConvexError("Reapply after 0 to 365 days");
    }
    await ctx.db.patch("farmerApplications", app._id, {
      status: "rejected",
      decidedAt: Date.now(),
      rejection: { reason, note: args.note.trim(), reapplyAfter: Date.now() + args.reapplyAfterDays * 86_400_000 },
    });
    await writeAudit(ctx, {
      actorId: actor._id,
      action: "farmerApplication.reject",
      targetTable: "farmerApplications",
      targetId: app._id,
      reason,
      details: { reapplyAfterDays: args.reapplyAfterDays },
    });
    await notify(ctx, {
      userId: app.userId,
      side: "farm",
      kind: "application_rejected",
      title: "Not approved this time",
      body: reason.slice(0, 140),
      href: APPLICATION_HREF,
    });
  },
});
