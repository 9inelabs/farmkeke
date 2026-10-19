import type { Metadata } from "next";
import { ParamPage } from "@/components/admin/ParamPage";
import { TableSkeleton } from "@/components/admin/ui";
import { CustomerView } from "./CustomerView";

export const metadata: Metadata = { title: "Customer" };
// Behind the staff gate, which only renders on the client (see the layout).
export const instant = false;

// A-36 Customer detail, A-37 Block or unblock.
export default function AdminCustomerPage({ params }: { params: Promise<{ userId: string }> }) {
  return <ParamPage params={params} name="userId" fallback={<TableSkeleton />} render={(id) => <CustomerView userId={id} />} />;
}
