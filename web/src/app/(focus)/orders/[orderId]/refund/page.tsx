import type { Metadata } from "next";
import { FocusSkeleton } from "@/components/orders/FocusBits";
import { OrderIdPage, type OrderParams } from "@/components/orders/OrderIdPage";
import { RefundView } from "./RefundView";

export const metadata: Metadata = { title: "Refund status", robots: { index: false } };

// W-56 Refund status
export default function RefundPage({ params }: OrderParams) {
  return <OrderIdPage params={params} fallback={<FocusSkeleton orderId="" />} render={(id) => <RefundView orderId={id} />} />;
}
