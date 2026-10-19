// Plain-English names for audit log actions (convex writeAudit calls).
const ACTIONS: Record<string, string> = {
  "staff.createFounder": "Founder account created",
  "staff.approve": "Approved",
  "staff.reject": "Rejected",
  "staff.requestInfo": "Asked for more information",
  "staff.changeRole": "Role changed",
  "staff.deactivate": "Access removed",
  "staff.reactivate": "Access given back",
  "staff.bootstrap": "First admin created",
  "staff.setRole": "Role set",
  "staff.setRoleFromCli": "Role set from the CLI",
  "role.create": "Role created",
  "role.update": "Role edited",
  "role.delete": "Role deleted",
  "platform.setAppStatus": "App status changed",
  "farmerApplication.approve": "Farmer approved",
  "farmerApplication.requestMoreInfo": "Asked the farmer for more",
  "farmerApplication.reject": "Farmer application rejected",
  "farm.suspend": "Farm suspended",
  "farm.reactivate": "Farm reactivated",
  "farm.trust": "Marked trusted",
  "farm.untrust": "No longer trusted",
  "farm.updateDetails": "Farm details edited",
  "farmerDocument.approved": "Document approved",
  "farmerDocument.rejected": "New document photo asked for",
  "farmerDocument.expired": "Document marked expired",
  "listing.approved": "Product approved",
  "listing.sent_back": "Product sent back",
  "listing.unpublished": "Product taken down",
  "category.create": "Category created",
  "category.update": "Category edited",
  "category.subtypes": "Category types edited",
  "category.reorder": "Categories reordered",
  "unit.create": "Unit created",
  "unit.update": "Unit edited",
  "banner.create": "Banner created",
  "banner.update": "Banner edited",
  "banner.reorder": "Banners reordered",
  "banner.delete": "Banner deleted",
};

export const FARM_SIZE: Record<string, string> = {
  under_1: "Under 1 hectare",
  "1_to_5": "1 to 5 hectares",
  "5_to_20": "5 to 20 hectares",
  over_20: "Over 20 hectares",
};
export const FARM_TYPE: Record<string, string> = {
  crops: "Crops",
  livestock: "Livestock",
  poultry: "Poultry",
  fish: "Fish",
  mixed: "Mixed",
};
export const SEASON: Record<string, string> = { all_year: "All year", rainy: "Rainy season", dry: "Dry season" };
export const DOCUMENT_KIND: Record<string, string> = {
  government_id: "Government ID",
  farm_photo: "Farm photo",
  proof_of_address: "Proof of address",
  association_letter: "Association letter",
};
export const SECTION: Record<string, string> = {
  farm: "Farm details",
  produce: "What you grow",
  collection: "Collection details",
  documents: "Documents",
  payout: "Payout details",
};
export const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

/** [badge class, label] for each status shown in the portal. */
export const APPLICATION_STATUS: Record<string, [string, string]> = {
  draft: ["b-grey", "Draft"],
  submitted: ["b-pend", "Waiting for review"],
  more_info: ["b-pend", "More information asked"],
  approved: ["b-ok", "Approved"],
  rejected: ["b-err", "Rejected"],
};
export const LISTING_STATUS: Record<string, [string, string]> = {
  draft: ["b-grey", "Draft"],
  under_review: ["b-pend", "Waiting for review"],
  needs_changes: ["b-err", "Needs changes"],
  live: ["b-ok", "Live"],
  paused: ["b-grey", "Paused"],
};
export const DOCUMENT_STATUS: Record<string, [string, string]> = {
  pending: ["b-pend", "Not checked"],
  approved: ["b-ok", "Approved"],
  rejected: ["b-err", "New photo asked for"],
  expired: ["b-grey", "Expired"],
};

/** "staff.changeRole" → "Role changed"; unknown actions are spelled out. */
export function auditLabel(action: string): string {
  if (ACTIONS[action]) return ACTIONS[action];
  const [area, verb = ""] = action.split(".");
  const words = verb.replace(/([A-Z])/g, " $1").toLowerCase().trim();
  const what = area.replace(/([A-Z])/g, " $1").toLowerCase();
  return `${words.charAt(0).toUpperCase()}${words.slice(1)} (${what})`;
}

/** Human names for audit targets. */
export const TARGETS: Record<string, string> = {
  staffMembers: "Staff",
  staffRoles: "Role",
  users: "Account",
  farms: "Farm",
  farmerApplications: "Farmer application",
  listings: "Listing",
  categories: "Category",
  units: "Unit",
  serviceAreas: "Service area",
  pickupPoints: "Pickup point",
  orders: "Order",
  disputes: "Problem report",
  riders: "Rider",
  payouts: "Payout",
  refunds: "Refund",
  platformSettings: "Settings",
  appConfig: "App status",
  supportTickets: "Support message",
  farmerDocuments: "Farm document",
  homeBanners: "Home banner",
};
