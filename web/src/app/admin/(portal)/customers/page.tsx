import type { Metadata } from "next";
import { CustomersView } from "./CustomersView";

export const metadata: Metadata = { title: "Customers" };
// Behind the staff gate, which only renders on the client (see the layout).
export const instant = false;

// A-35 Customers, A-38 Account deletions.
export default function AdminCustomersPage() {
  return <CustomersView />;
}
