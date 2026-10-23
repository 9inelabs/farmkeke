// M-33 Delivery or pickup. Home delivery is priced per order once the farm
// accepts (the shopper pays one bill then); pickup is at each farm and paid
// now. Items a farm only offers one way block the other.
import { router } from "expo-router";
import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Pin, Truck, type IconComponent } from "@/components/icons";
import { Button, Notice, Text } from "@/components/ui";
import { CheckoutShell } from "@/features/checkout/CheckoutShell";
import { useCheckoutDraft } from "@/features/checkout/draft";
import { groupByFarm, useQuote } from "@/features/checkout/useQuote";
import { colors, radii, spacing } from "@/theme/tokens";
import { fonts } from "@/theme/typography";

type Mode = "delivery" | "pickup";
type Blocker = { name: string; farmName: string };
const blockerText = (b: Blocker[]) => b.map((x) => `${x.name} (${x.farmName})`).join(", ");

export default function Method() {
  const saved = useCheckoutDraft((s) => s.fulfilment);
  const patch = useCheckoutDraft((s) => s.patch);
  const [mode, setMode] = useState<Mode>(saved ?? "delivery");
  const [error, setError] = useState<string | null>(null);
  const { quote, lines, area } = useQuote("delivery");
  const farms = groupByFarm(lines);
  const deliveryBlocked = quote?.deliveryBlockers ?? [];
  const pickupBlocked = quote?.pickupBlockers ?? [];
  const farmAreas = (quote?.farms ?? []).map((f) => (f.collectionArea ? `${f.farmName}, ${f.collectionArea}` : f.farmName)).join(" · ");
  const appliesTo =
    farms.length === 1 ? "This applies to your whole order." : farms.length === 2 ? "This applies to both farms in your cart." : `This applies to all ${farms.length} farms in your cart.`;

  const pick = (m: Mode) => {
    setMode(m);
    setError(null);
  };

  const next = () => {
    if (mode === "delivery" && deliveryBlocked.length > 0)
      return setError(`Home delivery isn't offered for ${blockerText(deliveryBlocked)}. Choose pickup, or remove it from your cart.`);
    if (mode === "pickup" && pickupBlocked.length > 0)
      return setError(`Pickup isn't offered for ${blockerText(pickupBlocked)}. Choose home delivery, or remove it from your cart.`);
    if (mode === "delivery" && !area) {
      setError("Choose your area first, so we know where to send the rider.");
      return router.push({ pathname: "/choose-area", params: { from: "checkout" } });
    }
    patch({ fulfilment: mode });
    router.push("/checkout/details");
  };

  return (
    <CheckoutShell
      step={2}
      title="How do you want to get your order?"
      subtitle={appliesTo}
      footer={<Button label="Continue" size="large" pill fullWidth onPress={next} disabled={quote === undefined} />}
    >
      <View accessibilityRole="radiogroup" style={styles.options}>
        <Option
          icon={Truck}
          on={mode === "delivery"}
          onPress={() => pick("delivery")}
          title="Home delivery"
          price="Priced later"
          body="Nothing to pay now. When the farm accepts, we price the delivery and send your bill by email, text and in the app. Once you pay, a Farmkeke rider brings your order."
          meta={
            deliveryBlocked.length > 0
              ? `Not available for ${blockerText(deliveryBlocked)}`
              : area
                ? `Delivering to ${area.name}, ${area.state}`
                : "Choose your area so we know where to send the rider"
          }
          metaTone={deliveryBlocked.length > 0 ? "error" : "muted"}
          link={mode === "delivery" ? { label: area ? "Change area" : "Choose your area", onPress: () => router.push({ pathname: "/choose-area", params: { from: "checkout" } }) } : undefined}
        />
        <Option
          icon={Pin}
          on={mode === "pickup"}
          onPress={() => pick("pickup")}
          title="Pickup at the farm"
          price="No fee"
          body="Pay now and collect from the farm. When it's ready, we send the address and your 4-digit pickup code. You have 3 days to collect."
          meta={pickupBlocked.length > 0 ? `Not available for ${blockerText(pickupBlocked)}` : farmAreas}
          metaTone={pickupBlocked.length > 0 ? "error" : "muted"}
        />
      </View>
      {error !== null && <Notice tone="error">{error}</Notice>}
    </CheckoutShell>
  );
}

function Option({
  icon: Icon,
  on,
  onPress,
  title,
  price,
  body,
  meta,
  metaTone,
  link,
}: {
  icon: IconComponent;
  on: boolean;
  onPress: () => void;
  title: string;
  price: string;
  body: string;
  meta: string;
  metaTone: "muted" | "error";
  link?: { label: string; onPress: () => void };
}) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ checked: on }}
      accessibilityLabel={`${title}, ${price}`}
      onPress={onPress}
      style={[styles.option, on && styles.optionOn]}
    >
      <View style={styles.optionHead}>
        <View style={[styles.tile, on && styles.tileOn]}>
          <Icon size={24} color={colors.forest} variant={on ? "solid" : "line"} />
        </View>
        <View style={styles.flex}>
          <Text variant="heading">{title}</Text>
          <Text variant="label" color={on ? colors.limeInk : colors.inkSoft} style={styles.price}>
            {price}
          </Text>
        </View>
        <View style={[styles.radio, on && styles.radioOn]}>{on && <View style={styles.dot} />}</View>
      </View>
      <Text variant="caption">{body}</Text>
      {meta ? (
        <Text variant="small" color={metaTone === "error" ? colors.error : colors.inkMuted}>
          {meta}
        </Text>
      ) : null}
      {link ? (
        <Text variant="label" color={colors.limeInk} accessibilityRole="link" onPress={link.onPress} style={styles.link}>
          {link.label}
        </Text>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  options: { gap: spacing.md },
  option: {
    backgroundColor: colors.white,
    borderRadius: radii.lg + 4,
    padding: spacing.lg,
    gap: spacing.sm,
    borderWidth: 1.5,
    borderColor: colors.white,
  },
  optionOn: { borderColor: colors.lime, backgroundColor: "#FBFDF6" },
  optionHead: { flexDirection: "row", alignItems: "center", gap: spacing.md, marginBottom: spacing.xxs },
  tile: { width: 48, height: 48, borderRadius: radii.md + 2, backgroundColor: colors.surfaceSoft, alignItems: "center", justifyContent: "center" },
  tileOn: { backgroundColor: colors.lime },
  price: { fontFamily: fonts.semibold },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 1.5, borderColor: colors.inkMuted, alignItems: "center", justifyContent: "center" },
  radioOn: { borderColor: colors.forest },
  dot: { width: 12, height: 12, borderRadius: 6, backgroundColor: colors.forest },
  link: { paddingVertical: spacing.xxs },
});
