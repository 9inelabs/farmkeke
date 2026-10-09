import { authTables } from "@convex-dev/auth/server";
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

// Money is stored as integer kobo (₦1 = 100 kobo) everywhere.

export const staffRole = v.union(
  v.literal("super_admin"),
  v.literal("operations"),
  v.literal("finance"),
  v.literal("support"),
);

export const openingHours = v.array(
  v.object({
    // 0 = Sunday … 6 = Saturday
    day: v.number(),
    // 24-hour "HH:MM"
    opens: v.string(),
    closes: v.string(),
  }),
);

export const farmSize = v.union(
  v.literal("under_1"),
  v.literal("1_to_5"),
  v.literal("5_to_20"),
  v.literal("over_20"),
);

export const farmType = v.union(
  v.literal("crops"),
  v.literal("livestock"),
  v.literal("poultry"),
  v.literal("fish"),
  v.literal("mixed"),
);

export const season = v.union(v.literal("all_year"), v.literal("rainy"), v.literal("dry"));

export const documentKind = v.union(
  v.literal("government_id"),
  v.literal("farm_photo"),
  v.literal("proof_of_address"),
  v.literal("association_letter"),
);

export const applicationStatus = v.union(
  v.literal("draft"),
  v.literal("submitted"),
  v.literal("more_info"),
  v.literal("approved"),
  v.literal("rejected"),
);

// Sections an admin can ask an applicant to fix (A-24, F-09b).
export const applicationSection = v.union(
  v.literal("farm"),
  v.literal("produce"),
  v.literal("collection"),
  v.literal("documents"),
  v.literal("payout"),
);

