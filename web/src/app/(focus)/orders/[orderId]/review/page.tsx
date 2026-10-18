import type { Metadata } from "next";
import { FocusSkeleton } from "@/components/orders/FocusBits";
import { OrderIdPage, type OrderParams } from "@/components/orders/OrderIdPage";
import { ReviewView } from "./ReviewView";

export const metadata: Metadata = { title: "Rate your order", robots: { index: false } };

// W-57 Rate and review (?rating=1–5 preselects the stars from W-52b)
export default function ReviewPage({ params }: OrderParams) {
  return <OrderIdPage params={params} fallback={<FocusSkeleton orderId="" width={640} />} render={(id) => <ReviewView orderId={id} />} />;
}
