import type { Metadata } from "next";
import { PaymentsView } from "./PaymentsView";

export const metadata: Metadata = { title: "Payments" };
// Behind the staff gate, which only renders on the client (see the layout).
export const instant = false;

// A-60 Payments and how Paystack split each one.
export default function AdminPaymentsPage() {
  return <PaymentsView />;
}
