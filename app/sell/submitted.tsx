// F-09 Application submitted.
import { router, useLocalSearchParams } from "expo-router";
import { CheckCircle } from "@/components/icons";
import { StyleSheet, View } from "react-native";
import { Button, StatusScreen, Text } from "@/components/ui";
import { colors, radii, spacing } from "@/theme/tokens";

export default function ApplicationSubmitted() {
  const { reference } = useLocalSearchParams<{ reference?: string }>();
  return (
    <StatusScreen
      icon={CheckCircle}
      tone="success"
      title="Application submitted"
      message="Farmkeke usually decides within 2 working days. Check the status any time from Account."
      actions={
        <>
          <Button label="See application status" fullWidth onPress={() => router.replace("/sell/status")} />
          <Button label="Back to shopping" variant="ghost" fullWidth onPress={() => router.dismissTo("/account")} />
        </>
      }
    >
      {reference ? (
        <View style={styles.reference}>
          <Text variant="small" color={colors.forest}>
            Reference {reference}
          </Text>
        </View>
      ) : null}
    </StatusScreen>
  );
}

const styles = StyleSheet.create({
  reference: {
    backgroundColor: colors.tint,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
});
