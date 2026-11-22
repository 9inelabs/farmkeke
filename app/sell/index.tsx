// F-01 Sell on Farmkeke ("Sell your harvest straight to households"), premium
// redesign (Nov 2026): a farmer photo fading into deep green, three glass
// benefit cards and a lime Apply button. Apply goes to the
// phone step, or back into an application already started, or to farmer mode
// for an approved farm. Farmers who already sell log in with phone and PIN.
import { api } from "@convex/_generated/api";
import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, View, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ArrowRight, Close, Leaf, Shop, Truck, Wallet, type IconComponent } from "@/components/icons";
import { Stagger } from "@/components/motion/reveal";
import { Glass } from "@/components/premium";
import { Button, Text } from "@/components/ui";
import { nextStepPath } from "@/features/farmer/constants";
import { useSwitchMode } from "@/features/farmer/useSwitchMode";
import { errorCode, errorData, errorMessage } from "@/lib/errors";
import { photoProps } from "@/lib/preloadImages";
import { colors, spacing } from "@/theme/tokens";
import { fonts } from "@/theme/typography";

const BENEFITS: { icon: IconComponent; title: string; body: string }[] = [
  { icon: Shop, title: "Reach buyers beyond your area", body: "Orders come from the app and farmkeke.com" },
  { icon: Truck, title: "We collect from your farm", body: "Our riders pick up at your farm gate. You don't deliver." },
  { icon: Wallet, title: "Paid for every order", body: "Buyers pay once you accept. Paystack sends your share straight to your bank." },
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
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();

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
    <View style={styles.screen}>
      <StatusBar style="light" />
      <View style={[styles.photo, { height: Math.min(500, height * 0.58) }]}>
        <Image {...photoProps("farmerFieldHd")} style={StyleSheet.absoluteFill} contentFit="cover" contentPosition={{ left: "50%", top: "12%" }} accessible={false} />
        <LinearGradient
          colors={["rgba(11,26,7,0.6)", "rgba(11,26,7,0)", "rgba(11,26,7,0.15)", "rgba(11,26,7,0.92)", colors.forestDeep]}
          locations={[0, 0.22, 0.45, 0.85, 1]}
          style={StyleSheet.absoluteFill}
        />
      </View>
      <View style={[styles.topRow, { top: insets.top + 8 }]}>
        <Pressable accessibilityRole="button" accessibilityLabel="Close" hitSlop={8} onPress={() => (router.canGoBack() ? router.back() : router.replace("/home"))}>
          <Glass style={styles.round}>
            <Close size={20} color={colors.white} strokeWidth={2} />
          </Glass>
        </Pressable>
        <Glass style={styles.tag}>
          <Leaf size={14} color={colors.lime} strokeWidth={2} />
          <Text style={styles.tagText}>Farmkeke for farmers</Text>
        </Glass>
      </View>
      <ScrollView contentContainerStyle={[styles.scroll, { paddingTop: Math.min(500, height * 0.58) - 150 }]} showsVerticalScrollIndicator={false}>
        <Stagger>
          <Text style={styles.title} accessibilityRole="header">
            Sell your harvest straight to <Text style={[styles.title, styles.lime]}>households</Text>
          </Text>
          <View style={styles.benefits}>
            {BENEFITS.map(({ icon: Icon, title, body }) => (
              <Glass key={title} style={styles.benefit}>
                <View style={styles.icon}>
                  <Icon size={19} color={colors.forest} strokeWidth={1.8} />
                </View>
                <View style={styles.flex}>
                  <Text style={styles.benefitTitle}>{title}</Text>
                  <Text style={styles.benefitBody}>{body}</Text>
                </View>
              </Glass>
            ))}
          </View>
          <Text style={styles.small}>It takes about 3 minutes. You can stop and continue later; we save as you go.</Text>
          {error ? <Text style={styles.error}>{error}</Text> : null}
        </Stagger>
      </ScrollView>
      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 16) + 10 }]}>
        <Button
          label={farm ? "Open farmer mode" : inProgress ? "Continue your application" : "Apply as a farmer"}
          iconRight={ArrowRight}
          size="hero"
          fullWidth
          loading={busy || loading}
          onPress={() => void apply()}
        />
        <View style={styles.links}>
          <Text style={styles.linkText} accessibilityRole="link" onPress={() => router.push("/sell/login")}>
            Already selling? <Text style={styles.linkBold}>Log in</Text>
          </Text>
          <Text style={styles.dot}>·</Text>
          <Text style={styles.linkText} accessibilityRole="link" onPress={() => router.push("/farm-settings/terms")}>
            Terms apply
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.forestDeep },
  flex: { flex: 1 },
  photo: { position: "absolute", left: 0, right: 0, top: 0 },
  topRow: { position: "absolute", left: spacing.screen, right: spacing.screen, zIndex: 3, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  round: { width: 42, height: 42, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  tag: { flexDirection: "row", alignItems: "center", gap: 7, height: 32, paddingHorizontal: 12, borderRadius: 99 },
  tagText: { fontFamily: fonts.semibold, fontSize: 12.5, lineHeight: 16, color: colors.white },
  scroll: { paddingHorizontal: 24, paddingBottom: spacing.xl, gap: 0 },
  title: { fontFamily: fonts.displayHeavy, fontSize: 32, lineHeight: 38, letterSpacing: -1, color: colors.white },
  lime: { color: colors.lime },
  benefits: { gap: 10, marginTop: 20 },
  benefit: { flexDirection: "row", alignItems: "center", gap: 12, padding: 13 },
  icon: { width: 38, height: 38, borderRadius: 12, backgroundColor: colors.lime, alignItems: "center", justifyContent: "center" },
  benefitTitle: { fontFamily: fonts.semibold, fontSize: 14, lineHeight: 19, color: colors.white },
  benefitBody: { fontFamily: fonts.regular, fontSize: 12, lineHeight: 17, color: colors.onForest, marginTop: 1 },
  small: { fontFamily: fonts.regular, fontSize: 12.5, lineHeight: 18, color: colors.onForest, marginTop: 14 },
  error: { fontFamily: fonts.medium, fontSize: 13, lineHeight: 18, color: "#FF9C9C", marginTop: 8 },
  footer: { paddingHorizontal: 24, paddingTop: 8, gap: 14 },
  links: { flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 8 },
  linkText: { fontFamily: fonts.medium, fontSize: 14, lineHeight: 20, color: colors.onForest },
  linkBold: { fontFamily: fonts.bold, color: colors.white },
  dot: { color: colors.onForest },
});
