// M-74 Order chat: message the farmer about one order, with photos. The order
// sits at the top; the chat never closes (except on orders that never went
// ahead), and Farmkeke staff can read it for safety.
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { useMutation, usePaginatedQuery, useQuery } from "convex/react";
import { Image } from "expo-image";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ChevronRight, ShieldCheck } from "@/components/icons";
import { Avatar, ScreenHeader, Skeleton, StatusScreen, Text, Button } from "@/components/ui";
import { ChatThread } from "@/features/chat/ChatThread";
import { badge } from "@/features/orders/status";
import { useOrder } from "@/features/orders/useOrder";
import { formatNaira } from "@/lib/money";
import { colors, radii, spacing } from "@/theme/tokens";

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
  return (
    <SafeAreaView style={styles.screen} edges={["top"]}>
      <View style={styles.head}>
        <ScreenHeader title={thread.counterpart.name} />
        {thread.replyNote ? (
          <Text variant="small" style={styles.reply}>
            {thread.replyNote}
          </Text>
        ) : null}
      </View>
      <ChatThread
        messages={results.map((m) => ({ _id: m._id, mine: m.mine, body: m.body, photos: m.photos, at: m.at, read: m.read, authorName: m.mine ? null : thread.counterpart.name }))}
        loading={status === "LoadingFirstPage" || status === "LoadingMore"}
        onLoadMore={() => status === "CanLoadMore" && loadMore(30)}
        header={
          <Pressable accessibilityRole="button" onPress={() => router.push({ pathname: "/order/[id]", params: { id } })} style={styles.order}>
            {thread.order.imageUrl ? <Image source={{ uri: thread.order.imageUrl }} style={styles.thumb} contentFit="cover" /> : <Avatar name={thread.counterpart.name} size={44} />}
            <View style={styles.flex}>
              <Text variant="label" numberOfLines={1}>
                {thread.order.number} · {thread.order.summary}
                {thread.order.itemCount > 1 ? ` + ${thread.order.itemCount - 1} more` : ""}
              </Text>
              <Text variant="small">
                {b.label} · {formatNaira(thread.order.totalKobo)}
              </Text>
            </View>
            <ChevronRight size={18} color={colors.inkMuted} />
          </Pressable>
        }
        empty={`Ask ${thread.counterpart.name} anything about this order. Farmkeke can read this chat to keep everyone safe.`}
        canSend={thread.canSend}
        closedNote="This order didn't go ahead, so the chat is closed. Contact support if you need help."
        placeholder={`Message ${thread.counterpart.name}`}
        maxPhotos={4}
        generateUploadUrl={() => generateUploadUrl({})}
        onSend={async (body, photoIds) => {
          await send({ orderId, side: "shop", body, photoIds: photoIds as Id<"_storage">[] });
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.canvas },
  flex: { flex: 1 },
  pad: { padding: spacing.screen },
  head: { backgroundColor: colors.canvas },
  reply: { paddingHorizontal: spacing.screen, marginTop: -spacing.sm, paddingBottom: spacing.sm },
  order: { flexDirection: "row", alignItems: "center", gap: spacing.md, padding: spacing.md, borderRadius: radii.lg, backgroundColor: colors.white },
  thumb: { width: 44, height: 44, borderRadius: radii.md, backgroundColor: colors.placeholder },
});
