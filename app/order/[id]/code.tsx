// M-64 Pickup code, full screen for the farmer to read or scan: the four
// digits, the QR code, where to collect and when.
import { router, useLocalSearchParams } from "expo-router";
import { ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Close, ShieldCheck } from "@/components/icons";
import { Button, Skeleton, Text } from "@/components/ui";
import { dayLabel } from "@/features/orders/format";
import { PickupQr } from "@/features/orders/PickupQr";
import { useOrder } from "@/features/orders/useOrder";
import { formatHours } from "@/lib/hours";
import { colors, radii, spacing } from "@/theme/tokens";
import { fonts } from "@/theme/typography";

export default function PickupCode() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const access = useOrder(id);
  const o = access.state === "ok" ? access.order : null;
  const code = o?.pickupCode ?? null;
  const f = o?.collectFrom ?? null;

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.top}>
        <Button label="Close" icon={Close} variant="ghost" size="small" onPress={() => router.back()} style={styles.close} />
      </View>
      <ScrollView contentContainerStyle={styles.body}>
        {access.state === "loading" ? (
          <Skeleton height={360} radius={radii.lg + 8} />
        ) : !o || !code ? (
          <Text variant="body" color={colors.white} align="center">
            There's no pickup code on this order yet. We'll send it when the farm has your order ready.
          </Text>
        ) : (
          <>
            <Text variant="label" color={colors.lime} align="center">
              {o.number} · {o.farmName}
            </Text>
            <Text variant="displaySmall" color={colors.white} align="center">
              Your pickup code
            </Text>
            <View style={styles.digits} accessible accessibilityLabel={`Pickup code ${code.split("").join(" ")}`}>
              {code.split("").map((d, i) => (
                <View key={i} style={styles.digit}>
                  <Text style={styles.digitText}>{d}</Text>
                </View>
              ))}
            </View>
            <View style={styles.qr}>
              <PickupQr code={code} size={200} />
            </View>
            <View style={styles.note}>
              <ShieldCheck size={20} color={colors.lime} variant="solid" />
              <Text variant="caption" color="rgba(255,255,255,0.85)" style={styles.flex}>
                Only give the code to the farmer when you're collecting. Entering it hands the order over to you.
              </Text>
            </View>
            {f ? (
              <View style={styles.where}>
                <Text variant="label" color={colors.white}>
                  {f.farmName}
                </Text>
                <Text variant="small" color="rgba(255,255,255,0.75)">
                  {[f.address, f.lga, f.state].filter(Boolean).join(", ")}
                </Text>
                {f.hours && f.hours.length > 0 ? (
                  <Text variant="small" color="rgba(255,255,255,0.75)">
                    {formatHours(f.hours)}
                  </Text>
                ) : null}
                {o.collectBy ? (
                  <Text variant="small" color={colors.lime}>
                    Collect by {dayLabel(o.collectBy)}
                  </Text>
                ) : null}
              </View>
            ) : null}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.forest },
  flex: { flex: 1 },
  top: { flexDirection: "row", justifyContent: "flex-end", paddingHorizontal: spacing.lg, paddingTop: spacing.sm },
  close: { backgroundColor: "rgba(255,255,255,0.12)" },
  body: { paddingHorizontal: spacing.screen, paddingBottom: spacing.xxxl, gap: spacing.lg, alignItems: "stretch" },
  digits: { flexDirection: "row", justifyContent: "center", gap: spacing.md, marginTop: spacing.sm },
  digit: { width: 66, height: 84, borderRadius: radii.lg, backgroundColor: colors.white, alignItems: "center", justifyContent: "center" },
  digitText: { fontFamily: fonts.displayBold, fontSize: 44, lineHeight: 52, color: colors.forest },
  qr: { alignSelf: "center", padding: spacing.lg, borderRadius: radii.lg + 8, backgroundColor: colors.white },
  note: { flexDirection: "row", gap: spacing.md, padding: spacing.md, borderRadius: radii.md, backgroundColor: "rgba(255,255,255,0.08)" },
  where: { gap: 2, padding: spacing.md, borderRadius: radii.md, backgroundColor: "rgba(255,255,255,0.08)" },
});
