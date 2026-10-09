import { LinearGradient } from "expo-linear-gradient";
import { Lock } from "lucide-react-native";
import { StyleSheet, View } from "react-native";
import { borders, colors, radii, spacing } from "@/theme/tokens";
import { Text } from "./Text";
import { Wordmark } from "./Wordmark";

type Props = {
  title?: string;
  message?: string;
};

/** The "Your money is held safely" card from the Home and Product detail frames. */
export function EscrowCard({
  title = "Your money is held safely",
  message = "We only pay the farmer after you confirm delivery",
}: Props) {
  return (
    <LinearGradient
      colors={[colors.tint, colors.white]}
      start={{ x: 0, y: 0.5 }}
      end={{ x: 1, y: 0.5 }}
      style={styles.card}
      accessible
      accessibilityLabel={`${title}. ${message}`}
    >
      <Lock size={18} color={colors.ink} strokeWidth={2} />
      <View style={styles.copy}>
        <Text variant="bodyMedium" color={colors.forest}>
          {title}
        </Text>
        <Text variant="caption" color={colors.inkMuted}>
          {message}
        </Text>
      </View>
      <Wordmark width={56} />
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radii.md,
    borderWidth: borders.hairline,
    borderColor: colors.lime,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  copy: { flex: 1, gap: 2 },
});
