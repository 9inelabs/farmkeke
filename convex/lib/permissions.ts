// Admin Portal permissions (A-89). Every admin function checks one or more of
// these; a staff role is a named set of them. Plain data, shared with the
// portal through admin/access.permissionCatalog.

export const PERMISSIONS = [
  // Overview
  { key: "dashboard.view", group: "Overview", label: "See the dashboard", description: "Today's orders, sales and queues." },
  { key: "audit.view", group: "Overview", label: "See the audit log", description: "Every sensitive action staff have taken." },

  // Staff
  { key: "staff.view", group: "Staff", label: "See staff and applications", description: "Who works on the portal and their roles." },
  { key: "staff.manage", group: "Staff", label: "Approve staff and change roles", description: "Approve or reject applications, change roles, remove access." },
  { key: "roles.manage", group: "Staff", label: "Create and edit roles", description: "Decide what each role can do." },

  // People
  { key: "customers.view", group: "Customers", label: "See customers", description: "Shopper accounts, their orders and deletions." },
  { key: "customers.manage", group: "Customers", label: "Block and unblock customers", description: "Stop an account from signing in or ordering." },

  // Farmers and products
  { key: "farmers.view", group: "Farmers", label: "See farmers and applications", description: "Farm profiles, documents and requests." },
  { key: "farmers.approve", group: "Farmers", label: "Decide farmer applications", description: "Approve, reject or ask for more information." },
  { key: "farmers.manage", group: "Farmers", label: "Manage farms", description: "Suspend, mark trusted, edit details, review documents." },
  { key: "listings.view", group: "Products", label: "See products", description: "Every listing and the review queue." },
  { key: "listings.review", group: "Products", label: "Review products", description: "Approve, send back or unpublish listings." },
  { key: "catalog.manage", group: "Products", label: "Manage categories and units", description: "Create, rename, reorder and hide." },
  { key: "content.manage", group: "Products", label: "Manage home banners and site photos", description: "The featured banners on the app's Home, and the photos on the website's sign-in and sign-up pages." },

  // Operations
  { key: "areas.manage", group: "Operations", label: "Manage areas and pickup points", description: "Service areas, pickup points and their hours." },
  { key: "fees.manage", group: "Operations", label: "Set delivery fees and order rules", description: "Fees per area and platform time limits." },
  { key: "riders.view", group: "Operations", label: "See riders", description: "Rider profiles and documents." },
  { key: "riders.manage", group: "Operations", label: "Manage riders", description: "Add riders, review profiles, activate or suspend." },
  { key: "dispatch.manage", group: "Operations", label: "Dispatch riders", description: "Assign riders and record delivery steps." },
  { key: "orders.view", group: "Operations", label: "See orders", description: "Every order, its history and notes." },
  { key: "orders.manage", group: "Operations", label: "Change orders", description: "Cancel, extend deadlines, reassign riders." },

  // Care
  { key: "disputes.view", group: "Customer care", label: "See problem reports", description: "Disputes and their messages." },
  { key: "disputes.manage", group: "Customer care", label: "Handle problem reports", description: "Assign, add notes, message both sides. Gets problem alerts." },
  { key: "disputes.decide", group: "Customer care", label: "Decide problem reports", description: "Refund, partial refund or release to the farm." },
  { key: "support.view", group: "Customer care", label: "See the support inbox", description: "Messages from the contact form and the app." },
  { key: "support.manage", group: "Customer care", label: "Reply to support messages", description: "Reply, assign and resolve." },
  { key: "chat.view", group: "Customer care", label: "Read order chats", description: "Messages between shoppers and farms." },
  { key: "messages.send", group: "Customer care", label: "Send messages", description: "Notifications to every shopper, every farmer or one person, in the app and by push." },

  // Money
  { key: "money.view", group: "Money", label: "See money", description: "Escrow ledger, payouts, refunds and reconciliation." },
  { key: "money.manage", group: "Money", label: "Move money", description: "Release escrow, holds, retry payouts and refunds, fix mismatches." },
  { key: "commission.manage", group: "Money", label: "Set the commission", description: "Farmkeke's share of each order." },

  // Platform
  { key: "platform.manage", group: "Platform", label: "Maintenance and app status", description: "Turn maintenance on or off, app versions and store links." },
] as const;

export type Permission = (typeof PERMISSIONS)[number]["key"];

export const ALL_PERMISSIONS: Permission[] = PERMISSIONS.map((p) => p.key);

const KEYS = new Set<string>(ALL_PERMISSIONS);
export const isPermission = (key: string): key is Permission => KEYS.has(key);

const views = ALL_PERMISSIONS.filter((p) => p.endsWith(".view"));

/** The roles the portal starts with. The Founder role can't be edited. */
export const BUILT_IN_ROLES: { key: string; name: string; description: string; permissions: Permission[] }[] = [
  {
    key: "founder",
    name: "Founder",
    description: "Everything, including approving staff and deciding roles.",
    permissions: ALL_PERMISSIONS,
  },
  {
    key: "admin",
    name: "Admin",
    description: "Everything except approving staff and editing roles.",
    permissions: ALL_PERMISSIONS.filter((p) => p !== "staff.manage" && p !== "roles.manage"),
  },
  {
    key: "operations",
    name: "Operations",
    description: "Farmers, products, catalog, areas, fees, riders, dispatch and orders.",
    permissions: [
      "dashboard.view",
      "customers.view",
      "customers.manage",
      "farmers.view",
      "farmers.approve",
      "farmers.manage",
      "listings.view",
      "listings.review",
      "catalog.manage",
      "content.manage",
      "areas.manage",
      "fees.manage",
      "riders.view",
      "riders.manage",
      "dispatch.manage",
      "orders.view",
      "orders.manage",
      "disputes.view",
      "disputes.manage",
      "support.view",
      "support.manage",
      "chat.view",
      "messages.send",
      "money.view",
    ],
  },
  {
    key: "support",
    name: "Support",
    description: "Customers, the support inbox, problem reports and order chats.",
    permissions: [
      "dashboard.view",
      "customers.view",
      "customers.manage",
      "farmers.view",
      "listings.view",
      "riders.view",
      "orders.view",
      "disputes.view",
      "disputes.manage",
      "disputes.decide",
      "support.view",
      "support.manage",
      "chat.view",
      "messages.send",
      "money.view",
    ],
  },
  {
    key: "finance",
    name: "Finance",
    description: "Escrow, payouts, refunds, reconciliation and the commission.",
    permissions: [
      "dashboard.view",
      "farmers.view",
      "orders.view",
      "disputes.view",
      "disputes.decide",
      "money.view",
      "money.manage",
      "commission.manage",
    ],
  },
  {
    key: "catalog",
    name: "Catalog & Content",
    description: "Product review, categories, units and home banners.",
    permissions: ["dashboard.view", "farmers.view", "listings.view", "listings.review", "catalog.manage", "content.manage"],
  },
  {
    key: "dispatch",
    name: "Dispatch",
    description: "Riders, rider profiles and the dispatch board.",
    permissions: ["dashboard.view", "orders.view", "riders.view", "riders.manage", "dispatch.manage"],
  },
  {
    key: "viewer",
    name: "Viewer",
    description: "Can look at everything, but can't change anything.",
    permissions: views,
  },
];

/** Legacy users.staffRole values (before the portal) and the role each becomes. */
export const LEGACY_ROLE_MAP = {
  super_admin: "admin",
  operations: "operations",
  finance: "finance",
  support: "support",
} as const;
