import type { Metadata } from "next";
import { OrdersView } from "./OrdersView";

export const metadata: Metadata = { title: "My orders", robots: { index: false } };

// W-44 My orders and W-44b Orders empty
export default function OrdersPage() {
  return <OrdersView />;
}
