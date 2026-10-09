// M-59 Sign-in prompt: shown when a guest taps something that needs an account.
import { router } from "expo-router";
import { UserRound } from "lucide-react-native";
import { StyleSheet, View } from "react-native";
import { BottomSheet, Button, Text } from "@/components/ui";
import { colors, spacing } from "@/theme/tokens";

type Props = {
  visible: boolean;
  onClose: () => void;
  /** Why an account is needed, e.g. "Sign in to save items". */
  title: string;
  message: string;
};

export function SignInPromptSheet({ visible, onClose, title, message }: Props) {
  const go = (path: "/sign-in" | "/create-account") => {
    onClose();
    router.push(path);
  };
  return (
    <BottomSheet visible={visible} onClose={onClose}>
      <View style={styles.body}>
        <View style={styles.icon}>
          <UserRound size={26} color={colors.forest} />
        </View>
        <Text variant="heading" align="center">
          {title}
        </Text>
        <Text variant="caption" align="center">
          {message}
        </Text>
      </View>
      <Button label="Sign in" fullWidth onPress={() => go("/sign-in")} />
      <Button label="Create account" variant="outline" fullWidth onPress={() => go("/create-account")} />
      <Button label="Not now" variant="ghost" fullWidth onPress={onClose} />
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  body: { alignItems: "center", gap: spacing.sm, paddingVertical: spacing.md },
  icon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.tint,
    alignItems: "center",
    justifyContent: "center",
  },
});
