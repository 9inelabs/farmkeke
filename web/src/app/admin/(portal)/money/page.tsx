import type { Metadata } from "next";
import { MoneyView } from "./MoneyView";

export const metadata: Metadata = { title: "Release queue" };
// Behind the staff gate, which only renders on the client (see the layout).
export const instant = false;

// A-61 Release queue, A-62 Manual release or hold.
export default function AdminMoneyPage() {
  return <MoneyView />;
}
