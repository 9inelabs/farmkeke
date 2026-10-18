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

export const listingStatus = v.union(
  v.literal("draft"),
  v.literal("under_review"),
  v.literal("needs_changes"),
  v.literal("live"),
  v.literal("paused"),
);

// One way a listing is sold: its unit, price, stock left and minimum order.
export const listingUnit = v.object({
  unitId: v.id("units"),
  priceKobo: v.number(),
  stock: v.number(),
  minOrder: v.number(),
});

// ---------------------------------------------------------------------------
// Ordering, escrow and payments (Phase 6–7, rebuilt in 3a)

// Screen Inventory "Escrow order states", plus the side states. Packing is a
// step inside "preparing" (packedAt), not its own status.
export const orderStatus = v.union(
  v.literal("awaiting_payment"),
  // Paid, money held, waiting for the farm to accept (24h)
  v.literal("paid"),
  v.literal("accepted"),
  v.literal("preparing"),
  v.literal("ready_for_rider"),
  // Delivery orders once the rider has them
  v.literal("out_for_delivery"),
  // Pickup orders on their way to the pickup point
  v.literal("with_rider"),
  v.literal("at_pickup_point"),
  v.literal("delivered"),
  v.literal("collected"),
  v.literal("completed"),
  v.literal("declined"),
  v.literal("expired"),
  v.literal("cancelled"),
  v.literal("disputed"),
);

// Where the order's money is. "split" = part refunded, the rest released.
export const escrowState = v.union(
  v.literal("none"),
  v.literal("held"),
  v.literal("released"),
  v.literal("refunded"),
  v.literal("split"),
);

export const fulfilment = v.union(v.literal("delivery"), v.literal("pickup"));

export const deliveryWindow = v.object({ day: v.string(), from: v.string(), to: v.string() });

export const orderContact = v.object({
  name: v.string(),
  phone: v.string(),
  email: v.optional(v.string()),
});

export const orderAddress = v.object({
  street: v.string(),
  landmark: v.string(),
  serviceAreaId: v.id("serviceAreas"),
  areaName: v.string(),
  lga: v.string(),
  state: v.string(),
  latitude: v.optional(v.number()),
  longitude: v.optional(v.number()),
});

// A line as sold: names and price copied so later edits don't change the order.
export const orderItem = v.object({
  listingId: v.id("listings"),
  unitId: v.id("units"),
  name: v.string(),
  unitSingular: v.string(),
  unitPlural: v.string(),
  priceKobo: v.number(),
  quantity: v.number(),
  photoId: v.optional(v.id("_storage")),
});

export const actorKind = v.union(
  v.literal("consumer"),
  v.literal("guest"),
  v.literal("farmer"),
  v.literal("staff"),
  v.literal("system"),
);

export const notificationSide = v.union(v.literal("shop"), v.literal("farm"));

export const paymentMethod = v.union(
  v.literal("card"),
  v.literal("bank_transfer"),
  v.literal("ussd"),
  v.literal("saved_card"),
);

export const refundStatus = v.union(
  v.literal("queued"),
  v.literal("sending"),
  v.literal("processing"),
  v.literal("processed"),
  v.literal("failed"),
);

export const payoutStatus = v.union(v.literal("pending"), v.literal("sent"), v.literal("failed"));

