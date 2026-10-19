"use client";

// A-51 Order chat, read-only: the messages between the shopper and the
// farm. Staff talk to either side through a problem report or support.
import { usePaginatedQuery, useQuery } from "convex/react";
import { adminRoutes } from "@/components/admin/routes";
import { Thread } from "@/components/admin/Thread";
import { Notice, PageHeader, Panel, TableSkeleton } from "@/components/admin/ui";
import { Button } from "@/components/ui/Button";
import { admin } from "@/convex/admin";
import type { Id } from "@/convex/api";
import type { ChatInfo, ChatMessage } from "@/convex/returns/adminCare";
import { displayPhone } from "@/lib/format";

export function ChatView({ orderId }: { orderId: string }) {
  const id = orderId as Id<"orders">;
  const info = useQuery(admin.chat.get, { orderId: id }) as ChatInfo | null | undefined;
  const { results, status, loadMore } = usePaginatedQuery(admin.chat.messages, { orderId: id }, { initialNumItems: 50 });
  if (info === undefined) return <TableSkeleton />;
  if (info === null) {
    return (
      <>
        <PageHeader title="Not found" back={{ href: adminRoutes.orders, label: "Orders" }} />
        <Notice tone="err">This order no longer exists.</Notice>
      </>
    );
  }
  const shopperFirst = info.shopper.name.split(/\s+/)[0];
  const messages = [...(results as ChatMessage[])].reverse().map((m) => ({
    _id: m._id,
    who: m.side === "shop" ? info.shopper.name : (info.farm?.name ?? "Farm"),
    staff: m.side === "farm",
    body: m.body,
    photos: m.photos,
    at: m.at,
    tag: m.side === "shop" ? "Shopper" : "Farm",
  }));
  return (
    <>
      <PageHeader
        title={`Chat on order ${info.number}`}
        description={`${info.shopper.name} (${displayPhone(info.shopper.phone)}) and ${info.farm?.name ?? "the farm"}${info.farm ? ` (${displayPhone(info.farm.phone)})` : ""}. Read only.`}
        back={{ href: adminRoutes.order(info.orderId), label: `Order ${info.number}` }}
      />
      <Panel>
        {status === "CanLoadMore" ? (
          <div className="mb-3">
            <Button size="sm" variant="ghost" onClick={() => loadMore(50)}>
              Show older messages
            </Button>
          </div>
        ) : null}
        <Thread messages={messages} empty={info.conversationId ? "No messages yet." : `${shopperFirst} and the farm haven't messaged each other.`} />
      </Panel>
    </>
  );
}
