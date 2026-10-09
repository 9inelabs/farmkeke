// M-05 Location permission primer (Figma: location).
import { api } from "@convex/_generated/api";
import { useConvex } from "convex/react";
import * as Location from "expo-location";
import { router } from "expo-router";
import { ChevronDown } from "lucide-react-native";
import { useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Button, Notice, Text, Wordmark } from "@/components/ui";
import { usePrefs } from "@/store/prefs";
import { borders, colors, spacing } from "@/theme/tokens";

export default function LocationPrimer() {
  const convex = useConvex();
  const setArea = usePrefs((s) => s.setArea);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);

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
      <View style={styles.content}>
        <Wordmark width={227} />
        <Text variant="body" align="center" style={styles.copy}>
          We use your location to show produce that can reach you, and the pickup points closest to you.
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
  content: { flex: 1, justifyContent: "center", alignItems: "stretch", paddingHorizontal: 42, gap: spacing.lg },
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

