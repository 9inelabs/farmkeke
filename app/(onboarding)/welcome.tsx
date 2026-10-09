// M-03 Onboarding carousel (Figma: Onboarding 1–3).
import { Image } from "expo-image";
import { router } from "expo-router";
import { useState } from "react";
import {
  FlatList,
  Pressable,
  StyleSheet,
  useWindowDimensions,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Text } from "@/components/ui";
import { colors, radii, spacing } from "@/theme/tokens";

const PANELS = [
  {
    key: "fresh",
    title: "Fresh from the farm",
    body: "Buy tomatoes, yam, ugwu and more straight from farmers near you, at farm prices.",
    image: require("../../assets/illustrations/onboarding-fresh.jpg"),
    background: colors.white,
  },
  {
    key: "delivery",
    title: "At your door, or ready to collect",
    body: "A Farmkeke rider brings your order home, or you pick it up at a pickup point near you.",
    image: require("../../assets/illustrations/onboarding-delivery.jpg"),
    background: "#ECF6DB",
  },
  {
    key: "escrow",
    title: "Your money stays safe",
    body: "We hold your payment and only pay the farmer after you confirm you got everything.",
    image: require("../../assets/illustrations/onboarding-escrow.jpg"),
    background: "#ECF5D8",
  },
];

export default function Welcome() {
  const { width } = useWindowDimensions();
  const [index, setIndex] = useState(0);
  const last = index === PANELS.length - 1;

  const finish = () => router.replace("/get-started");
  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) =>
    setIndex(Math.round(e.nativeEvent.contentOffset.x / width));

  return (
    <View style={[styles.screen, { backgroundColor: PANELS[index].background }]}>
      <FlatList

        data={PANELS}
        horizontal
        pagingEnabled
        bounces={false}
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={onScroll}
        keyExtractor={(p) => p.key}
        renderItem={({ item }) => (
          <View style={[styles.panel, { width, backgroundColor: item.background }]}>
            <SafeAreaView edges={["top"]} style={styles.copy}>
              <View style={styles.topSpacer} />
              <Text variant="display" accessibilityRole="header">
                {item.title}
              </Text>
              <Text variant="body" color={colors.inkSoft} style={styles.body}>
                {item.body}
              </Text>
            </SafeAreaView>
            <Image
              source={item.image}
              style={styles.illustration}
              contentFit="cover"
              contentPosition="bottom"
              accessible={false}
            />
          </View>
        )}
      />

      {/* Progress dashes and Skip / Next sit above the carousel */}
      <SafeAreaView edges={["top"]} style={styles.topBar} pointerEvents="box-none">
        <View style={styles.dashes} accessibilityLabel={`Page ${index + 1} of ${PANELS.length}`}>
          {PANELS.map((p, i) => (
            <View key={p.key} style={[styles.dash, i <= index && styles.dashOn]} />
          ))}
        </View>
        {/* Figma: Skip on panels 1–2 jumps to Get started; Next on the last panel. Swipe moves between panels. */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={last ? "Next" : "Skip the introduction"}
          onPress={finish}
          style={styles.skip}
        >
          <Text variant="label" color={colors.forest}>
            {last ? "Next" : "Skip"}
          </Text>
        </Pressable>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  panel: { flex: 1 },
  copy: { paddingHorizontal: spacing.screen + 8, gap: spacing.md },
  topSpacer: { height: 72 },
  body: { maxWidth: 320 },
  illustration: { flex: 1, width: "100%", marginTop: spacing.xxl },
  topBar: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.screen + 8,
    paddingTop: spacing.md,
  },
  dashes: { flexDirection: "row", gap: 4 },
  dash: { width: 20, height: 3, borderRadius: 2, backgroundColor: colors.tint },
  dashOn: { backgroundColor: colors.lime },
  skip: {
    backgroundColor: colors.lime,
    borderRadius: radii.md + 1,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    minHeight: 37,
    justifyContent: "center",
  },
});
