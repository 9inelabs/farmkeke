import type { Metadata } from "next";
import { ParamPage } from "@/components/admin/ParamPage";
import { TableSkeleton } from "@/components/admin/ui";
import { FarmView } from "./FarmView";

export const metadata: Metadata = { title: "Farm" };
// Behind the staff gate, which only renders on the client (see the layout).
export const instant = false;

// A-31 Farmer detail, A-32 Suspend or reactivate, A-33 Edit details.
export default function AdminFarmPage({ params }: { params: Promise<{ farmId: string }> }) {
  return <ParamPage params={params} name="farmId" fallback={<TableSkeleton />} render={(id) => <FarmView farmId={id} />} />;
}
