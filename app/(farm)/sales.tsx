// F-40 Orders. The layout is OrdersView; this route gives it live data.
import { api } from "@convex/_generated/api";
import { useQuery } from "convex/react";
import { useState } from "react";
import { OrdersView } from "@/features/farm/OrdersView";
import type { FarmTab } from "@/features/farm/status";
import { useNow } from "@/lib/useNow";

export default function FarmOrders() {
  const [tab, setTab] = useState<FarmTab>("new");
  const counts = useQuery(api.orders.farmer.counts);
  const orders = useQuery(api.orders.farmer.list, { tab });
  const unreadChats = useQuery(api.chat.unread, { side: "farm" }) ?? 0;
  const now = useNow();
  return <OrdersView tab={tab} onTab={setTab} counts={counts} orders={orders} unreadChats={unreadChats} now={now} />;
}
