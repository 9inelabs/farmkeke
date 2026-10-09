// F-01 to F-09e: applying to sell on Farmkeke, from the app.
import { ConvexError, v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";
import { mutation, query, type MutationCtx, type QueryCtx } from "./_generated/server";
import { applicationProblems, EDITABLE_STATUSES, MAX_FARM_PHOTOS } from "./lib/application";
import { getViewer, requireAccount } from "./lib/auth";
import { bankName } from "./lib/banks";
import { nextCounter } from "./lib/counters";
import { normalizeNigerianPhone } from "./lib/phone";
import { validateImageUpload } from "./lib/uploads";
import { requireOpeningHours } from "./lib/validate";
import { documentKind, farmSize, farmType, openingHours, season } from "./schema";

const REVIEW_DAYS = 2;

async function latestApplication(ctx: QueryCtx, userId: Id<"users">) {
  return await ctx.db
    .query("farmerApplications")
    .withIndex("by_userId", (q) => q.eq("userId", userId))
    .order("desc")
    .first();
}

async function documentsOf(ctx: QueryCtx, applicationId: Id<"farmerApplications">) {
  return await ctx.db
    .query("farmerDocuments")
    .withIndex("by_applicationId", (q) => q.eq("applicationId", applicationId))
    .take(50);
}

function countDocs(docs: Doc<"farmerDocuments">[]) {
  const live = docs.filter((d) => d.status !== "rejected" && d.status !== "expired");
  const count = (kind: Doc<"farmerDocuments">["kind"]) => live.filter((d) => d.kind === kind).length;
  return {
    government_id: count("government_id"),
    farm_photo: count("farm_photo"),
    proof_of_address: count("proof_of_address"),
    association_letter: count("association_letter"),
  };
}

/** The caller's application in an editable state, or a clear error. */
async function editableApplication(ctx: MutationCtx) {
  const user = await requireAccount(ctx);
  const app = await latestApplication(ctx, user._id);
  if (app === null || !(EDITABLE_STATUSES as readonly string[]).includes(app.status)) {
    throw new ConvexError({ code: "NOT_EDITABLE" });
  }
  return { user, app };
}

/** The caller's latest application with its documents and what's missing. */
export const mine = query({
  args: {},
  handler: async (ctx) => {
    const user = await getViewer(ctx);
    if (user === null || user.isAnonymous) return null;
    const app = await latestApplication(ctx, user._id);
    if (app === null) return null;
    const docs = await documentsOf(ctx, app._id);
    const documents = await Promise.all(
      docs.map(async (d) => ({ ...d, url: await ctx.storage.getUrl(d.storageId) })),
    );
    return {
      ...app,
      documents,
      problems: applicationProblems(app, countDocs(docs)),
      expectedDecisionAt: app.submittedAt === undefined ? null : app.submittedAt + REVIEW_DAYS * 86_400_000,
    };
  },
});

/** F-01 "Apply now" / F-09d "Start a new application". */
export const start = mutation({
  args: {},
  handler: async (ctx) => {
    const user = await requireAccount(ctx);
    const farm = await ctx.db.query("farms").withIndex("by_userId", (q) => q.eq("userId", user._id)).unique();
    if (farm !== null) throw new ConvexError({ code: "ALREADY_FARMER" });
    const latest = await latestApplication(ctx, user._id);
    if (latest !== null && latest.status !== "rejected") return latest._id;
    if (latest?.rejection && latest.rejection.reapplyAfter > Date.now()) {
      throw new ConvexError({ code: "REAPPLY_LATER", reapplyAfter: latest.rejection.reapplyAfter });
    }
    // Rejected applicants keep their bank details for a new application.
    return await ctx.db.insert("farmerApplications", {
      userId: user._id,
      status: "draft",
      phone: user.phone,
      categoryIds: [],
      seasons: [],
      collectionHours: [],
      bankCode: latest?.bankCode,
      bankName: latest?.bankName,
      accountNumber: latest?.accountNumber,
      accountName: latest?.accountName,
    });
  },
});

const optionalText = (value: string | undefined, max = 300) => {
  const trimmed = value?.trim();
  if (trimmed !== undefined && trimmed.length > max) throw new ConvexError({ code: "TOO_LONG" });
  return trimmed === "" ? undefined : trimmed;
};

/** F-03 Farm details. Partial saves are fine; submit checks everything. */
export const saveFarm = mutation({
  args: {
    farmName: v.optional(v.string()),
    phone: v.optional(v.string()),
    state: v.optional(v.string()),
    lga: v.optional(v.string()),
    address: v.optional(v.string()),
    latitude: v.optional(v.number()),
    longitude: v.optional(v.number()),
    farmSize: v.optional(farmSize),
    farmType: v.optional(farmType),
  },
  handler: async (ctx, args) => {
    const { app } = await editableApplication(ctx);
    let phone: string | undefined;
    if (args.phone !== undefined && args.phone.trim() !== "") {
      phone = normalizeNigerianPhone(args.phone) ?? undefined;
      if (phone === undefined) throw new ConvexError({ code: "INVALID_PHONE" });
    }
    await ctx.db.patch("farmerApplications", app._id, {
      farmName: optionalText(args.farmName, 80),
      phone,
      state: optionalText(args.state, 60),
      lga: optionalText(args.lga, 60),
      address: optionalText(args.address),
      latitude: args.latitude,
      longitude: args.longitude,
      farmSize: args.farmSize,
      farmType: args.farmType,
    });
  },
});

/** F-04 What you grow. */
export const saveProduce = mutation({
  args: {
    categoryIds: v.array(v.id("categories")),
    mainCrops: v.optional(v.string()),
    typicalVolume: v.optional(v.string()),
    seasons: v.array(season),
  },
  handler: async (ctx, args) => {
    const { app } = await editableApplication(ctx);
    for (const id of args.categoryIds) {
      const category = await ctx.db.get("categories", id);
      if (category === null || category.hidden) throw new ConvexError({ code: "UNKNOWN_CATEGORY" });
    }
    await ctx.db.patch("farmerApplications", app._id, {
      categoryIds: [...new Set(args.categoryIds)],
      mainCrops: optionalText(args.mainCrops),
      typicalVolume: optionalText(args.typicalVolume),
      seasons: [...new Set(args.seasons)],
    });
  },
});

/** F-05 Collection details. */
export const saveCollection = mutation({
  args: {
    collectionAddress: v.optional(v.string()),
    collectionHours: openingHours,
    leadTimeHours: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { app } = await editableApplication(ctx);
    requireOpeningHours(args.collectionHours);
    if (args.leadTimeHours !== undefined && ![4, 12, 24, 48].includes(args.leadTimeHours)) {
      throw new ConvexError({ code: "INVALID_LEAD_TIME" });
    }
    await ctx.db.patch("farmerApplications", app._id, {
      collectionAddress: optionalText(args.collectionAddress),
      collectionHours: args.collectionHours,
      leadTimeHours: args.leadTimeHours,
    });
  },
});

/** F-07 Payout details. */
export const savePayout = mutation({
  args: {
    bankCode: v.optional(v.string()),
    accountNumber: v.optional(v.string()),
    accountName: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { app } = await editableApplication(ctx);
    const name = args.bankCode ? bankName(args.bankCode) : null;
    if (args.bankCode && name === null) throw new ConvexError({ code: "UNKNOWN_BANK" });
    const accountNumber = args.accountNumber?.replace(/\D/g, "");
    if (accountNumber && accountNumber.length !== 10) throw new ConvexError({ code: "INVALID_ACCOUNT_NUMBER" });
    await ctx.db.patch("farmerApplications", app._id, {
      bankCode: args.bankCode || undefined,
      bankName: name ?? undefined,
      accountNumber: accountNumber || undefined,
      accountName: optionalText(args.accountName, 100),
    });
  },
});

/** F-06: an upload URL for one document photo (also used by F-70 and F-73). */
export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    await requireAccount(ctx);
    return await ctx.storage.generateUploadUrl();
  },
});

