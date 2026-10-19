import type { Metadata } from "next";
import { ParamPage } from "@/components/admin/ParamPage";
import { TableSkeleton } from "@/components/admin/ui";
import { DisputeView } from "./DisputeView";

export const metadata: Metadata = { title: "Problem report" };
// Behind the staff gate, which only renders on the client (see the layout).
export const instant = false;

// A-71 Dispute detail, A-72 Resolve.
export default function AdminDisputePage({ params }: { params: Promise<{ disputeId: string }> }) {
  return <ParamPage params={params} name="disputeId" fallback={<TableSkeleton />} render={(id) => <DisputeView disputeId={id} />} />;
}
