import type { Metadata } from "next";
import { DisputesView } from "./DisputesView";

export const metadata: Metadata = { title: "Problem reports" };
// Behind the staff gate, which only renders on the client (see the layout).
export const instant = false;

// A-70 Disputes.
export default function AdminDisputesPage() {
  return <DisputesView />;
}
