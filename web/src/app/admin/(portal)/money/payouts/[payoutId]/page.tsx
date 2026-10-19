import type { Metadata } from "next";
import { ParamPage } from "@/components/admin/ParamPage";
import { TableSkeleton } from "@/components/admin/ui";
import { PayoutView } from "./PayoutView";

export const metadata: Metadata = { title: "Payout" };
// Behind the staff gate, which only renders on the client (see the layout).
export const instant = false;

// A-64 Payout detail and retry.
export default function AdminPayoutPage({ params }: { params: Promise<{ payoutId: string }> }) {
  return <ParamPage params={params} name="payoutId" fallback={<TableSkeleton />} render={(id) => <PayoutView payoutId={id} />} />;
}
