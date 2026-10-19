import type { Metadata } from "next";
import { StaffView } from "./StaffView";

export const metadata: Metadata = { title: "Staff and applications" };
// Behind the staff gate, which only renders on the client (see the layout).
export const instant = false;

// A-89 Staff: applications to review, the team, and people whose access ended.
export default function AdminStaffPage() {
  return <StaffView />;
}
