import type { Metadata } from "next";
import { OrderIdPage, type OrderParams } from "@/components/orders/OrderIdPage";
import { OrderSkeleton } from "../OrderView";
import { DisputeView } from "./DisputeView";

export const metadata: Metadata = { title: "Your problem report", robots: { index: false } };

// W-54 Dispute detail
export default function DisputePage({ params }: OrderParams) {
  return <OrderIdPage params={params} fallback={<OrderSkeleton />} render={(id) => <DisputeView orderId={id} />} />;
}
