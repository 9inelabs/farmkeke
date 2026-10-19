import type { Metadata } from "next";
import { AlertsView } from "./AlertsView";

export const metadata: Metadata = { title: "Alerts" };
// Behind the staff gate, which only renders on the client (see the layout).
export const instant = false;

// A-12 Staff alerts: problem reports, overdue farm replies, staff applications.
export default function AdminAlertsPage() {
  return <AlertsView />;
}
