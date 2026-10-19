import type { Metadata } from "next";
import { RefundsView } from "./RefundsView";

export const metadata: Metadata = { title: "Refunds" };
// Behind the staff gate, which only renders on the client (see the layout).
export const instant = false;

// A-63 Refunds.
export default function AdminRefundsPage() {
  return <RefundsView />;
}
