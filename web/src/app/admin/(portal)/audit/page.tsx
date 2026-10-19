import type { Metadata } from "next";
import { AuditView } from "./AuditView";

export const metadata: Metadata = { title: "Audit log" };
// Behind the staff gate, which only renders on the client (see the layout).
export const instant = false;

// A-90 Every sensitive staff action, newest first.
export default function AdminAuditPage() {
  return <AuditView />;
}
