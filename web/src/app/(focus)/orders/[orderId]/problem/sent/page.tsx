import type { Metadata } from "next";
import { FocusSkeleton } from "@/components/orders/FocusBits";
import { OrderIdPage, type OrderParams } from "@/components/orders/OrderIdPage";
import { ProblemSentView } from "./ProblemSentView";

export const metadata: Metadata = { title: "We've got your report", robots: { index: false } };

// W-53b Problem reported
export default function ProblemSentPage({ params }: OrderParams) {
  return <OrderIdPage params={params} fallback={<FocusSkeleton orderId="" />} render={(id) => <ProblemSentView orderId={id} />} />;
}
