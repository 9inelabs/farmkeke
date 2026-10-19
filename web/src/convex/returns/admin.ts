// Return shapes of the Admin Portal's access and staff functions
// (convex/admin/access.ts, convex/admin/staff.ts).
import type { Id } from "../api";

export type MemberStatus = "email_unconfirmed" | "pending" | "more_info" | "approved" | "rejected" | "deactivated";

export type AdminMe =
  | { state: "signed_out" }
  | { state: "not_staff"; email: string | null; name: string | null }
  | { state: "deactivated"; email: string; name: string; note: string | null }
  | {
      state: "application";
      email: string;
      name: string;
      status: Exclude<MemberStatus, "approved" | "deactivated">;
      jobTitle: string;
      phone: string | null;
      applicationNote: string | null;
      appliedAt: number;
      note: string | null;
    }
  | { state: "verify"; email: string; name: string }
  | {
      state: "staff";
      email: string;
      name: string;
      userId: Id<"users">;
      memberId: Id<"staffMembers">;
      role: { id: Id<"staffRoles">; key: string; name: string };
      permissions: string[];
      isFounder: boolean;
      sessionEndsAt: number | null;
    };

export type StaffMe = Extract<AdminMe, { state: "staff" }>;

export type PermissionInfo = { key: string; group: string; label: string; description: string };

export type MemberRow = {
  _id: Id<"staffMembers">;
  userId: Id<"users">;
  name: string;
  email: string;
  phone: string | null;
  jobTitle: string;
  note: string | null;
  status: MemberStatus;
  role: { id: Id<"staffRoles">; key: string; name: string } | null;
  appliedAt: number;
  emailConfirmedAt: number | null;
  decidedAt: number | null;
  decidedBy: string | null;
  decisionNote: string | null;
  lastSignInAt: number | null;
  invitePending: boolean;
};

export type MemberDetail = MemberRow & {
  history: { _id: string; at: number; action: string; reason: string; by: string }[];
};

export type RoleRow = {
  _id: Id<"staffRoles">;
  key: string;
  name: string;
  description: string;
  permissions: string[];
  builtIn: boolean;
  editable: boolean;
  members: number;
};

export type AuditRow = {
  _id: string;
  at: number;
  actorId: Id<"users">;
  actor: string;
  action: string;
  targetTable: string;
  targetId: string;
  reason: string;
  details: string | null;
};

export type StaffAlert = {
  _id: Id<"notifications">;
  _creationTime: number;
  kind: string;
  title: string;
  body: string;
  href: string;
  readAt?: number;
};
