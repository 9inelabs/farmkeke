// F-83 Order chat, farm side: the buyer's messages about one order, with
// photos. The order sits at the top. Loads through the farm's order first,
// so a bad link shows "couldn't open" instead of failing.
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { useMutation, usePaginatedQuery, useQuery } from "convex/react";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Messages } from "@/components/icons";
import { Button, ScreenHeader, Skeleton, StatusScreen } from "@/components/ui";
import { ChatHeader, ChatOrderCard } from "@/features/chat/ChatHeader";
import { ChatThread } from "@/features/chat/ChatThread";
import { chatPalette } from "@/features/chat/palette";
import { farmBadge } from "@/features/farm/status";
import { formatNaira } from "@/lib/money";
import { radii, spacing } from "@/theme/tokens";

export default function FarmOrderChat() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const order = useQuery(api.orders.farmer.get, { orderId: id ?? "" });
  const orderId = order?._id as Id<"orders"> | undefined;
  const thread = useQuery(api.chat.thread, orderId ? { orderId, side: "farm" } : "skip");
  const { results, status, loadMore } = usePaginatedQuery(api.chat.messages, orderId && thread ? { orderId, side: "farm" } : "skip", { initialNumItems: 30 });
  const send = useMutation(api.chat.send);
  const markRead = useMutation(api.chat.markRead);
  const generateUploadUrl = useMutation(api.chat.generateUploadUrl);

  const newest = results[0]?._id;
  useEffect(() => {
    if (orderId && thread && thread.unread > 0) void markRead({ orderId, side: "farm" }).catch(() => undefined);
  }, [thread, newest, markRead, orderId]);

  if (order === undefined || (order !== null && thread === undefined)) {
    return (
      <SafeAreaView style={styles.screen}>
        <ScreenHeader title="Message" />
        <View style={styles.pad}>
          <Skeleton height={72} radius={radii.lg} />
        </View>
      </SafeAreaView>
    );
  }
  if (order === null || !thread || !orderId) {
    return (
      <StatusScreen
        icon={Messages}
        tone="pending"
        header={<ScreenHeader title="Message" />}
        title="We couldn't open this chat"
        message="It may be about another farm's order."
        actions={<Button label="Back" variant="dark" size="large" pill fullWidth onPress={() => router.back()} />}
      />
    );
  }

  const b = farmBadge(order);
  const name = thread.counterpart.name;
  const first = thread.order.firstItem;
  const more = thread.order.itemCount - 1;
  return (
    <View style={styles.screen}>
      <ChatHeader name={name} subtitle={`Buyer · Order ${order.number}`} right={{ kind: "buyer", name, photoUrl: thread.counterpart.photoUrl }} />
      <ChatOrderCard
        imageUrl={thread.order.imageUrl}
        title={(first ? `${first.name} × ${first.quantity}` : thread.order.summary) + (more > 0 ? ` and ${more} more` : "")}
        line={`${order.number} · ${formatNaira(order.money.netKobo)} to you`}
        status={b.label}
        onPress={() => router.push({ pathname: "/farm-order/[id]", params: { id: orderId } })}
      />
      <ChatThread
        messages={results.map((m) => ({ _id: m._id, mine: m.mine, body: m.body, photos: m.photos, at: m.at, read: m.read }))}
        loading={status === "LoadingFirstPage" || status === "LoadingMore"}
        onLoadMore={() => status === "CanLoadMore" && loadMore(30)}
        empty={`Questions from ${name} show here. Farmkeke can read this chat to keep everyone safe.`}
        canSend={thread.canSend}
        closedNote="This order didn't go ahead, so the chat is closed."
        placeholder={`Reply to ${name}…`}
        maxPhotos={4}
        generateUploadUrl={() => generateUploadUrl({})}
        onSend={async (body, photoIds) => {
          await send({ orderId, side: "farm", body, photoIds: photoIds as Id<"_storage">[] });
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: chatPalette.background },
  pad: { padding: spacing.screen },
});
