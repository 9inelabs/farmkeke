import type { Metadata } from "next";
import { FocusSkeleton } from "@/components/orders/FocusBits";
import { OrderIdPage, type OrderParams } from "@/components/orders/OrderIdPage";
import { ChatView } from "./ChatView";

export const metadata: Metadata = { title: "Message the farmer", robots: { index: false } };

// W-58 Order chat
export default function ChatPage({ params }: OrderParams) {
  return <OrderIdPage params={params} fallback={<FocusSkeleton orderId="" />} render={(id) => <ChatView orderId={id} />} />;
}
