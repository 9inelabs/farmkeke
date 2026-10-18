import type { Metadata } from "next";
import { OrderIdPage, type OrderParams } from "@/components/orders/OrderIdPage";
import { OrderSkeleton } from "../OrderView";
import { ProblemView } from "./ProblemView";

export const metadata: Metadata = { title: "Report a problem", robots: { index: false } };

// W-53 Report a problem
export default function ReportProblemPage({ params }: OrderParams) {
  return <OrderIdPage params={params} fallback={<OrderSkeleton />} render={(id) => <ProblemView orderId={id} />} />;
}