/** F-06: attach an uploaded photo. ID, proof of address and letter keep one photo each. */
export const addDocument = mutation({
  args: { kind: documentKind, storageId: v.id("_storage") },
  handler: async (ctx, args) => {
    const { user, app } = await editableApplication(ctx);
    await validateImageUpload(ctx, args.storageId);
    const existing = await documentsOf(ctx, app._id);
    const sameKind = existing.filter((d) => d.kind === args.kind);
    if (args.kind === "farm_photo") {
      if (sameKind.filter((d) => d.status !== "rejected").length >= MAX_FARM_PHOTOS) {
        await ctx.storage.delete(args.storageId);
        throw new ConvexError({ code: "TOO_MANY_PHOTOS" });
      }
    } else {
      for (const old of sameKind) {
        await ctx.storage.delete(old.storageId);
        await ctx.db.delete("farmerDocuments", old._id);
      }
    }
    return await ctx.db.insert("farmerDocuments", {
      userId: user._id,
      applicationId: app._id,
      kind: args.kind,
      storageId: args.storageId,
      status: "pending",
    });
  },
});

export const removeDocument = mutation({
  args: { documentId: v.id("farmerDocuments") },
  handler: async (ctx, args) => {
    const { app } = await editableApplication(ctx);
    const doc = await ctx.db.get("farmerDocuments", args.documentId);
    if (doc === null || doc.applicationId !== app._id) throw new ConvexError({ code: "NOT_FOUND" });
    await ctx.storage.delete(doc.storageId);
    await ctx.db.delete("farmerDocuments", doc._id);
  },
});

/** F-08 Submit (and F-09b Resubmit). */
export const submit = mutation({
  args: { acceptTerms: v.boolean() },
  handler: async (ctx, args) => {
    const { user, app } = await editableApplication(ctx);
    if (!args.acceptTerms) throw new ConvexError({ code: "TERMS_REQUIRED" });
    const docs = await documentsOf(ctx, app._id);
    const problems = applicationProblems(app, countDocs(docs));
    if (Object.keys(problems).length > 0) throw new ConvexError({ code: "INCOMPLETE", sections: Object.keys(problems) });

    // The phone becomes a way to sign in, so it must belong to one account.
    const phone = app.phone!;
    const owner = await ctx.db.query("users").withIndex("phone", (q) => q.eq("phone", phone)).first();
    if (owner !== null && owner._id !== user._id) throw new ConvexError({ code: "PHONE_TAKEN" });
    if (user.phone !== phone) await ctx.db.patch("users", user._id, { phone });

    const reference = app.reference ?? `FA-${await nextCounter(ctx, "farmerApplication", 10001)}`;
    await ctx.db.patch("farmerApplications", app._id, {
      status: "submitted",
      reference,
      termsAcceptedAt: Date.now(),
      submittedAt: Date.now(),
      moreInfo: app.status === "more_info" ? app.moreInfo : undefined,
    });
    return { reference };
  },
});
