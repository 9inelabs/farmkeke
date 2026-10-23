// M-52 Account created.
import { useLocalSearchParams } from "expo-router";
import { CheckCircle, Phone } from "@/components/icons";
import { StyleSheet, View } from "react-native";
import { Button, StatusScreen, Text } from "@/components/ui";
import { closeAuth } from "@/features/auth/navigation";
import { colors, radii, spacing } from "@/theme/tokens";

export default function AccountCreated() {
  const { name } = useLocalSearchParams<{ name?: string }>();
  const first = name?.trim().split(/\s+/)[0];
  return (
    <StatusScreen
      icon={CheckCircle}
      tone="success"
      title={first ? `Welcome, ${first}` : "Welcome to Farmkeke"}
      message="Your account is ready. You'll stay signed in on this phone until you sign out."
      actions={<Button label="Continue shopping" fullWidth onPress={closeAuth} />}
    >
      <View style={styles.pill}>
        <Phone size={14} color={colors.forest} />
        <Text variant="small" color={colors.forest}>
          Remembered on this phone
        </Text>
      </View>
    </StatusScreen>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    backgroundColor: colors.tint,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
});
