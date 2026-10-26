// F-01 Sell on Farmkeke ("Sell Straight to Households"). Apply goes to the
// phone step, or back into an application already started, or to farmer mode
// for an approved farm. Farmers who already sell log in with phone and PIN.
import { api } from "@convex/_generated/api";
import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { router } from "expo-router";
import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Lock, People, Truck, type IconComponent } from "@/components/icons";
import { Button, Text, Wordmark } from "@/components/ui";
import { nextStepPath } from "@/features/farmer/constants";
import { useSwitchMode } from "@/features/farmer/useSwitchMode";
import { SellShell, SellTitle } from "@/features/sell/SellShell";
import { errorCode, errorData, errorMessage } from "@/lib/errors";
import { colors, radii, spacing } from "@/theme/tokens";
import { fonts } from "@/theme/typography";

const BENEFITS: { icon: IconComponent; title: string; body: string }[] = [
  { icon: People, title: "Reach buyers beyond your area", body: "Households across the city order from your farm on the app and farmkeke.com" },
  { icon: Truck, title: "We collect from your farm", body: "Farmkeke riders pick up each order at your farm gate. You don't deliver." },
  { icon: Lock, title: "Paid for every order", body: "Buyers pay before you prepare anything. Farmkeke holds the money and pays you once they confirm delivery." },
];

export default function SellOnFarmkeke() {
  const { isAuthenticated } = useConvexAuth();
  const viewer = useQuery(api.users.viewer, isAuthenticated ? {} : "skip");
  const phone = useQuery(api.phoneAuth.mine, isAuthenticated ? {} : "skip");
  const application = useQuery(api.farmerApplications.mine, isAuthenticated ? {} : "skip");
  const farm = useQuery(api.farms.mine, isAuthenticated ? {} : "skip");
  const start = useMutation(api.farmerApplications.start);
  const switchMode = useSwitchMode();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const account = viewer && !viewer.isGuest;
  const loading = isAuthenticated && (viewer === undefined || phone === undefined || application === undefined || farm === undefined);
  const inProgress = application && (application.status === "draft" || application.status === "more_info");

  const apply = async () => {
    setError(null);
    if (farm) return switchMode("farm");
    if (application && !inProgress && application.status !== "rejected") return router.push("/sell/status");
    // Sign-up starts by proving the phone, and setting a PIN
    if (!account || !phone?.hasPin) return router.push({ pathname: "/sell/phone", params: phone?.phone ? { phone: phone.phone } : {} });
    setBusy(true);
    try {
      await start({});
      router.push(inProgress && application ? nextStepPath(application.problems) : "/sell/apply/profile");
    } catch (e) {
      const code = errorCode(e);
      if (code === "REAPPLY_LATER") {
        const date = new Date(errorData<{ reapplyAfter: number }>(e).reapplyAfter ?? 0);
        setError(`You can apply again from ${date.toDateString()}.`);
      } else if (code === "ALREADY_FARMER") router.push("/sell/status");
      else setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <SellShell
      scene="intro"
      back="close"
      curve="both"
      sticker="none"
      pinFooter
      footer={
        <>
          <View style={styles.sellRow}>
            <Text style={styles.sellOn}>Sell on</Text>
            <Wordmark width={92} />
          </View>
          <Button label={farm ? "Open farmer mode" : inProgress ? "Continue your application" : "Apply as a farmer today"} variant="black" size="large" pill fullWidth loading={busy || loading} onPress={() => void apply()} />
          <View style={styles.links}>
            <Pressable accessibilityRole="link" hitSlop={8} onPress={() => router.push("/sell/login")}>
              <Text variant="small" color={colors.ink} style={styles.link}>
                Already selling? Log in
              </Text>
            </Pressable>
            <Text variant="small">·</Text>
            <Pressable accessibilityRole="link" hitSlop={8} onPress={() => router.push("/farm-settings/terms")}>
              <Text variant="small">Terms & Conditions apply</Text>
            </Pressable>
          </View>
        </>
      }
    >
      <View style={styles.brand}>
        <Wordmark width={120} />
        <Text variant="small" color={colors.ink}>
          ...from the farm, directly to your home
        </Text>
      </View>
      <SellTitle title="Sell Straight to" accent="Households" note="List your produce, get orders and get paid safely. Everything happens in this app." />
      <View style={styles.card}>
        {BENEFITS.map(({ icon: Icon, title, body }, i) => (
          <View key={title} style={[styles.benefit, i > 0 && styles.divider]}>
            <View style={styles.icon}>
              <Icon size={16} color={colors.forest} />
            </View>
            <View style={styles.flex}>
              <Text variant="label" style={styles.benefitTitle}>
                {title}
              </Text>
              <Text variant="small" color={colors.inkSoft}>
                {body}
              </Text>
            </View>
          </View>
        ))}
      </View>
      <Text variant="small" color={colors.inkSoft}>
        It takes about 3 minutes. You can stop and continue later; we save as you go.
      </Text>
      {error ? (
        <Text variant="small" color={colors.error}>
          {error}
        </Text>
      ) : null}
    </SellShell>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, gap: 2 },
  brand: { alignItems: "center", gap: 4 },
  card: { backgroundColor: colors.white, borderRadius: radii.lg + 2, paddingHorizontal: spacing.lg, paddingVertical: spacing.xs },
  benefit: { flexDirection: "row", gap: spacing.md, paddingVertical: spacing.md },
  divider: { borderTopWidth: 1, borderTopColor: colors.line },
  icon: { width: 28, height: 28, borderRadius: 8, backgroundColor: colors.tint, alignItems: "center", justifyContent: "center", marginTop: 2 },
  benefitTitle: { fontFamily: fonts.semibold },
  sellRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, marginBottom: 2 },
  sellOn: { fontFamily: fonts.displayBold, fontSize: 15, lineHeight: 21, color: colors.ink },
  links: { flexDirection: "row", justifyContent: "center", alignItems: "center", gap: spacing.sm, marginTop: 2 },
  link: { textDecorationLine: "underline", fontFamily: fonts.medium },
});