export default defineSchema({
  ...authTables,

  // Extends Convex Auth's users table; the auth fields and the "email" and
  // "phone" indexes must stay as Convex Auth defines them.
  users: defineTable({
    name: v.optional(v.string()),
    image: v.optional(v.string()),
    email: v.optional(v.string()),
    emailVerificationTime: v.optional(v.number()),
    phone: v.optional(v.string()),
    phoneVerificationTime: v.optional(v.number()),
    isAnonymous: v.optional(v.boolean()),
    // Farmkeke staff only (Admin Portal roles, A-89)
    staffRole: v.optional(staffRole),
    // A-37: blocked consumers can't sign in or order
    blockedAt: v.optional(v.number()),
    blockReason: v.optional(v.string()),
  })
    .index("email", ["email"])
    .index("phone", ["phone"])
    .index("by_staffRole", ["staffRole"]),

  // A-80. Fixed set of 8 at launch; staff can rename, reorder, hide.
  categories: defineTable({
    slug: v.string(),
    name: v.string(),
    // Key of an illustration bundled in the app (assets/categories/<key>.png)
    illustration: v.string(),
    sortOrder: v.number(),
    hidden: v.boolean(),
  })
    .index("by_slug", ["slug"])
    .index("by_hidden_and_sortOrder", ["hidden", "sortOrder"]),

  // A-81. Units farmers sell in. Retired units stay for old listings/orders.
  units: defineTable({
    slug: v.string(),
    singular: v.string(),
    plural: v.string(),
    sortOrder: v.number(),
    retired: v.boolean(),
  })
    .index("by_slug", ["slug"])
    .index("by_retired_and_sortOrder", ["retired", "sortOrder"]),

  // A-83. Areas riders cover, each with its own delivery fee per farm order.
  serviceAreas: defineTable({
    state: v.string(),
    name: v.string(),
    lga: v.string(),
    deliveryFeeKobo: v.number(),
    active: v.boolean(),
    sortOrder: v.number(),
    // Centre and radius used to match a phone's GPS position to an area (M-05)
    latitude: v.optional(v.number()),
    longitude: v.optional(v.number()),
    radiusKm: v.optional(v.number()),
  })
    .index("by_state_and_name", ["state", "name"])
    .index("by_active_and_state_and_sortOrder", ["active", "state", "sortOrder"]),

  // A-82. Farmkeke-run pickup points.
  pickupPoints: defineTable({
    name: v.string(),
    address: v.string(),
    state: v.string(),
    lga: v.string(),
    latitude: v.number(),
    longitude: v.number(),
    hours: openingHours,
    phone: v.string(),
    // Days a consumer has to collect once the order arrives
    collectWithinDays: v.number(),
    photoStorageId: v.optional(v.id("_storage")),
    active: v.boolean(),
  })
    .index("by_name", ["name"])
    .index("by_active_and_state", ["active", "state"]),

  // M-84 / M-85. A consumer's saved delivery addresses.
  addresses: defineTable({
    userId: v.id("users"),
    label: v.union(v.literal("home"), v.literal("work"), v.literal("other")),
    street: v.string(),
    landmark: v.string(),
    serviceAreaId: v.id("serviceAreas"),
    // Exact drop-off pin (M-35), added with maps in Phase 6
    latitude: v.optional(v.number()),
    longitude: v.optional(v.number()),
    isDefault: v.boolean(),
  }).index("by_userId", ["userId"]),

  // M-S4 / M-S5. One row (key "app") read by every app on launch.
  appConfig: defineTable({
    key: v.literal("app"),
    minAppVersion: v.string(),
    latestAppVersion: v.string(),
    androidStoreUrl: v.optional(v.string()),
    iosStoreUrl: v.optional(v.string()),
    maintenanceActive: v.boolean(),
    maintenanceMessage: v.optional(v.string()),
    maintenanceUntil: v.optional(v.number()),
  }).index("by_key", ["key"]),

  // M-07 "Notify me when available": interest from places we don't serve yet.
  areaRequests: defineTable({
    place: v.string(),
    state: v.optional(v.string()),
    email: v.string(),
    userId: v.optional(v.id("users")),
    latitude: v.optional(v.number()),
    longitude: v.optional(v.number()),
  }).index("by_email", ["email"]),

  // A-38. Record of account deletions. Holds no personal data.
  accountDeletions: defineTable({
    // Id of the deleted user, kept as text because the user row is gone
    userId: v.string(),
    status: v.union(v.literal("completed"), v.literal("waiting_for_orders")),
    completedAt: v.optional(v.number()),
  }).index("by_status", ["status"]),

  // Sequential human-readable numbers (application FA-10001, later orders).
  counters: defineTable({ name: v.string(), value: v.number() }).index("by_name", ["name"]),

  // F-03 to F-09e. One row per application; a rejected applicant starts a new one.
  farmerApplications: defineTable({
    userId: v.id("users"),
    status: applicationStatus,
    reference: v.optional(v.string()),
    // F-03 Farm details
    farmName: v.optional(v.string()),
    phone: v.optional(v.string()),
    state: v.optional(v.string()),
    lga: v.optional(v.string()),
    address: v.optional(v.string()),
    latitude: v.optional(v.number()),
    longitude: v.optional(v.number()),
    farmSize: v.optional(farmSize),
    farmType: v.optional(farmType),
    // F-04 What you grow
    categoryIds: v.array(v.id("categories")),
    mainCrops: v.optional(v.string()),
    typicalVolume: v.optional(v.string()),
    seasons: v.array(season),
    // F-05 Collection details
    collectionAddress: v.optional(v.string()),
    collectionHours: openingHours,
    leadTimeHours: v.optional(v.number()),
    // F-07 Payout details (automatic name check arrives with payments, Phase 7)
    bankCode: v.optional(v.string()),
    bankName: v.optional(v.string()),
    accountNumber: v.optional(v.string()),
    accountName: v.optional(v.string()),
    // F-08 / decisions
    termsAcceptedAt: v.optional(v.number()),
    submittedAt: v.optional(v.number()),
    decidedAt: v.optional(v.number()),
    moreInfo: v.optional(v.object({ note: v.string(), sections: v.array(applicationSection) })),
    rejection: v.optional(v.object({ reason: v.string(), note: v.string(), reapplyAfter: v.number() })),
  })
    .index("by_userId", ["userId"])
    .index("by_status_and_submittedAt", ["status", "submittedAt"]),

  // F-06 / F-73. Photos of each document, reviewed by staff.
  farmerDocuments: defineTable({
    userId: v.id("users"),
    applicationId: v.id("farmerApplications"),
    kind: documentKind,
    storageId: v.id("_storage"),
    status: v.union(v.literal("pending"), v.literal("approved"), v.literal("rejected"), v.literal("expired")),
    note: v.optional(v.string()),
  })
    .index("by_applicationId", ["applicationId"])
    .index("by_userId", ["userId"]),

  // Created when an application is approved. One login per farm.
  farms: defineTable({
    userId: v.id("users"),
    applicationId: v.id("farmerApplications"),
    name: v.string(),
    phone: v.string(),
    description: v.optional(v.string()),
    photoStorageId: v.optional(v.id("_storage")),
    state: v.string(),
    lga: v.string(),
    address: v.string(),
    latitude: v.optional(v.number()),
    longitude: v.optional(v.number()),
    farmSize: farmSize,
    farmType: farmType,
    categoryIds: v.array(v.id("categories")),
    // F-71 Fulfilment settings
    collectionAddress: v.string(),
    collectionHours: openingHours,
    leadTimeHours: v.number(),
    // F-72 Availability: 0 = Sunday … 6 = Saturday
    openDays: v.array(v.number()),
    holidayMode: v.boolean(),
    // Payout account (F-62 editing arrives with payments, Phase 7)
    bankCode: v.string(),
    bankName: v.string(),
    accountNumber: v.string(),
    accountName: v.string(),
    status: v.union(v.literal("active"), v.literal("suspended")),
    suspendedReason: v.optional(v.string()),
    // A-31: trusted farms' listings skip review (Phase 4)
    trusted: v.boolean(),
    // F-14 setup checklist
    profileConfirmedAt: v.optional(v.number()),
    collectionConfirmedAt: v.optional(v.number()),
  })
    .index("by_userId", ["userId"])
    .index("by_status", ["status"]),

  // A-90. Every sensitive staff action, with who, what, when and why.
  auditLog: defineTable({
    actorId: v.id("users"),
    action: v.string(),
    targetTable: v.string(),
    targetId: v.string(),
    reason: v.string(),
    details: v.optional(v.string()),
  })
    .index("by_actorId", ["actorId"])
    .index("by_targetTable_and_targetId", ["targetTable", "targetId"]),
});
