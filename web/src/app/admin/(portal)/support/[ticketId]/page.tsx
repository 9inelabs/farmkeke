import type { Metadata } from "next";
import { ParamPage } from "@/components/admin/ParamPage";
import { TableSkeleton } from "@/components/admin/ui";
import { TicketView } from "./TicketView";

export const metadata: Metadata = { title: "Support message" };
// Behind the staff gate, which only renders on the client (see the layout).
export const instant = false;

// A-76 Ticket detail.
export default function AdminTicketPage({ params }: { params: Promise<{ ticketId: string }> }) {
  return <ParamPage params={params} name="ticketId" fallback={<TableSkeleton />} render={(id) => <TicketView ticketId={id} />} />;
}
