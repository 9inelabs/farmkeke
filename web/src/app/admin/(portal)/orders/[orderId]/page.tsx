import type { Metadata } from "next";
import { ParamPage } from "@/components/admin/ParamPage";
import { TableSkeleton } from "@/components/admin/ui";
import { OrderView } from "./OrderView";

export const metadata: Metadata = { title: "Order" };
// Behind the staff gate, which only renders on the client (see the layout).
export const instant = false;

// A-51 Order detail, A-52 Intervene.
export default function AdminOrderPage({ params }: { params: Promise<{ orderId: string }> }) {
  return <ParamPage params={params} name="orderId" fallback={<TableSkeleton />} render={(id) => <OrderView orderId={id} />} />;
}
