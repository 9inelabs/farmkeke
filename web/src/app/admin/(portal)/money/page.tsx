import type { Metadata } from "next";
import { MoneyView } from "./MoneyView";

export const metadata: Metadata = { title: "Money" };
// Behind the staff gate, which only renders on the client (see the layout).
export const instant = false;

// A-60 Money overview.
export default function AdminMoneyPage() {
  return <MoneyView />;
}
