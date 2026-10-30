import type { Metadata } from "next";
import { MessagesView } from "./MessagesView";

export const metadata: Metadata = { title: "Messages" };
// Behind the staff gate, which only renders on the client (see the layout).
export const instant = false;

// Messages staff sent to shoppers and farmers (admin/messages.ts).
export default function AdminMessagesPage() {
  return <MessagesView />;
}
