// M-69 Dispute detail: where the case is (reported, the farm's reply,
// Farmkeke's decision), what it's about, and the messages between the
// shopper, the farm and Farmkeke support. The payment stays held until it's
// decided; a refund links to its status (M-72).
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { Image } from "expo-image";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Flag, ShieldCheck } from "@/components/icons";
import { Button, ScreenHeader, Skeleton, StatusBadge, StatusScreen, Text, Timeline, type BadgeTone, type TimelineStep } from "@/components/ui";
import { ChatThread } from "@/features/chat/ChatThread";
import { dayTime } from "@/features/orders/format";
import { useOrder } from "@/features/orders/useOrder";
import { formatNaira } from "@/lib/money";
import { colors, radii, spacing } from "@/theme/tokens";
import { fonts } from "@/theme/typography";

export default function Dispute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { isLoading } = useConvexAuth();
  // Load through the order first: a bad link (not an order id) shows "not found" instead of failing
  const access = useOrder(id);
  const known = !isLoading && access.state === "ok" && !access.order.viewOnly;
  const found = useQuery(api.disputes.forOrder, known ? { orderId: id as Id<"orders"> } : "skip");
  const d = access.state === "loading" ? undefined : known ? found : null;
  const send = useMutation(api.disputes.sendMessage);
  const markRead = useMutation(api.disputes.markRead);
  const generateUploadUrl = useMutation(api.disputes.generateUploadUrl);

  const unread = d?.unread === true;
  useEffect(() => {
    if (d && unread) void markRead({ as: "consumer", disputeId: d._id }).catch(() => undefined);
  }, [d, unread, markRead]);

  if (d === undefined) {
    return (
      <SafeAreaView style={styles.screen}>
        <ScreenHeader title="Problem report" />
        <View style={styles.pad}>
          <Skeleton height={160} radius={radii.lg + 4} />
        </View>
      </SafeAreaView>
    );
  }
  if (d === null) {
    return (
      <StatusScreen
        icon={Flag}
        tone="pending"
        header={<ScreenHeader title="Problem report" />}
        title="No problem report on this order"
        message="If something's wrong with an order you haven't confirmed, you can report it from the order."
        actions={<Button label="Back to the order" variant="dark" size="large" pill fullWidth onPress={() => router.back()} />}
      />
    );
  }

  const [label, tone]: [string, BadgeTone] =
    d.status === "resolved" ? ["Decided", "success"] : d.status === "farmer_responded" ? ["Farm replied · we're reviewing", "pending"] : ["Waiting for the farm", "pending"];
  const steps: TimelineStep[] = [
    { key: "reported", title: "You reported a problem", detail: dayTime(d.reportedAt), state: "done" },
    {
      key: "farm",
      title: d.farmResponse ? `${d.farmName} replied` : d.farmReplyOverdue ? `${d.farmName} didn't reply in time` : `${d.farmName} can reply`,
      detail: d.farmResponse ? dayTime(d.farmResponse.at) : d.farmReplyOverdue ? "We'll decide without their reply" : `By ${dayTime(d.farmReplyBy)}`,
      state: d.farmResponse || d.farmReplyOverdue ? "done" : d.status === "open" ? "current" : "todo",
    },
    {
      key: "decision",
      title: d.decision ? "Farmkeke decided" : "Farmkeke decides",
      detail: d.decision?.at ? dayTime(d.decision.at) : `Usually by ${dayTime(d.decideBy)}`,
      state: d.decision ? "done" : d.status === "farmer_responded" || d.farmReplyOverdue ? "current" : "todo",
    },
  ];

  const header = (
    <View style={styles.headerStack}>
      <View style={styles.hero}>
        <Text variant="label" color={colors.lime}>
          Case {d.number} · Order {d.orderNumber}
        </Text>
        <Text variant="title" color={colors.white} style={styles.heroTitle}>
          {d.reasonLabel}
        </Text>
        <Text variant="small" color="rgba(255,255,255,0.8)">
          {formatNaira(d.amountKobo)} in question · {d.farmName}
        </Text>
        <View style={styles.heroBadges}>
          <StatusBadge label={label} tone={tone} />
          {d.heldKobo > 0 ? (
            <View style={styles.held}>
              <ShieldCheck size={13} color={colors.forest} variant="solid" />
              <Text variant="small" color={colors.forest}>
                {formatNaira(d.heldKobo)} still held
              </Text>
            </View>
          ) : null}
        </View>
      </View>

      {d.decision ? (
        <View style={[styles.card, styles.decision]}>
          <Text variant="heading">
            {d.decision.outcome === "refunded" ? "You'll get a refund" : d.decision.outcome === "split" ? "Part refund, part paid to the farm" : "The payment goes to the farm"}
          </Text>
          {d.decision.refundKobo > 0 ? <Text variant="caption">Refund to you: {formatNaira(d.decision.refundKobo)}</Text> : null}
          {d.decision.releaseKobo > 0 ? <Text variant="caption">Paid to {d.farmName}: {formatNaira(d.decision.releaseKobo)}</Text> : null}
          {d.decision.note ? <Text variant="body">{d.decision.note}</Text> : null}
          {d.decision.refundKobo > 0 ? (
            <Button label="View refund" variant="dark" size="small" onPress={() => router.push({ pathname: "/order/[id]/refund", params: { id } })} style={styles.start} />
          ) : null}
        </View>
      ) : null}

      <View style={styles.card}>
        <Timeline steps={steps} />
      </View>

      <View style={styles.card}>
        <Text variant="heading">What you reported</Text>
        {d.items.map((it) => (
          <View key={it.index} style={styles.line}>
            <Text variant="caption" style={styles.flex}>
              {it.name}: {it.affectedQuantity} of {it.quantity} {it.unitLabel}
            </Text>
            <Text variant="label">{formatNaira(it.affectedKobo)}</Text>
          </View>
        ))}
        {d.photos.length > 0 ? (
          <View style={styles.photos}>
            {d.photos.map((uri) => (
              <Image key={uri} source={{ uri }} style={styles.photo} contentFit="cover" />
            ))}
          </View>
        ) : null}
      </View>

      {d.farmResponse ? (
        <View style={styles.card}>
          <View style={styles.line}>
            <Text variant="heading" style={styles.flex}>
              {d.farmName}'s reply
            </Text>
            {d.farmResponse.stanceLabel ? <StatusBadge label={d.farmResponse.stanceLabel} tone={d.farmResponse.stance === "disagrees" ? "error" : "brand"} /> : null}
          </View>
          <Text variant="body">{d.farmResponse.note}</Text>
        </View>
      ) : null}

      <Text variant="overline" style={styles.messagesLabel}>
        Messages
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.screen} edges={["top"]}>
      <ScreenHeader title="Problem report" />
      <ChatThread
        messages={d.messages.map((m) => ({
          _id: m._id,
          mine: m.mine,
          body: m.body,
          photos: m.photos,
          at: m.at,
          staff: m.from === "staff",
          authorName: m.from === "staff" ? (m.authorName ?? "Farmkeke support") : m.from === "farmer" ? d.farmName : null,
        })).reverse()}
        loading={false}
        startAtTop
        header={header}
        canSend={d.canMessage}
        closedNote="This case is closed. If something's still not right, contact support."
        placeholder="Add a message or photo"
        maxPhotos={6}
        generateUploadUrl={() => generateUploadUrl({})}
        onSend={async (body, photoIds) => {
          await send({ as: "consumer", disputeId: d._id, body, photoIds: photoIds as Id<"_storage">[] });
        }}
      />
      {d.status === "resolved" ? (
        <Pressable accessibilityRole="link" onPress={() => router.push({ pathname: "/support", params: { orderId: id } })} style={styles.support}>
          <Text variant="label" color={colors.limeInk} align="center">
            Contact support
          </Text>
        </Pressable>
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.canvas },
  flex: { flex: 1 },
  pad: { padding: spacing.screen },
  start: { alignSelf: "flex-start" },
  headerStack: { gap: spacing.md },
  hero: { backgroundColor: colors.forest, borderRadius: radii.lg + 8, padding: spacing.xl, gap: spacing.xs },
  heroTitle: { fontFamily: fonts.displayBold },
  heroBadges: { flexDirection: "row", flexWrap: "wrap", gap: spacing.xs, marginTop: spacing.sm },
  held: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: colors.tint, borderRadius: radii.pill, paddingHorizontal: spacing.sm, paddingVertical: 3 },
  card: { backgroundColor: colors.white, borderRadius: radii.lg + 4, padding: spacing.lg, gap: spacing.sm },
  decision: { borderWidth: 1.5, borderColor: colors.lime },
  line: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  photos: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  photo: { width: 72, height: 72, borderRadius: radii.md, backgroundColor: colors.placeholder },
  messagesLabel: { marginTop: spacing.sm },
  support: { paddingVertical: spacing.md, backgroundColor: colors.white },
});
