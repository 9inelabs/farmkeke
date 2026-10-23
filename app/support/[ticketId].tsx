// M-91 / F-91 One conversation with Farmkeke support. Writing again reopens a
// resolved one.
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { useMutation, usePaginatedQuery, useQuery } from "convex/react";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Headphone } from "@/components/icons";
import { Button, ScreenHeader, Skeleton, StatusBadge, StatusScreen, Text } from "@/components/ui";
import { ChatThread } from "@/features/chat/ChatThread";
import { colors, radii, spacing } from "@/theme/tokens";

export default function SupportTicket() {
  const { ticketId } = useLocalSearchParams<{ ticketId: string }>();
  const id = ticketId as Id<"supportTickets">;
  const ticket = useQuery(api.support.get, { ticketId: id });
  const { results, status, loadMore } = usePaginatedQuery(api.support.messages, ticket ? { ticketId: id } : "skip", { initialNumItems: 30 });
  const send = useMutation(api.support.send);
  const markRead = useMutation(api.support.markRead);
  const generateUploadUrl = useMutation(api.chat.generateUploadUrl);

  const unread = ticket?.unread === true;
  useEffect(() => {
    if (unread) void markRead({ ticketId: id }).catch(() => undefined);
  }, [unread, markRead, id]);

  if (ticket === undefined) {
    return (
      <SafeAreaView style={styles.screen}>
        <ScreenHeader title="Support" />
        <View style={styles.pad}>
          <Skeleton height={80} radius={radii.lg} />
        </View>
      </SafeAreaView>
    );
  }
  if (ticket === null) {
    return (
      <StatusScreen
        icon={Headphone}
        tone="pending"
        header={<ScreenHeader title="Support" />}
        title="We couldn't open this conversation"
        message="It may belong to another account or phone."
        actions={<Button label="Contact support" variant="dark" size="large" pill fullWidth onPress={() => router.replace("/support")} />}
      />
    );
  }

  return (
    <SafeAreaView style={styles.screen} edges={["top"]}>
      <ScreenHeader title={ticket.number ?? "Support"} />
      <ChatThread
        messages={results.map((m) => ({ _id: m._id, mine: m.mine, body: m.body, photos: m.photos, at: m.at, staff: m.from === "staff", authorName: m.mine ? null : m.authorName }))}
        loading={status === "LoadingFirstPage" || status === "LoadingMore"}
        onLoadMore={() => status === "CanLoadMore" && loadMore(30)}
        header={
          <View style={styles.card}>
            <View style={styles.row}>
              <Text variant="label" style={styles.flex}>
                {ticket.order ? `About order ${ticket.order.number}` : ticket.about?.listingName ? `About ${ticket.about.listingName}` : "Farmkeke support"}
              </Text>
              <StatusBadge label={ticket.status === "resolved" ? "Resolved" : "Open"} tone={ticket.status === "resolved" ? "success" : "pending"} />
            </View>
            <Text variant="small">A real person replies here, usually within a few hours. We'll also email you.</Text>
          </View>
        }
        canSend
        placeholder={ticket.status === "resolved" ? "Write to reopen this conversation" : "Write a message"}
        maxPhotos={4}
        generateUploadUrl={() => generateUploadUrl({})}
        onSend={async (body, photoIds) => {
          await send({ ticketId: id, body, photoIds: photoIds as Id<"_storage">[] });
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.canvas },
  flex: { flex: 1 },
  pad: { padding: spacing.screen },
  card: { backgroundColor: colors.white, borderRadius: radii.lg, padding: spacing.md, gap: spacing.xs },
  row: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
});
