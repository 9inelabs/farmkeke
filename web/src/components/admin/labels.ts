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
};
