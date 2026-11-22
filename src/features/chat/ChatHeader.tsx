// The order chat's header and order card (APK #4 redesign, approved 22 Nov
// 2026), shared by the shopper's and the farmer's side.
// - Header: back, the other side's name with a second line, and on the right
//   the farm's photo with a chevron to its page (shopper side) or the buyer's
//   photo or initials (farmer side, not tappable). No call button and no
//   online status: the app doesn't track either.
// - Order card: the first item, the order number and amount, its status in
//   plain words; tapping opens the order.
import { Image } from "expo-image";
import { router } from "expo-router";
import { Pressable, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Basket, ChevronRight, Verified } from "@/components/icons";
import { Avatar, BackIcon, Text } from "@/components/ui";
import { borders, colors, spacing } from "@/theme/tokens";
import { fonts } from "@/theme/typography";
import { chatPalette } from "./palette";

type Right =
  | { kind: "farm"; name: string; photoUrl: string | null; onPress: () => void }
  | { kind: "buyer"; name: string; photoUrl: string | null };

export function ChatHeader({ name, verified = false, subtitle, right }: { name: string; verified?: boolean; subtitle: string; right: Right }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Back"
        hitSlop={6}
        // Opened straight from a notification there's nothing behind: the splash routes to Home or the dashboard
        onPress={() => (router.canGoBack() ? router.back() : router.replace("/"))}
        style={({ pressed }) => [styles.back, pressed && styles.pressed]}
      >
        <BackIcon />
      </Pressable>
      <View style={styles.titles} accessibilityRole="header">
        <View style={styles.nameRow}>
          <Text numberOfLines={1} maxFontSizeMultiplier={1.3} style={styles.name}>
            {name}
          </Text>
          {verified ? <Verified size={15} color={colors.success} variant="solid" accessibilityLabel="Verified farm" /> : null}
        </View>
        <Text numberOfLines={1} maxFontSizeMultiplier={1.3} style={styles.subtitle}>
          {subtitle}
        </Text>
      </View>
      {right.kind === "farm" ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Open ${right.name}'s farm page`}
          hitSlop={4}
          onPress={right.onPress}
          style={({ pressed }) => [styles.farmPill, pressed && styles.pressed]}
        >
          <Face name={right.name} photoUrl={right.photoUrl} size={34} />
          <ChevronRight size={16} color={colors.forest} strokeWidth={2} />
        </Pressable>
      ) : (
        <Face name={right.name} photoUrl={right.photoUrl} size={40} />
      )}
    </View>
  );
}

function Face({ name, photoUrl, size }: { name: string; photoUrl: string | null; size: number }) {
  if (photoUrl) {
    return <Image source={{ uri: photoUrl }} style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: colors.placeholder }} contentFit="cover" accessible={false} />;
  }
  return <Avatar name={name} size={size} />;
}

export function ChatOrderCard({
  imageUrl,
  title,
  line,
  status,
  onPress,
}: {
  imageUrl: string | null;
  title: string;
  line: string;
  status: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${title}. ${line}. ${status}. Open the order`}
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      {imageUrl ? (
        <Image source={{ uri: imageUrl }} style={styles.thumb} contentFit="cover" accessible={false} />
      ) : (
        <View style={[styles.thumb, styles.thumbEmpty]}>
          <Basket size={24} color={colors.forest} />
        </View>
      )}
      <View style={styles.cardText}>
        <Text numberOfLines={1} style={styles.cardTitle}>
          {title}
        </Text>
        <Text numberOfLines={1} style={styles.cardLine}>
          {line}
        </Text>
        <View style={styles.chip}>
          <Text numberOfLines={1} style={styles.chipText}>
            {status}
          </Text>
        </View>
      </View>
      <ChevronRight size={18} color={colors.inkMuted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingHorizontal: spacing.screen,
    paddingBottom: spacing.sm + 2,
    backgroundColor: colors.white,
    borderBottomWidth: borders.hairline,
    borderBottomColor: chatPalette.line,
  },
  back: { width: 40, height: 40, borderRadius: 13, backgroundColor: colors.surfaceSoft, alignItems: "center", justifyContent: "center" },
  pressed: { opacity: 0.7 },
  titles: { flex: 1, gap: 1 },
  nameRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  name: { flexShrink: 1, fontFamily: fonts.bold, fontSize: 16, lineHeight: 21, color: colors.ink },
  subtitle: { fontFamily: fonts.regular, fontSize: 12, lineHeight: 16, color: colors.inkMuted },
  farmPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    paddingTop: 3,
    paddingRight: 8,
    paddingBottom: 3,
    paddingLeft: 3,
    borderRadius: 999,
    borderWidth: borders.hairline,
    borderColor: chatPalette.pillBorder,
    backgroundColor: colors.white,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    marginHorizontal: spacing.screen,
    marginTop: 10,
    marginBottom: 2,
    padding: 10,
    borderRadius: 18,
    borderWidth: borders.hairline,
    borderColor: chatPalette.line,
    backgroundColor: colors.white,
  },
  thumb: { width: 58, height: 58, borderRadius: 12, backgroundColor: colors.placeholder },
  thumbEmpty: { backgroundColor: colors.tint, alignItems: "center", justifyContent: "center" },
  cardText: { flex: 1, gap: 3, alignItems: "flex-start" },
  cardTitle: { fontFamily: fonts.bold, fontSize: 14, lineHeight: 19, color: colors.ink },
  cardLine: { fontFamily: fonts.regular, fontSize: 12, lineHeight: 16, color: colors.inkSoft },
  chip: { backgroundColor: chatPalette.chipFill, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 },
  chipText: { fontFamily: fonts.semibold, fontSize: 10.5, lineHeight: 14, color: chatPalette.chipText },
});
