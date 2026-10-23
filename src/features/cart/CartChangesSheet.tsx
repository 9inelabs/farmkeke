// M-32 Cart changed, from the "Cart changes" design: what's different since
// the items were added (price, stock, sold out), and one button that brings
// the cart up to date.
import { Image } from "expo-image";
import { StyleSheet, View } from "react-native";
import { Info, Refresh } from "@/components/icons";
import { BottomSheet, Button, Text } from "@/components/ui";
import { formatNaira } from "@/lib/money";
import { colors, radii, spacing } from "@/theme/tokens";
import { fonts } from "@/theme/typography";

export type CartChange = {
  kind: "unavailable" | "sold_out" | "price" | "quantity";
  listingId: string;
  unitId: string;
  name: string;
  oldPriceKobo?: number;
  priceKobo?: number;
  oldQuantity?: number;
  quantity?: number;
};

type Line = { imageUrl: string | null; unitSingular: string; unitPlural: string };

const WORDS = ["No", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine"];

export function CartChangesSheet({
  visible,
  changes,
  lineFor,
  onUpdate,
  onClose,
}: {
  visible: boolean;
  changes: CartChange[];
  lineFor: (c: CartChange) => Line | undefined;
  onUpdate: () => void;
  onClose: () => void;
}) {
  const n = changes.length;
  const title = `${WORDS[n] ?? n} ${n === 1 ? "thing" : "things"} changed in your cart`;
  return (
    <BottomSheet visible={visible} onClose={onClose} handle={false}>
      <View style={styles.head}>
        <View style={styles.icon}>
          <Info size={18} color={colors.pending} />
        </View>
        <Text variant="heading" accessibilityRole="header" style={styles.title}>
          {title}
        </Text>
      </View>
      <Text variant="body" color={colors.inkSoft} align="center" style={styles.intro}>
        Farms update prices and stock through the day. Here's what's different since you added {n === 1 ? "it" : "these"}.
      </Text>
      <View style={styles.list}>
        {changes.map((c) => {
          const line = lineFor(c);
          return (
            <View key={`${c.listingId}:${c.unitId}`} style={styles.row}>
              {line?.imageUrl ? (
                <Image source={{ uri: line.imageUrl }} style={styles.thumb} contentFit="cover" />
              ) : (
                <View style={styles.thumb} />
              )}
              <View style={styles.copy}>
                <Text variant="bodyMedium" numberOfLines={1}>
                  {c.name}
                </Text>
                <Text variant="small" numberOfLines={2}>
                  {reason(c, line)}
                </Text>
              </View>
              <Outcome change={c} />
            </View>
          );
        })}
      </View>
      <Button label="Update cart" icon={Refresh} variant="dark" size="large" fullWidth onPress={onUpdate} style={styles.button} />
    </BottomSheet>
  );
}

function reason(c: CartChange, line: Line | undefined) {
  const one = line?.unitSingular ?? "unit";
  const many = line?.unitPlural ?? "units";
  switch (c.kind) {
    case "price":
      return `Price per ${one} went ${(c.priceKobo ?? 0) > (c.oldPriceKobo ?? 0) ? "up" : "down"}`;
    case "quantity":
      return (c.quantity ?? 0) < (c.oldQuantity ?? 0)
        ? `Only ${c.quantity} ${c.quantity === 1 ? one : many} left; you had ${c.oldQuantity}`
        : `The farm sells at least ${c.quantity} ${many}`;
    case "sold_out":
      return "The farm has sold out";
    case "unavailable":
      return "No longer on sale";
  }
}

function Outcome({ change: c }: { change: CartChange }) {
  if (c.kind === "price") {
    return (
      <View style={styles.price}>
        <Text variant="small" style={styles.struck}>
          {formatNaira(c.oldPriceKobo ?? 0)}
        </Text>
        <Text variant="bodyMedium" style={styles.bold}>
          {formatNaira(c.priceKobo ?? 0)}
        </Text>
      </View>
    );
  }
  const [label, bg, fg] =
    c.kind === "quantity" ? [`Now ${c.quantity}`, colors.infoSoft, colors.info] : ["Removed", colors.errorSoft, colors.error];
  return (
    <View style={[styles.tag, { backgroundColor: bg }]}>
      <Text variant="label" color={fg}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing.sm, marginTop: spacing.lg },
  icon: { width: 30, height: 30, borderRadius: 15, backgroundColor: colors.pendingSoft, alignItems: "center", justifyContent: "center" },
  title: { flexShrink: 1 },
  intro: { paddingHorizontal: spacing.sm },
  list: { borderRadius: radii.lg + 4, borderWidth: 1, borderColor: colors.line, padding: spacing.md, gap: spacing.md, marginTop: spacing.xs },
  row: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  thumb: { width: 56, height: 56, borderRadius: radii.md, backgroundColor: colors.tint },
  copy: { flex: 1, gap: 2 },
  price: { alignItems: "flex-end" },
  struck: { textDecorationLine: "line-through" },
  bold: { fontFamily: fonts.bold },
  tag: { borderRadius: radii.sm, paddingHorizontal: spacing.sm, paddingVertical: 4 },
  button: { marginTop: spacing.sm, marginBottom: spacing.sm },
});
