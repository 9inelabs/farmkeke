import type { Metadata } from "next";
import { ReconciliationView } from "./ReconciliationView";

export const metadata: Metadata = { title: "Reconciliation" };
// Behind the staff gate, which only renders on the client (see the layout).
export const instant = false;

// A-65 Payment reconciliation.
export default function AdminReconciliationPage() {
  return <ReconciliationView />;
}
