// M-74 Order chat: message the farmer about one order, with photos. The order
// sits at the top; the chat never closes (except on orders that never went
// ahead), and Farmkeke staff can read it for safety.
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { useMutation, usePaginatedQuery, useQuery } from "convex/react";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ShieldCheck } from "@/components/icons";
import { ScreenHeader, Skeleton, StatusScreen, Text, Button } from "@/components/ui";
import { ChatHeader, ChatOrderCard } from "@/features/chat/ChatHeader";
import { ChatThread } from "@/features/chat/ChatThread";
import { chatPalette } from "@/features/chat/palette";
import { badge } from "@/features/orders/status";
import { useOrder } from "@/features/orders/useOrder";
import { formatNaira } from "@/lib/money";
import { radii, spacing } from "@/theme/tokens";

export default function OrderChat() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const orderId = id as Id<"orders">;
  // Load through the order first: a bad link (not an order id) shows "couldn't open" instead of failing
  const access = useOrder(id);
  const known = access.state === "ok" && !access.order.viewOnly;
  const thread = useQuery(api.chat.thread, known ? { orderId, side: "shop" } : "skip");
  const { results, status, loadMore } = usePaginatedQuery(api.chat.messages, thread ? { orderId, side: "shop" } : "skip", { initialNumItems: 30 });
  const send = useMutation(api.chat.send);
  const markRead = useMutation(api.chat.markRead);
  const generateUploadUrl = useMutation(api.chat.generateUploadUrl);

  // Mark read on open and as new messages arrive
  const newest = results[0]?._id;
  useEffect(() => {
    if (thread && thread.unread > 0) void markRead({ orderId, side: "shop" }).catch(() => undefined);
  }, [thread, newest, markRead, orderId]);

  if (access.state === "loading" || (known && thread === undefined)) {
    return (
      <SafeAreaView style={styles.screen}>
        <ScreenHeader title="Message" />
        <View style={styles.pad}>
          <Skeleton height={72} radius={radii.lg} />
        </View>
      </SafeAreaView>
    );
  }
  if (!known || !thread) {
    return (
      <StatusScreen
        icon={ShieldCheck}
        tone="pending"
        header={<ScreenHeader title="Message" />}
        title="We couldn't open this chat"
        message="Only the phone or account that placed the order can message the farm about it."
        actions={<Button label="Back" variant="dark" size="large" pill fullWidth onPress={() => router.back()} />}
      />
    );
  }

  const b = badge(thread.order.status, thread.order.fulfilment);
  const farm = thread.counterpart.kind === "farm" ? thread.counterpart : null;
  const first = thread.order.firstItem;
  const more = thread.order.itemCount - 1;
  return (
    <View style={styles.screen}>
      <ChatHeader
        name={thread.counterpart.name}
        verified={farm?.verified ?? false}
        subtitle={[`Order ${thread.order.number}`, farm?.lga].filter(Boolean).join(" · ")}
        right={{
          kind: "farm",
          name: thread.counterpart.name,
          photoUrl: thread.counterpart.photoUrl,
          onPress: () => farm && router.push({ pathname: "/farm/[id]", params: { id: farm.farmId } }),
        }}
      />
      <ChatOrderCard
        imageUrl={thread.order.imageUrl}
        title={(first ? `${first.name} × ${first.quantity}` : thread.order.summary) + (more > 0 ? ` and ${more} more` : "")}
        line={`${thread.order.number} · ${formatNaira(thread.order.totalKobo)}`}
        status={b.label}
        onPress={() => router.push({ pathname: "/order/[id]", params: { id } })}
      />
      <ChatThread
        messages={results.map((m) => ({ _id: m._id, mine: m.mine, body: m.body, photos: m.photos, at: m.at, read: m.read }))}
        loading={status === "LoadingFirstPage" || status === "LoadingMore"}
        onLoadMore={() => status === "CanLoadMore" && loadMore(30)}
        header={
          thread.replyNote ? (
            <Text variant="small" align="center" style={styles.reply}>
              {thread.replyNote}
            </Text>
          ) : null
        }
        empty={`Ask ${thread.counterpart.name} anything about this order. Farmkeke can read this chat to keep everyone safe.`}
        canSend={thread.canSend}
        closedNote="This order didn't go ahead, so the chat is closed. Contact support if you need help."
        placeholder="Type a message…"
        maxPhotos={4}
        generateUploadUrl={() => generateUploadUrl({})}
        onSend={async (body, photoIds) => {
          await send({ orderId, side: "shop", body, photoIds: photoIds as Id<"_storage">[] });
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: chatPalette.background },
  pad: { padding: spacing.screen },
  reply: { paddingHorizontal: spacing.lg },
});
