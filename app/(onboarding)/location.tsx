// M-05 Location permission primer (Figma: location).
// Back (top left, and Android's back button) returns to wherever the shopper
// came from: the area picker, Home's area chip, and so on. On a first launch
// this screen replaced Get started, so there's nothing behind it; back then
// goes to Get started rather than closing the app.
import { api } from "@convex/_generated/api";
import { useConvex } from "convex/react";
import * as Location from "expo-location";
import { router, useFocusEffect } from "expo-router";
import { ChevronDown } from "@/components/icons";
import { useCallback, useState } from "react";
import { ActivityIndicator, BackHandler, Platform, Pressable, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { BackIcon, Button, Notice, Text, Wordmark } from "@/components/ui";
import { usePrefs } from "@/store/prefs";
import { borders, colors, spacing } from "@/theme/tokens";

const goBack = () => {
  if (router.canGoBack()) router.back();
  else router.replace("/get-started");
};

export default function LocationPrimer() {
  const convex = useConvex();
  const setArea = usePrefs((s) => s.setArea);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);

  // Android's back button: with history the stack pops as usual; without it
  // (first launch) go to Get started instead of leaving the app.
  useFocusEffect(
    useCallback(() => {
      if (Platform.OS !== "android") return;
      const sub = BackHandler.addEventListener("hardwareBackPress", () => {
        if (router.canGoBack()) return false;
        router.replace("/get-started");
        return true;
      });
      return () => sub.remove();
    }, []),
  );

  const chooseManually = () => router.push("/choose-area");

  const detect = async () => {
    setProblem(null);
    setBusy(true);
    try {
      const { granted } = await Location.requestForegroundPermissionsAsync();
      if (!granted) {
        chooseManually();
        return;
      }
      const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const { latitude, longitude } = position.coords;
      const match = await convex.query(api.areas.matchLocation, { latitude, longitude });
      if (match.kind === "served") {
        setArea({
          serviceAreaId: match.area._id,
          name: match.area.name,
          state: match.area.state,
          lga: match.area.lga,
        });
        router.replace("/home");
        return;
      }
      const [place] = await Location.reverseGeocodeAsync({ latitude, longitude }).catch(() => []);
      router.push({
        pathname: "/outside-area",
        params: {
          place: place?.city ?? place?.subregion ?? place?.region ?? "",
          state: place?.region ?? "",
          latitude: String(latitude),
          longitude: String(longitude),
        },
      });
    } catch {
      setProblem("We couldn't find your location. Choose your area instead.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={styles.screen}>
      {/* Same place and size as the back mark in ScreenHeader on the other light screens */}
      <View style={styles.top}>
        <Pressable accessibilityRole="button" accessibilityLabel="Back" hitSlop={8} onPress={goBack} style={styles.back}>
          <BackIcon />
        </Pressable>
      </View>
      <View style={styles.content}>
        {/* The column stretches its children; the wordmark sits centred like the copy under it. */}
        <Wordmark width={227} style={styles.wordmark} />
        <Text variant="body" align="center" style={styles.copy}>
          We use your location to show produce that can reach you, and the farms closest to you.
        </Text>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Select location yourself"
          onPress={chooseManually}
          style={styles.select}
        >
          <Text variant="body" color={colors.inkMuted}>
            Select location
          </Text>
          <ChevronDown size={18} color={colors.inkMuted} />
        </Pressable>

        <Button label="Search location automatically" fullWidth onPress={() => void detect()} disabled={busy} />
        <Text variant="small" align="center">
          We never share your location with farmers
        </Text>

        {problem !== null && <Notice tone="error">{problem}</Notice>}
        {busy && <ActivityIndicator size="large" color={colors.forest} style={styles.spinner} />}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.tint },
  top: { flexDirection: "row", paddingHorizontal: spacing.screen, paddingTop: spacing.md, paddingBottom: spacing.md, minHeight: 56, alignItems: "center" },
  back: { minWidth: 32, minHeight: 32, justifyContent: "center", marginLeft: -4 },
  content: { flex: 1, justifyContent: "center", alignItems: "stretch", paddingHorizontal: 42, gap: spacing.lg },
  wordmark: { alignSelf: "center" },
  copy: { marginTop: spacing.xs, marginBottom: spacing.lg, paddingHorizontal: spacing.sm, alignSelf: "center" },
  select: {
    height: 58,
    borderRadius: 18,
    backgroundColor: colors.white,
    borderWidth: borders.hairline,
    borderColor: colors.lime,
    paddingHorizontal: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  spinner: { marginTop: spacing.xxl },
});

