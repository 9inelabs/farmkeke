import type { Metadata } from "next";
import { ParamPage } from "@/components/admin/ParamPage";
import { TableSkeleton } from "@/components/admin/ui";
import { MemberView } from "./MemberView";

export const metadata: Metadata = { title: "Staff member" };
// Behind the staff gate, which only renders on the client (see the layout).
export const instant = false;

export default function AdminMemberPage({ params }: { params: Promise<{ memberId: string }> }) {
  return <ParamPage params={params} name="memberId" fallback={<TableSkeleton />} render={(id) => <MemberView memberId={id} />} />;
}
