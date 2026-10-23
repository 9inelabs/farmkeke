// Toast motion options to choose from. Open /dev/toasts in the preview and
// tap Play on each; ?play=island (drop, spring, rise) plays one on load.
import { useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { CheckCircle, Play } from "@/components/icons";
import { LiquidToast, type ToastMotion } from "@/components/feedback/LiquidToast";
import { ScreenHeader, Text } from "@/components/ui";
import { colors, radii, spacing } from "@/theme/tokens";
import { fonts } from "@/theme/typography";

const OPTIONS: { motion: ToastMotion; letter: string; name: string; body: string }[] = [
  { motion: "island", letter: "A", name: "Island morph", body: "A dark dot drops in at the top and stretches sideways into the message, like the iPhone's Dynamic Island. Shrinks back to a dot to leave." },
  { motion: "drop", letter: "B", name: "Liquid drop", body: "Falls from the top, squashes a little as it lands and wobbles back into shape, like a drop of water." },
  { motion: "spring", letter: "C", name: "Soft spring", body: "Slides down and settles with a gentle overshoot. The calmest of the four." },
  { motion: "rise", letter: "D", name: "Rise from cart", body: "A lime bead rises out of the Cart tab and swells into the message, so it feels like the item went into the cart." },
];

export default function ToastOptions() {
  const params = useLocalSearchParams<{ play?: ToastMotion }>();
  const [current, setCurrent] = useState<ToastMotion | null>(null);
  const [visible, setVisible] = useState(false);

  const play = useCallback((motion: ToastMotion) => {
    setCurrent(motion);
    setVisible(true);
  }, []);

  useEffect(() => {
    if (params.play) {
      const t = setTimeout(() => play(params.play!), 600);
      return () => clearTimeout(t);
    }
  }, [params.play, play]);

  useEffect(() => {
    if (!visible) return;
    const t = setTimeout(() => setVisible(false), 2600);
    return () => clearTimeout(t);
  }, [visible, current]);

  return (
    <SafeAreaView style={styles.screen}>
      <ScreenHeader title="Toast options" />
      <ScrollView contentContainerStyle={styles.list}>
        {OPTIONS.map((o) => (
          <View key={o.motion} style={styles.card}>
            <View style={styles.letter}>
              <Text variant="heading" color={colors.forest}>
                {o.letter}
              </Text>
            </View>
            <View style={styles.copy}>
              <Text variant="heading">{o.name}</Text>
              <Text variant="caption">{o.body}</Text>
            </View>
            <Pressable accessibilityRole="button" accessibilityLabel={`Play ${o.name}`} onPress={() => play(o.motion)} style={styles.play}>
              <Play size={18} color={colors.white} variant="solid" />
            </Pressable>
          </View>
        ))}
      </ScrollView>
      {current !== null && (
        <LiquidToast key={current} motion={current} visible={visible} onHidden={() => setCurrent(null)}>
          <CheckCircle size={22} color={colors.lime} variant="solid" />
          <Text variant="label" color={colors.white} numberOfLines={1} style={styles.flex}>
            Tomatoes added to your cart
          </Text>
          <Text variant="label" color={colors.lime} style={styles.bold}>
            View cart
          </Text>
        </LiquidToast>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.canvas },
  list: { padding: spacing.screen, gap: spacing.md },
  card: { flexDirection: "row", alignItems: "center", gap: spacing.md, backgroundColor: colors.white, borderRadius: radii.lg + 4, padding: spacing.lg },
  letter: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.lime, alignItems: "center", justifyContent: "center" },
  copy: { flex: 1, gap: 4 },
  play: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.forest, alignItems: "center", justifyContent: "center" },
  flex: { flex: 1 },
  bold: { fontFamily: fonts.semibold },
});
