// M-20 Added to cart: a short message at the top with "View cart". Hides
// itself after a few seconds.
import { router } from "expo-router";
import { CheckCircle } from "@/components/icons";
import { useEffect } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import Animated, { FadeInUp, FadeOutUp } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Text } from "@/components/ui";
import { useShopUi } from "@/store/shopUi";
import { colors, radii, shadow, spacing } from "@/theme/tokens";

const SHOW_MS = 3500;

export function AddedToast() {
  const name = useShopUi((s) => s.added);
  const hide = useShopUi((s) => s.hideAdded);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (name === null) return;
    const t = setTimeout(hide, SHOW_MS);
    return () => clearTimeout(t);
  }, [name, hide]);

  if (name === null) return null;
  return (
    <Animated.View
      entering={FadeInUp.duration(250)}
      exiting={FadeOutUp.duration(150)}
      pointerEvents="box-none"
      style={[styles.wrap, { top: insets.top + spacing.sm }]}
    >
      <View style={styles.toast} accessibilityLiveRegion="polite" accessibilityRole="alert">
        <CheckCircle size={20} color={colors.lime} strokeWidth={2.25} />
        <Text variant="label" color={colors.white} numberOfLines={2} style={styles.copy}>
          {name} added to your cart
        </Text>
        <Pressable
          accessibilityRole="button"
          hitSlop={8}
          onPress={() => {
            hide();
            router.push("/cart");
          }}
        >
          <Text variant="label" color={colors.lime}>
            View cart
          </Text>
        </Pressable>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: "absolute", left: spacing.screen, right: spacing.screen, zIndex: 50 },
  toast: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: colors.forest,
    borderRadius: radii.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    ...shadow.raised,
  },
  copy: { flex: 1 },
});
