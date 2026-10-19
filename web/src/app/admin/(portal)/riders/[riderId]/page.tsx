import type { Metadata } from "next";
import { ParamPage } from "@/components/admin/ParamPage";
import { TableSkeleton } from "@/components/admin/ui";
import { RiderView } from "./RiderView";

export const metadata: Metadata = { title: "Rider" };
// Behind the staff gate, which only renders on the client (see the layout).
export const instant = false;

// A-55 Rider profile and review.
export default function AdminRiderPage({ params }: { params: Promise<{ riderId: string }> }) {
  return <ParamPage params={params} name="riderId" fallback={<TableSkeleton />} render={(id) => <RiderView riderId={id} />} />;
}
