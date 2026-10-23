// M-73 Rate and review (reviews.forOrder / reviews.submit): stars, quick
// tags, optional stars for each item, and a comment. One review per
// completed order. Opened with ?rating=4 from Payment released.
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { Image } from "expo-image";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Platform, Pressable, StyleSheet, TextInput, View } from "react-native";
import { Star } from "@/components/icons";
import { Avatar, Button, Notice, Screen, ScreenHeader, Skeleton, StatusScreen, Text } from "@/components/ui";
import { useOrder } from "@/features/orders/useOrder";
import { errorCode } from "@/lib/errors";
import { showToast } from "@/store/toast";
import { colors, radii, spacing } from "@/theme/tokens";
import { fonts } from "@/theme/typography";

const TAGS = ["Fresh", "Well packed", "On time", "Good value", "Friendly farmer", "As described"];
const WORDS = ["", "Poor", "Not great", "Okay", "Good", "Excellent"];

export default function Review() {
  const params = useLocalSearchParams<{ id: string; rating?: string }>();
  const { isLoading } = useConvexAuth();
  // Load through the order first: a bad link (not an order id) shows "can't rate" instead of failing
  const access = useOrder(params.id);
  const known = !isLoading && access.state === "ok" && !access.order.viewOnly;
  const found = useQuery(api.reviews.forOrder, known ? { orderId: params.id as Id<"orders"> } : "skip");
  const data = access.state === "loading" ? undefined : known ? found : null;
  const submit = useMutation(api.reviews.submit);
  const start = Number(params.rating);
  const [rating, setRating] = useState(start >= 1 && start <= 5 ? start : 0);
  const [tags, setTags] = useState<string[]>([]);
  const [items, setItems] = useState<Record<number, number>>({});
  const [comment, setComment] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (data === undefined) {
    return (
      <Screen header={<ScreenHeader title="Rate your order" />}>
        <Skeleton height={300} radius={radii.lg} />
      </Screen>
    );
  }
  if (data === null || !data.canReview) {
    return (
      <StatusScreen
        icon={Star}
        header={<ScreenHeader title="Rate your order" />}
        title={data?.review ? "Thanks, you've rated this order" : "You can't rate this order yet"}
        message={data?.review ? `You gave ${data.farmName} ${data.review.rating} stars.` : "You can rate an order once you've confirmed you received it."}
        actions={<Button label="Back" variant="dark" size="large" pill fullWidth onPress={() => router.back()} />}
      />
    );
  }

  const send = async () => {
    if (rating === 0) return setError("Choose from 1 to 5 stars.");
    setBusy(true);
    setError(null);
    try {
      await submit({
        orderId: params.id as Id<"orders">,
        rating,
        tags,
        comment: comment.trim() || undefined,
        itemRatings: Object.entries(items).map(([index, r]) => ({ index: Number(index), rating: r })),
      });
      showToast({ message: `Thanks! Your review helps ${data.farmName} grow.` });
      router.back();
    } catch (e) {
      setBusy(false);
      const code = errorCode(e);
      setError(code === "ALREADY_REVIEWED" ? "You've already rated this order." : code === "COMMENT_TOO_LONG" ? "Keep your comment under 1,000 characters." : "We couldn't send your review. Check your connection and try again.");
    }
  };

  return (
    <Screen
      scroll
      background={colors.canvas}
      contentStyle={styles.content}
      header={<ScreenHeader title="Rate your order" />}
      footer={
        <>
          {error ? <Notice tone="error">{error}</Notice> : null}
          <Button label="Send review" variant="dark" size="large" pill fullWidth loading={busy} onPress={() => void send()} />
        </>
      }
    >
      <View style={[styles.card, styles.center]}>
        {data.farmPhotoUrl ? <Image source={{ uri: data.farmPhotoUrl }} style={styles.farmPhoto} contentFit="cover" /> : <Avatar name={data.farmName} size={64} />}
        <Text variant="heading" align="center">
          How was your order from {data.farmName}?
        </Text>
        <Text variant="small">Order {data.number}</Text>
        <Stars value={rating} onChange={setRating} size={40} />
        <Text variant="label" color={rating ? colors.forest : colors.inkMuted}>
          {rating ? WORDS[rating] : "Tap a star"}
        </Text>
      </View>

      <View style={styles.card}>
        <Text variant="heading">What went well?</Text>
        <View style={styles.tags}>
          {TAGS.map((t) => {
            const on = tags.includes(t);
            return (
              <Pressable key={t} accessibilityRole="checkbox" accessibilityState={{ checked: on }} onPress={() => setTags((x) => (on ? x.filter((y) => y !== t) : [...x, t]))} style={[styles.tag, on && styles.tagOn]}>
                <Text variant="label" style={on && styles.semibold}>
                  {t}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {data.items.length > 1 ? (
        <View style={styles.card}>
          <Text variant="heading">Rate each item (optional)</Text>
          {data.items.map((it, index) => (
            <View key={index} style={styles.item}>
              {it.imageUrl ? <Image source={{ uri: it.imageUrl }} style={styles.thumb} contentFit="cover" /> : <View style={styles.thumb} />}
              <Text variant="label" style={styles.flex} numberOfLines={1}>
                {it.name}
              </Text>
              <Stars value={items[index] ?? 0} onChange={(r) => setItems((x) => ({ ...x, [index]: r }))} size={20} />
            </View>
          ))}
        </View>
      ) : null}

      <View style={styles.card}>
        <Text variant="heading">Anything else? (optional)</Text>
        <TextInput
          value={comment}
          onChangeText={setComment}
          placeholder="Tell other shoppers what you thought"
          placeholderTextColor={colors.inkMuted}
          multiline
          maxLength={1000}
          style={styles.comment}
          accessibilityLabel="Comment"
        />
        <Text variant="small">Your first name and last initial show with your review.</Text>
      </View>
    </Screen>
  );
}

function Stars({ value, onChange, size }: { value: number; onChange: (n: number) => void; size: number }) {
  return (
    <View style={styles.stars} accessibilityRole="adjustable" accessibilityValue={{ min: 0, max: 5, now: value }}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Pressable key={n} accessibilityRole="button" accessibilityLabel={`${n} ${n === 1 ? "star" : "stars"}`} hitSlop={4} onPress={() => onChange(n)}>
          <Star size={size} color={n <= value ? colors.pending : colors.line} variant={n <= value ? "solid" : "line"} />
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.md },
  flex: { flex: 1 },
  semibold: { fontFamily: fonts.semibold },
  card: { backgroundColor: colors.white, borderRadius: radii.lg + 4, padding: spacing.lg, gap: spacing.md },
  center: { alignItems: "center" },
  farmPhoto: { width: 64, height: 64, borderRadius: 32 },
  stars: { flexDirection: "row", gap: spacing.sm },
  tags: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  tag: { minHeight: 40, justifyContent: "center", paddingHorizontal: spacing.lg, borderRadius: radii.pill, backgroundColor: colors.surfaceSoft, borderWidth: 1.5, borderColor: colors.surfaceSoft },
  tagOn: { backgroundColor: colors.tint, borderColor: colors.lime },
  item: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  thumb: { width: 40, height: 40, borderRadius: radii.sm, backgroundColor: colors.placeholder },
  comment: {
    minHeight: 100,
    borderRadius: radii.md,
    backgroundColor: colors.surfaceMuted,
    borderWidth: 1,
    borderColor: colors.line,
    padding: spacing.md,
    fontFamily: fonts.regular,
    fontSize: 15,
    color: colors.ink,
    textAlignVertical: "top",
    // The box is the outline; no second browser focus ring on web
    ...(Platform.OS === "web" ? ({ outlineStyle: "none" } as object) : {}),
  },
});
