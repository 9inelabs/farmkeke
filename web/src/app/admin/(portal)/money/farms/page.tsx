import type { Metadata } from "next";
import { FarmAccountsView } from "./FarmAccountsView";

export const metadata: Metadata = { title: "Farm accounts" };
// Behind the staff gate, which only renders on the client (see the layout).
export const instant = false;

// A-60 What farms owe for refunds, and whether Paystack can pay them.
export default function AdminFarmAccountsPage() {
  return <FarmAccountsView />;
}
