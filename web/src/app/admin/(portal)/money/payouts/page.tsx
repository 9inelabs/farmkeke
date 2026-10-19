import type { Metadata } from "next";
import { PayoutsView } from "./PayoutsView";

export const metadata: Metadata = { title: "Payouts to farms" };
// Behind the staff gate, which only renders on the client (see the layout).
export const instant = false;

// A-64 Payouts.
export default function AdminPayoutsPage() {
  return <PayoutsView />;
}
