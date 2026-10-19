import type { Metadata } from "next";
import { OrdersView } from "./OrdersView";

export const metadata: Metadata = { title: "Orders" };
// Behind the staff gate, which only renders on the client (see the layout).
export const instant = false;

// A-50 All orders, with the "needs attention" view.
export default function AdminOrdersPage() {
  return <OrdersView />;
}
