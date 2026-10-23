// M-66 Payment released: after confirming receipt, with a quick star rating
// that opens Rate and review (M-73) with the stars already chosen.
import { router, useLocalSearchParams } from "expo-router";
import { Pressable, StyleSheet, View } from "react-native";
import { Check, Star } from "@/components/icons";
import { Button, StatusScreen, Text } from "@/components/ui";
import { useOrder } from "@/features/orders/useOrder";
import { formatNaira } from "@/lib/money";
import { colors, radii, spacing } from "@/theme/tokens";

export default function Released() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const access = useOrder(id);
  const o = access.state === "ok" ? access.order : null;
  const released = o && (o.escrow === "released" || o.status === "completed");
  return (
    <StatusScreen
      icon={Check}
      title="Thanks for confirming"
      message={
        !o
          ? "Your order is complete."
          : released
            ? `${formatNaira(o.totalKobo)} has been released to ${o.farmName} for order ${o.number}.`
            : `${formatNaira(o.totalKobo)} goes to ${o.farmName} for order ${o.number} once our team's check is done.`
      }
      actions={
        <>
          {o && !o.reviewed ? (
            <View style={styles.rate}>
              <Text variant="bodyMedium" align="center">
                How was your order?
              </Text>
              <View style={styles.stars}>
                {[1, 2, 3, 4, 5].map((n) => (
                  <Pressable
                    key={n}
                    accessibilityRole="button"
                    accessibilityLabel={`${n} ${n === 1 ? "star" : "stars"}`}
                    onPress={() => router.push({ pathname: "/order/[id]/review", params: { id: o._id, rating: String(n) } })}
                    style={styles.star}
                  >
                    <Star size={28} color={colors.pending} />
                  </Pressable>
                ))}
              </View>
            </View>
          ) : null}
          {o ? <Button label={`Buy again from ${o.farmName}`} size="large" pill fullWidth onPress={() => router.replace(`/farm/${o.farmId}`)} /> : null}
          <Button label="Back to my orders" variant="ghost" fullWidth onPress={() => router.replace("/orders")} />
        </>
      }
    />
  );
}

const styles = StyleSheet.create({
  rate: { gap: spacing.sm, padding: spacing.lg, borderRadius: radii.lg + 4, backgroundColor: colors.tint, marginBottom: spacing.xs },
  stars: { flexDirection: "row", justifyContent: "center", gap: spacing.sm },
  star: { width: 48, height: 48, borderRadius: radii.md, backgroundColor: colors.white, alignItems: "center", justifyContent: "center" },
});
