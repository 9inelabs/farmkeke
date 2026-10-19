import type { Metadata } from "next";
import { ParamPage } from "@/components/admin/ParamPage";
import { TableSkeleton } from "@/components/admin/ui";
import { ApplicationView } from "./ApplicationView";

export const metadata: Metadata = { title: "Farmer application" };
// Behind the staff gate, which only renders on the client (see the layout).
export const instant = false;

// A-21 Request review, A-22 Documents, A-23 Approve, A-24 More info, A-25 Reject.
export default function AdminFarmerApplicationPage({ params }: { params: Promise<{ applicationId: string }> }) {
  return (
    <ParamPage params={params} name="applicationId" fallback={<TableSkeleton />} render={(id) => <ApplicationView applicationId={id} />} />
  );
}
