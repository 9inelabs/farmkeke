import type { Metadata } from "next";
import { ParamPage } from "@/components/admin/ParamPage";
import { TableSkeleton } from "@/components/admin/ui";
import { ChatView } from "./ChatView";

export const metadata: Metadata = { title: "Order chat" };
// Behind the staff gate, which only renders on the client (see the layout).
export const instant = false;

// A-51 order chat: read-only.
export default function AdminOrderChatPage({ params }: { params: Promise<{ orderId: string }> }) {
  return <ParamPage params={params} name="orderId" fallback={<TableSkeleton />} render={(id) => <ChatView orderId={id} />} />;
}
