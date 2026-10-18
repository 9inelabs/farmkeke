import type { Metadata } from "next";
import { OrderIdPage, type OrderParams } from "@/components/orders/OrderIdPage";
import { FocusSkeleton } from "@/components/orders/FocusBits";
import { ReleasedView } from "./ReleasedView";

export const metadata: Metadata = { title: "Thanks for confirming", robots: { index: false } };

// W-52b Payment released
export default function ReleasedPage({ params }: OrderParams) {
  return <OrderIdPage params={params} fallback={<FocusSkeleton orderId="" />} render={(id) => <ReleasedView orderId={id} />} />;
}