export const disputeStatus = v.union(v.literal("open"), v.literal("farmer_responded"), v.literal("resolved"));

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
    // M-49 / W-44: a guest's one-time token for linking their orders to an account
    guestClaimToken: v.optional(v.string()),
    guestClaimExpiresAt: v.optional(v.number()),
  })
    .index("email", ["email"])
    .index("phone", ["phone"])
    .index("by_staffRole", ["staffRole"])
    .index("by_guestClaimToken", ["guestClaimToken"]),

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

  // F-20 to F-31. A farm's produce listing. "Out of stock" is a live listing
  // with no stock left in any unit, not a separate status.
  listings: defineTable({
    farmId: v.id("farms"),
    status: listingStatus,
    name: v.string(),
    categoryId: v.optional(v.id("categories")),
    description: v.optional(v.string()),
    // "YYYY-MM-DD"
    harvestedOn: v.optional(v.string()),
    // The first photo is the cover.
    photoIds: v.array(v.id("_storage")),
    units: v.array(listingUnit),
    delivery: v.boolean(),
    pickup: v.boolean(),
    // Staff's reason when sent back or unpublished (F-31)
    reviewNote: v.optional(v.string()),
    submittedAt: v.optional(v.number()),
    liveAt: v.optional(v.number()),
    deletedAt: v.optional(v.number()),
  })
    .index("by_farmId_and_status", ["farmId", "status"])
    .index("by_status_and_submittedAt", ["status", "submittedAt"])
    .index("by_status_and_harvestedOn", ["status", "harvestedOn"])
    .index("by_categoryId_and_status", ["categoryId", "status"]),

  // A-86. Featured banners on Home ("Harvest of the week"). Each points at a
  // listing; its price, unit, farm and photo are read from that listing.
  homeBanners: defineTable({
    tag: v.string(),
    title: v.string(),
    buttonLabel: v.string(),
    listingId: v.id("listings"),
    active: v.boolean(),
    sortOrder: v.number(),
  }).index("by_active_and_sortOrder", ["active", "sortOrder"]),

  // A-42 price and unit history, and the listing's moderation trail.
  listingEvents: defineTable({
    listingId: v.id("listings"),
    actorId: v.id("users"),
    kind: v.string(),
    details: v.optional(v.string()),
  }).index("by_listingId", ["listingId"]),

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

  // ---------------------------------------------------------------------------
  // Ordering, escrow and payments

  // M-41 / W-24: one payment for a cart, split into one order per farm.
  checkouts: defineTable({
    userId: v.id("users"),
    // "CK-10001"
    reference: v.string(),
    status: v.union(v.literal("awaiting_payment"), v.literal("paid"), v.literal("abandoned")),
    fulfilment,
    address: v.optional(orderAddress),
    pickupPointId: v.optional(v.id("pickupPoints")),
    window: v.optional(deliveryWindow),
    contact: orderContact,
    itemsTotalKobo: v.number(),
    deliveryFeeKobo: v.number(),
    totalKobo: v.number(),
    paidAt: v.optional(v.number()),
    paymentProvider: v.optional(v.union(v.literal("paystack"), v.literal("simulated"))),
    // The successful payment's reference (refunds go against it)
    paymentReference: v.optional(v.string()),
    abandonedAt: v.optional(v.number()),
    // Checkout this one replaced when the shopper went back and changed it
    replaces: v.optional(v.id("checkouts")),
  })
    .index("by_userId", ["userId"])
    .index("by_reference", ["reference"])
    .index("by_status", ["status"]),

  // One order per farm. Status drives the screens; escrow says where the money is.
  orders: defineTable({
    checkoutId: v.id("checkouts"),
    userId: v.id("users"),
    farmId: v.id("farms"),
    // "FK-10001"
    number: v.string(),
    status: orderStatus,
    escrow: escrowState,
    // A-62: staff froze the money; nothing releases until lifted
    escrowHold: v.optional(v.boolean()),
    holdReason: v.optional(v.string()),
    fulfilment,
    items: v.array(orderItem),
    itemsTotalKobo: v.number(),
    deliveryFeeKobo: v.number(),
    totalKobo: v.number(),
    address: v.optional(orderAddress),
    pickupPointId: v.optional(v.id("pickupPoints")),
    // Shown at the pickup point (M-64)
    pickupCode: v.optional(v.string()),
    window: v.optional(deliveryWindow),
    contact: orderContact,
    // Timeline
    paidAt: v.optional(v.number()),
    // Farm must accept by this time (24h after payment)
    respondBy: v.optional(v.number()),
    respondReminderAt: v.optional(v.number()),
    expiryJobId: v.optional(v.id("_scheduled_functions")),
    acceptedAt: v.optional(v.number()),
    preparingAt: v.optional(v.number()),
    packedAt: v.optional(v.number()),
    readyAt: v.optional(v.number()),
    handedOverAt: v.optional(v.number()),
    arrivedAt: v.optional(v.number()),
    // Pickup orders: last day to collect (3 days at the point)
    collectBy: v.optional(v.number()),
    pickupOverdueAt: v.optional(v.number()),
    deliveredAt: v.optional(v.number()),
    // A-61: still unconfirmed a day after delivery; staff follow up
    unconfirmedFlaggedAt: v.optional(v.number()),
    confirmedAt: v.optional(v.number()),
    releasedAt: v.optional(v.number()),
    endedAt: v.optional(v.number()),
    declineReason: v.optional(
      v.union(v.literal("out_of_stock"), v.literal("cannot_deliver_in_time"), v.literal("other")),
    ),
    declineNote: v.optional(v.string()),
    cancelReason: v.optional(v.string()),
    // Dispatch (Phase 3b)
    riderId: v.optional(v.id("riders")),
    riderCollectAt: v.optional(v.number()),
    disputeId: v.optional(v.id("disputes")),
    reviewedAt: v.optional(v.number()),
    // Set when a guest's orders were linked to an account (W-44)
    claimedFrom: v.optional(v.id("users")),
  })
    .index("by_checkoutId", ["checkoutId"])
    .index("by_userId", ["userId"])
    .index("by_farmId_and_status", ["farmId", "status"])
    .index("by_number", ["number"])
    .index("by_status_and_respondBy", ["status", "respondBy"])
    .index("by_status_and_deliveredAt", ["status", "deliveredAt"])
    .index("by_status_and_collectBy", ["status", "collectBy"])
    .index("by_escrow", ["escrow"]),

  // A-51 timeline: every status change, with who did it.
  orderEvents: defineTable({
    orderId: v.id("orders"),
    kind: v.string(),
    actorKind,
    actorId: v.optional(v.id("users")),
    note: v.optional(v.string()),
  }).index("by_orderId", ["orderId"]),

  // A-55 Farmkeke riders (managed in Phase 3b).
  riders: defineTable({
    name: v.string(),
    phone: v.string(),
    serviceAreaIds: v.array(v.id("serviceAreas")),
    active: v.boolean(),
  }).index("by_active", ["active"]),

  // A-60 escrow ledger: one row per money movement on an order.
  ledgerEntries: defineTable({
    orderId: v.id("orders"),
    checkoutId: v.id("checkouts"),
    farmId: v.id("farms"),
    kind: v.union(
      // Paid money held by Farmkeke
      v.literal("hold"),
      // Farm's share released (product total minus commission)
      v.literal("release"),
      v.literal("commission"),
      // Delivery fee kept by Farmkeke for the rider
      v.literal("delivery_fee"),
      v.literal("refund"),
      v.literal("payout"),
    ),
    amountKobo: v.number(),
    status: v.union(v.literal("pending"), v.literal("done"), v.literal("failed")),
    note: v.optional(v.string()),
    refundId: v.optional(v.id("refunds")),
    payoutId: v.optional(v.id("payouts")),
    // Test mode: no real money moved
    simulated: v.optional(v.boolean()),
    actorId: v.optional(v.id("users")),
  })
    .index("by_orderId", ["orderId"])
    .index("by_farmId", ["farmId"])
    .index("by_refundId", ["refundId"])
    .index("by_payoutId", ["payoutId"]),

  // A-84 / A-85: one row (key "platform") with fees and escrow timers.
  platformSettings: defineTable({
    key: v.literal("platform"),
    // Farmer commission in basis points (500 = 5%). Unset or null = default 5%.
    commissionBps: v.optional(v.union(v.number(), v.null())),
    commissionEffectiveAt: v.optional(v.number()),
    farmerResponseHours: v.optional(v.number()),
    unconfirmedAfterHours: v.optional(v.number()),
    pickupHoldDays: v.optional(v.number()),
    disputeReplyHours: v.optional(v.number()),
    updatedBy: v.optional(v.id("users")),
  }).index("by_key", ["key"]),

  // Each try at paying a checkout (Paystack transaction or the test step).
  paymentAttempts: defineTable({
    checkoutId: v.id("checkouts"),
    userId: v.id("users"),
    reference: v.string(),
    provider: v.union(v.literal("paystack"), v.literal("simulated")),
    method: v.optional(paymentMethod),
    channel: v.optional(v.string()),
    status: v.union(
      v.literal("started"),
      v.literal("opened"),
      v.literal("success"),
      v.literal("failed"),
      v.literal("abandoned"),
      // Paid, but the checkout was already paid or gone, or the amount was wrong (A-65)
      v.literal("mismatch"),
    ),
    amountKobo: v.number(),
    currency: v.string(),
    email: v.optional(v.string()),
    saveCard: v.optional(v.boolean()),
    savedCardId: v.optional(v.id("savedCards")),
    accessCode: v.optional(v.string()),
    authorizationUrl: v.optional(v.string()),
    paidAmountKobo: v.optional(v.number()),
    paidAt: v.optional(v.number()),
    cardBrand: v.optional(v.string()),
    cardLast4: v.optional(v.string()),
    failureReason: v.optional(v.string()),
    // A-65 decision on a mismatch
    resolution: v.optional(v.union(v.literal("refund"), v.literal("dismiss"))),
    resolvedAt: v.optional(v.number()),
  })
    .index("by_reference", ["reference"])
    .index("by_checkoutId", ["checkoutId"])
    .index("by_status", ["status"]),

  // Fixed-window counters for payment and bank lookups, per user.
  paymentRateLimits: defineTable({
    key: v.string(),
    windowStart: v.number(),
    count: v.number(),
  }).index("by_key", ["key"]),

  // Paystack events we couldn't match to an attempt (A-65).
  unmatchedPaymentEvents: defineTable({
    event: v.string(),
    reference: v.string(),
    amountKobo: v.optional(v.number()),
    status: v.optional(v.string()),
    payload: v.optional(v.string()),
    resolvedAt: v.optional(v.number()),
    resolvedBy: v.optional(v.id("users")),
    resolveReason: v.optional(v.string()),
  })
    .index("by_reference", ["reference"])
    .index("by_resolvedAt", ["resolvedAt"]),

  // M-43 saved cards (Paystack reusable authorizations).
  savedCards: defineTable({
    userId: v.id("users"),
    authorizationCode: v.string(),
    email: v.string(),
    brand: v.string(),
    last4: v.string(),
    expMonth: v.string(),
    expYear: v.string(),
    bank: v.optional(v.string()),
    signature: v.optional(v.string()),
  })
    .index("by_userId", ["userId"])
    .index("by_userId_and_signature", ["userId", "signature"]),

  // M-72 / A-63: money going back to the consumer's original payment method.
  refunds: defineTable({
    orderId: v.id("orders"),
    checkoutId: v.id("checkouts"),
    userId: v.id("users"),
    farmId: v.id("farms"),
    amountKobo: v.number(),
    kind: v.union(v.literal("full"), v.literal("part")),
    reason: v.string(),
    status: refundStatus,
    provider: v.union(v.literal("paystack"), v.literal("simulated")),
    // The payment's reference
    transactionReference: v.string(),
    providerRefundId: v.optional(v.string()),
    providerStatus: v.optional(v.string()),
    expectedAt: v.optional(v.number()),
    sendStartedAt: v.optional(v.number()),
    sentAt: v.optional(v.number()),
    settledAt: v.optional(v.number()),
    failureReason: v.optional(v.string()),
    attempts: v.number(),
    disputeId: v.optional(v.id("disputes")),
    actorId: v.optional(v.id("users")),
  })
    .index("by_orderId", ["orderId"])
    .index("by_status", ["status"])
    .index("by_transactionReference", ["transactionReference"]),

  // F-63 / A-64: Paystack transfers of released money to a farm's bank.
  payouts: defineTable({
    farmId: v.id("farms"),
    amountKobo: v.number(),
    status: payoutStatus,
    // Changes on each retry (Paystack references are single-use)
    reference: v.string(),
    provider: v.union(v.literal("paystack"), v.literal("simulated")),
    // True while a send is in flight, so two sends never overlap
    sending: v.optional(v.boolean()),
    transferCode: v.optional(v.string()),
    recipientCode: v.optional(v.string()),
    bankName: v.string(),
    accountLast4: v.string(),
    failureReason: v.optional(v.string()),
    sendStartedAt: v.optional(v.number()),
    sentAt: v.optional(v.number()),
    attempts: v.number(),
  })
    .index("by_farmId", ["farmId"])
    .index("by_status", ["status"])
    .index("by_reference", ["reference"]),

  // The orders a payout pays for.
  payoutItems: defineTable({
    payoutId: v.id("payouts"),
    orderId: v.id("orders"),
    farmId: v.id("farms"),
    itemsTotalKobo: v.number(),
    commissionKobo: v.number(),
    amountKobo: v.number(),
  })
    .index("by_payoutId", ["payoutId"])
    .index("by_orderId", ["orderId"]),

  // Paystack transfer recipients, one per farm bank account.
  payoutRecipients: defineTable({
    farmId: v.id("farms"),
    bankCode: v.string(),
    accountNumber: v.string(),
    recipientCode: v.string(),
  }).index("by_farmId", ["farmId"]),

  // ---------------------------------------------------------------------------
  // Notifications (store in 3a; delivery, preferences and push in 3b)

  notifications: defineTable({
    userId: v.id("users"),
    side: notificationSide,
    kind: v.string(),
    title: v.string(),
    body: v.string(),
    // In-app route, e.g. "/order/<id>" or "/farm-order/<id>"
    href: v.string(),
    orderId: v.optional(v.id("orders")),
    readAt: v.optional(v.number()),
  })
    .index("by_userId_and_side", ["userId", "side"])
    .index("by_userId_and_side_and_readAt", ["userId", "side", "readAt"]),

  notificationPrefs: defineTable({
    userId: v.id("users"),
    side: notificationSide,
    alert: v.string(),
    channel: v.optional(v.union(v.literal("push"), v.literal("sms"), v.literal("email"))),
    on: v.boolean(),
  }).index("by_userId_and_side", ["userId", "side"]),

  pushTokens: defineTable({
    userId: v.id("users"),
    token: v.string(),
    platform: v.union(v.literal("ios"), v.literal("android")),
  })
    .index("by_token", ["token"])
    .index("by_userId", ["userId"]),

  smsLog: defineTable({
    to: v.string(),
    body: v.string(),
    status: v.union(v.literal("recorded"), v.literal("sent"), v.literal("failed")),
    userId: v.optional(v.id("users")),
    notificationId: v.optional(v.id("notifications")),
    provider: v.optional(v.string()),
    providerReference: v.optional(v.string()),
    error: v.optional(v.string()),
  }).index("by_userId", ["userId"]),

  // ---------------------------------------------------------------------------
  // Disputes, chat, reviews, favourites and support (functions in Phase 3b)

  disputes: defineTable({
    orderId: v.id("orders"),
    userId: v.id("users"),
    farmId: v.id("farms"),
    number: v.string(),
    reason: v.union(v.literal("missing"), v.literal("damaged"), v.literal("wrong_item"), v.literal("not_received")),
    itemIndexes: v.array(v.number()),
    note: v.string(),
    photoIds: v.array(v.id("_storage")),
    amountKobo: v.number(),
    status: disputeStatus,
    // Farm replies within 12h; Farmkeke decides within about a day
    farmReplyBy: v.number(),
    decideBy: v.number(),
    farmRespondedAt: v.optional(v.number()),
    farmResponseNote: v.optional(v.string()),
    farmResponsePhotoIds: v.optional(v.array(v.id("_storage"))),
    outcome: v.optional(v.union(v.literal("released"), v.literal("refunded"), v.literal("split"))),
    refundKobo: v.optional(v.number()),
    releaseKobo: v.optional(v.number()),
    decisionNote: v.optional(v.string()),
    decidedAt: v.optional(v.number()),
    decidedBy: v.optional(v.id("users")),
    assigneeId: v.optional(v.id("users")),
    consumerReadAt: v.optional(v.number()),
    farmerReadAt: v.optional(v.number()),
    staffReadAt: v.optional(v.number()),
  })
    .index("by_orderId", ["orderId"])
    .index("by_userId", ["userId"])
    .index("by_farmId", ["farmId"])
    .index("by_status", ["status"]),

  disputeMessages: defineTable({
    disputeId: v.id("disputes"),
    authorId: v.optional(v.id("users")),
    as: v.union(v.literal("consumer"), v.literal("farmer"), v.literal("staff")),
    // Staff messages go to one side
    audience: v.optional(v.union(v.literal("consumer"), v.literal("farmer"))),
    body: v.string(),
    photoIds: v.array(v.id("_storage")),
  }).index("by_disputeId", ["disputeId"]),

  disputeNotes: defineTable({
    disputeId: v.id("disputes"),
    authorId: v.id("users"),
    body: v.string(),
  }).index("by_disputeId", ["disputeId"]),

  // M-74 order chat: one conversation per order.
  conversations: defineTable({
    orderId: v.id("orders"),
    userId: v.id("users"),
    farmId: v.id("farms"),
    lastMessageAt: v.number(),
    lastMessagePreview: v.optional(v.string()),
    consumerUnread: v.number(),
    farmerUnread: v.number(),
    nudgedConsumerAt: v.optional(v.number()),
    nudgedFarmerAt: v.optional(v.number()),
  })
    .index("by_orderId", ["orderId"])
    .index("by_userId_and_lastMessageAt", ["userId", "lastMessageAt"])
    .index("by_farmId_and_lastMessageAt", ["farmId", "lastMessageAt"]),

  messages: defineTable({
    conversationId: v.id("conversations"),
    orderId: v.id("orders"),
    senderId: v.optional(v.id("users")),
    side: v.union(v.literal("shop"), v.literal("farm"), v.literal("staff")),
    body: v.string(),
    photoIds: v.array(v.id("_storage")),
  }).index("by_conversationId", ["conversationId"]),

  messageThrottles: defineTable({
    userId: v.id("users"),
    windowStart: v.number(),
    count: v.number(),
  }).index("by_userId", ["userId"]),

  reviews: defineTable({
    orderId: v.id("orders"),
    userId: v.id("users"),
    farmId: v.id("farms"),
    rating: v.number(),
    tags: v.array(v.string()),
    comment: v.optional(v.string()),
    reviewerName: v.optional(v.string()),
    hidden: v.optional(v.boolean()),
  })
    .index("by_orderId", ["orderId"])
    .index("by_farmId", ["farmId"])
    .index("by_farmId_and_rating", ["farmId", "rating"]),

  // Running totals per farm, updated with every review.
  reviewStats: defineTable({
    farmId: v.id("farms"),
    count: v.number(),
    totalStars: v.number(),
    // Count of 1★ … 5★ reviews
    byStars: v.array(v.number()),
  }).index("by_farmId", ["farmId"]),

  favorites: defineTable({
    userId: v.id("users"),
    listingId: v.id("listings"),
  })
    .index("by_userId", ["userId"])
    .index("by_userId_and_listingId", ["userId", "listingId"]),

  supportTickets: defineTable({
    userId: v.id("users"),
    side: notificationSide,
    orderId: v.optional(v.id("orders")),
    number: v.optional(v.string()),
    status: v.union(v.literal("open"), v.literal("resolved")),
    lastMessageAt: v.number(),
    assigneeId: v.optional(v.id("users")),
    userReadAt: v.optional(v.number()),
    staffReadAt: v.optional(v.number()),
    resolvedAt: v.optional(v.number()),
  })
    .index("by_userId_and_side", ["userId", "side"])
    .index("by_status_and_lastMessageAt", ["status", "lastMessageAt"]),

  supportMessages: defineTable({
    ticketId: v.id("supportTickets"),
    authorId: v.optional(v.id("users")),
    from: v.union(v.literal("user"), v.literal("staff")),
    body: v.string(),
    photoIds: v.array(v.id("_storage")),
  }).index("by_ticketId", ["ticketId"]),
});
