import { router } from "expo-router";
import { StyleSheet, View } from "react-native";
import { Button } from "@/components/ui";
import { spacing } from "@/theme/tokens";

type Props = {
  busy: boolean;
  onContinue: () => void;
  /** Saves without checking and returns to Account (drafts are kept, F-09e). */
  onSaveLater: () => Promise<boolean>;
  continueLabel?: string;
};

export function StepFooter({ busy, onContinue, onSaveLater, continueLabel = "Continue" }: Props) {
  return (
    <View style={styles.wrap}>
      <Button label={continueLabel} fullWidth loading={busy} onPress={onContinue} />
      <Button
        label="Save and finish later"
        variant="ghost"
        fullWidth
        disabled={busy}
        onPress={() =>
          void onSaveLater().then((saved) => {
            if (saved) router.dismissTo("/account");
          })
        }
      />
    </View>
  );
}

/** "+2348031234567" → "0803 123 4567" for display and editing. */
export function nationalPhone(e164: string | undefined): string {
  if (!e164?.startsWith("+234")) return e164 ?? "";
  const n = `0${e164.slice(4)}`;
  return `${n.slice(0, 4)} ${n.slice(4, 7)} ${n.slice(7)}`;
}

const styles = StyleSheet.create({ wrap: { gap: spacing.xs } });
