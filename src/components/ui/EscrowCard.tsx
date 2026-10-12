import { LinearGradient } from "expo-linear-gradient";
import { StyleSheet, View } from "react-native";
import LockIcon from "../../../assets/icons/lock.svg";
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
      locations={[0, 0.95]}
      start={{ x: 0, y: 0.5 }}
      end={{ x: 1, y: 0.5 }}
      style={styles.card}
      accessible
      accessibilityLabel={`${title}. ${message}`}
    >
      <LockIcon width={12} height={13} />
      <View style={styles.copy}>
        <Text variant="label" color={colors.forest}>
          {title}
        </Text>
        <Text variant="small">
          {message}
        </Text>
      </View>
      <Wordmark width={52} />
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
    gap: spacing.sm + 2,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
  },
  copy: { flex: 1, gap: 1 },
});
