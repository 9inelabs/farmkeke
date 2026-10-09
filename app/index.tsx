// M-01 Splash: restores the saved session and preferences, then routes to
// onboarding (first launch), area selection, or Home.
import { useConvexAuth } from "convex/react";
import { Redirect } from "expo-router";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { Text, Wordmark } from "@/components/ui";
import { usePrefs, usePrefsHydrated } from "@/store/prefs";
import { colors, spacing } from "@/theme/tokens";

export default function Splash() {
  const hydrated = usePrefsHydrated();
  const { isLoading } = useConvexAuth();
  const onboardingSeen = usePrefs((s) => s.onboardingSeen);
  const area = usePrefs((s) => s.area);
  const mode = usePrefs((s) => s.mode);

  if (hydrated && !isLoading) {
    if (!onboardingSeen) return <Redirect href="/welcome" />;
    if (area === null) return <Redirect href="/location" />;
    // Farmer mode checks the farm itself and falls back to shopping.
    return <Redirect href={mode === "farm" ? "/dashboard" : "/home"} />;
  }

  return (
    <View style={styles.screen} accessibilityLabel="Farmkeke is loading">
      <Wordmark width={220} />
      <Text variant="caption" color={colors.ink} style={styles.tagline}>
        ...from the farm, directly to your home
      </Text>
      <ActivityIndicator color={colors.lime} style={styles.spinner} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.white, alignItems: "center", justifyContent: "center" },
  tagline: { marginTop: spacing.xs },
  spinner: { position: "absolute", bottom: 80 },
});
