// M-30 / M-31 Cart, from the "My Cart" design: one white card per farm with
// its items, steppers, Remove and the farm's subtotal; the items total and
// Checkout pinned at the bottom. The cart is checked against the server
// (api.checkout.quote); anything that changed shows in M-32 before checkout.
import { api } from "@convex/_generated/api";
import { useQuery } from "convex/react";
import { Image } from "expo-image";
import { router } from "expo-router";
import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ArrowRightCircle, Cart as CartIcon, Trash } from "@/components/icons";
import { Avatar, Button, EmptyState, QuantityStepper, ScreenHeader, Text } from "@/components/ui";
import { CartChangesSheet, type CartChange } from "@/features/cart/CartChangesSheet";
import { useShopContext } from "@/features/shop/useShopContext";
import { formatNaira } from "@/lib/money";
import { quoteItems, useCart, type CartLine } from "@/store/cart";
import { colors, radii, spacing } from "@/theme/tokens";
import { fonts } from "@/theme/typography";

type Key = { listingId: string; unitId: string };
const keyOf = (l: Key) => `${l.listingId}:${l.unitId}`;

export default function Cart() {
  const lines = useCart((s) => s.lines);
  const setQuantity = useCart((s) => s.setQuantity);
  const remove = useCart((s) => s.remove);
  const replace = useCart((s) => s.replace);
  const { serviceAreaId } = useShopContext();
  const quote = useQuery(api.checkout.quote, lines.length > 0 ? { items: quoteItems(lines), ...(serviceAreaId ? { serviceAreaId } : {}) } : "skip");
  const [showChanges, setShowChanges] = useState(false);

  const back = () => router.navigate("/home");

  if (lines.length === 0) {
    return (
      <SafeAreaView edges={["top"]} style={styles.screen}>
        <ScreenHeader title="My Cart" onBack={back} />
        <View style={styles.center}>
          <EmptyState
            icon={CartIcon}
            title="Your cart is empty"
            message="Fresh produce from farms near you is a few taps away"
            actionLabel="Start shopping"
            onAction={back}
          />
        </View>
      </SafeAreaView>
    );
  }

  const changes: CartChange[] = quote?.changes ?? [];
  const serverLine = new Map((quote?.farms ?? []).flatMap((f) => f.lines.map((l) => [keyOf(l), l] as const)));
  const farmInfo = new Map((quote?.farms ?? []).map((f) => [f.farmId as string, f]));
  const priceOf = (l: CartLine) => serverLine.get(keyOf(l))?.priceKobo ?? l.priceKobo;

  // Lines grouped by farm, in the order they were first added.
  const groups: { farmId: string; farmName: string; lines: CartLine[] }[] = [];
  for (const l of lines) {
    const g = groups.find((x) => x.farmId === l.farmId);
    if (g) g.lines.push(l);
    else groups.push({ farmId: l.farmId, farmName: l.farmName, lines: [l] });
  }
  const itemsTotal = lines.reduce((s, l) => s + priceOf(l) * l.quantity, 0);

  // Server-corrected lines; items no longer for sale drop out.
  const update = () => {
    if (!quote) return;
    replace(
      lines.flatMap((l) => {
        const s = serverLine.get(keyOf(l));
        return s ? [{ ...l, priceKobo: s.priceKobo, quantity: s.quantity, stock: s.stock, minOrder: s.minOrder, imageUrl: s.imageUrl ?? l.imageUrl }] : [];
      }),
    );
    setShowChanges(false);
  };

  const checkout = () => {
    if (changes.length > 0) setShowChanges(true);
    else router.push("/checkout");
  };

  return (
    <SafeAreaView edges={["top"]} style={styles.screen}>
      <ScreenHeader title="My Cart" onBack={back} />
      <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
        {changes.length > 0 && (
          <Pressable accessibilityRole="button" onPress={() => setShowChanges(true)} style={styles.changed}>
            <Text variant="label" color={colors.pendingInk} style={styles.flex}>
              {changes.length === 1 ? "1 item has" : `${changes.length} items have`} changed since you added {changes.length === 1 ? "it" : "them"}
            </Text>
            <Text variant="label" color={colors.pendingInk} style={styles.bold}>
              Review
            </Text>
          </Pressable>
        )}
        {groups.map((g) => {
          const info = farmInfo.get(g.farmId);
          const count = g.lines.length;
          const subtotal = g.lines.reduce((s, l) => s + priceOf(l) * l.quantity, 0);
          return (
            <View key={g.farmId} style={styles.card}>
              <View style={styles.farmHead}>
                <View style={styles.farmRing}>
                  {info?.farmPhotoUrl ? (
                    <Image source={{ uri: info.farmPhotoUrl }} style={styles.farmPhoto} contentFit="cover" />
                  ) : (
                    <Avatar name={g.farmName} size={42} />
                  )}
                </View>
                <View style={styles.flex}>
                  <Text variant="bodyMedium" numberOfLines={1} style={styles.semibold}>
                    {g.farmName}
                  </Text>
                  <Text variant="small" color={colors.limeInk}>
                    {info ? `${info.farmArea} • ` : ""}
                    {count} {count === 1 ? "item" : "items"}
                  </Text>
                </View>
              </View>
              <View style={styles.items}>
                {g.lines.map((l, i) => {
                  const price = priceOf(l);
                  return (
                    <View key={keyOf(l)} style={[styles.item, i > 0 && styles.divider]}>
                      {l.imageUrl ? (
                        <Image source={{ uri: l.imageUrl }} style={styles.thumb} contentFit="cover" />
                      ) : (
                        <View style={styles.thumb} />
                      )}
                      <View style={styles.flex}>
                        <Text variant="label" numberOfLines={1} style={styles.semibold}>
                          {l.name}
                        </Text>
                        <Text variant="small">
                          {formatNaira(price)} per {l.unitSingular}
                        </Text>
                        <View style={styles.stepper}>
                          <QuantityStepper
                            value={l.quantity}
                            min={Math.max(1, l.minOrder)}
                            max={Math.max(l.stock, l.quantity)}
                            onChange={(q) => setQuantity(l, q)}
                          />
                        </View>
                      </View>
                      <View style={styles.right}>
                        <Text variant="heading" style={styles.lineTotal}>
                          {formatNaira(price * l.quantity)}
                        </Text>
                        <Pressable
                          accessibilityRole="button"
                          accessibilityLabel={`Remove ${l.name}`}
                          hitSlop={8}
                          onPress={() => remove(l)}
                          style={styles.remove}
                        >
                          <View style={styles.trash}>
                            <Trash size={14} color={colors.white} />
                          </View>
                          <Text variant="label" color={colors.danger}>
                            Remove
                          </Text>
                        </Pressable>
                      </View>
                    </View>
                  );
                })}
              </View>
              <View style={styles.subtotal}>
                <Text variant="caption" style={styles.flex} numberOfLines={1}>
                  {g.farmName} subtotal
                </Text>
                <Text variant="bodyMedium" style={styles.bold}>
                  {formatNaira(subtotal)}
                </Text>
              </View>
            </View>
          );
        })}
      </ScrollView>

      <View style={styles.bar}>
        <View style={styles.flex}>
          <Text variant="small" color={colors.inkSoft}>
            Items Total
          </Text>
          <Text variant="title" style={styles.total} numberOfLines={1} adjustsFontSizeToFit>
            {formatNaira(itemsTotal)}
          </Text>
        </View>
        <Button label="Checkout" iconRight={ArrowRightCircle} variant="dark" size="large" pill onPress={checkout} style={styles.checkout} />
      </View>

      <CartChangesSheet
        visible={showChanges}
        changes={changes}
        lineFor={(c) => lines.find((l) => keyOf(l) === keyOf(c))}
        onUpdate={update}
        onClose={() => setShowChanges(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.canvas },
  center: { flex: 1, justifyContent: "center", paddingBottom: spacing.xxxl * 2 },
  flex: { flex: 1 },
  bold: { fontFamily: fonts.bold },
  semibold: { fontFamily: fonts.semibold },
  list: { paddingHorizontal: spacing.screen, paddingBottom: spacing.xxl, gap: spacing.lg },
  changed: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radii.lg,
    backgroundColor: colors.pendingSoft,
  },
  card: { backgroundColor: colors.white, borderRadius: radii.lg + 8, padding: spacing.md, gap: spacing.md },
  farmHead: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  farmRing: { padding: 2, borderRadius: 26, borderWidth: 1.5, borderColor: colors.forest },
  farmPhoto: { width: 42, height: 42, borderRadius: 21, backgroundColor: colors.placeholder },
  items: { backgroundColor: colors.canvas, borderRadius: radii.lg, paddingHorizontal: spacing.md },
  item: { flexDirection: "row", alignItems: "center", gap: spacing.md, paddingVertical: spacing.md },
  divider: { borderTopWidth: 1, borderTopColor: colors.line },
  thumb: { width: 60, height: 60, borderRadius: radii.md, backgroundColor: colors.placeholder },
  stepper: { marginTop: spacing.xs },
  right: { alignSelf: "stretch", alignItems: "flex-end", justifyContent: "space-between" },
  lineTotal: { fontFamily: fonts.medium, fontSize: 20, lineHeight: 26 },
  remove: { flexDirection: "row", alignItems: "center", gap: spacing.xs },
  trash: { width: 24, height: 24, borderRadius: 7, backgroundColor: colors.danger, alignItems: "center", justifyContent: "center" },
  subtotal: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: colors.tint,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
  },
  bar: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.lg,
    paddingHorizontal: spacing.screen,
    paddingVertical: spacing.md,
    backgroundColor: colors.canvas,
  },
  total: { fontFamily: fonts.bold },
  checkout: { minWidth: 168 },
});
