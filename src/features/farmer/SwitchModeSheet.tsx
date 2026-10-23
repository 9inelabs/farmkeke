// F-13 Switch mode: move between shopping and selling.
import { Basket, Shop, type IconComponent } from "@/components/icons";
import { useEffect, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { BottomSheet, Button, StatusBadge, Text } from "@/components/ui";
import { usePrefs } from "@/store/prefs";
import { borders, colors, radii, spacing } from "@/theme/tokens";
import { useSwitchMode } from "./useSwitchMode";

type Mode = "shop" | "farm";

const MODES: { mode: Mode; icon: IconComponent; title: string; body: string }[] = [
  { mode: "shop", icon: Basket, title: "Shopping", body: "Buy fresh produce from farms near you" },
  { mode: "farm", icon: Shop, title: "Farmer mode", body: "Manage your farm, listings, orders and earnings" },
];

export function SwitchModeSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const current = usePrefs((s) => s.mode);
  const switchMode = useSwitchMode();
  const [choice, setChoice] = useState<Mode>(current === "farm" ? "shop" : "farm");
  useEffect(() => {
    if (visible) setChoice(current === "farm" ? "shop" : "farm");
  }, [visible, current]);

  return (
    <BottomSheet visible={visible} onClose={onClose}>
      <Text variant="heading">Switch mode</Text>
      <Text variant="caption">Your cart, orders and saved items are kept.</Text>
      {MODES.map(({ mode, icon: Icon, title, body }) => {
        const selected = choice === mode;
        return (
          <Pressable
            key={mode}
            accessibilityRole="radio"
            accessibilityState={{ checked: selected }}
            onPress={() => setChoice(mode)}
            style={[styles.card, selected && styles.cardOn]}
          >
            <View style={styles.icon}>
              <Icon size={20} color={colors.forest} />
            </View>
            <View style={styles.flex}>
              <Text variant="bodyMedium">{title}</Text>
              <Text variant="small">{body}</Text>
            </View>
            {mode === current && <StatusBadge label="Current" tone="brand" />}
          </Pressable>
        );
      })}
      <Button
        label={choice === current ? "Stay here" : `Switch to ${choice === "farm" ? "farmer mode" : "shopping"}`}
        fullWidth
        onPress={() => {
          onClose();
          if (choice !== current) switchMode(choice);
        }}
      />
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radii.lg,
    borderWidth: borders.hairline,
    borderColor: colors.line,
  },
  cardOn: { borderColor: colors.forest, borderWidth: 1.5, backgroundColor: colors.tint },
  icon: {
    width: 40,
    height: 40,
    borderRadius: radii.md,
    backgroundColor: colors.white,
    alignItems: "center",
    justifyContent: "center",
  },
  flex: { flex: 1, gap: 2 },
});
