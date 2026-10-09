// M-82 Edit profile.
import { api } from "@convex/_generated/api";
import { useMutation } from "convex/react";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import { Avatar, Button, Notice, Screen, ScreenHeader, Skeleton, Text, TextField } from "@/components/ui";
import { useAccount } from "@/features/account/useAccount";
import { errorMessage } from "@/lib/errors";
import { colors, radii, spacing } from "@/theme/tokens";

export default function EditProfile() {
  const viewer = useAccount();
  const updateProfile = useMutation(api.account.updateProfile);
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (viewer?.name) setName(viewer.name);
  }, [viewer?.name]);

  const save = async () => {
    if (name.trim().length === 0) {
      setError("Enter your full name.");
      return;
    }
    setBusy(true);
    try {
      await updateProfile({ name: name.trim() });
      router.back();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen
      scroll
      header={<ScreenHeader title="Edit profile" />}
      footer={
        <Button
          label="Save changes"
          fullWidth
          loading={busy}
          disabled={viewer === undefined || name.trim() === (viewer.name ?? "")}
          onPress={() => void save()}
        />
      }
    >
      {viewer === undefined ? (
        <Skeleton height={56} radius={radii.control} />
      ) : (
        <View style={styles.body}>
          <View style={styles.avatar}>
            <Avatar name={name || viewer.name} size={72} />
          </View>
          <TextField
            label="Full name"
            value={name}
            onChangeText={(t) => {
              setName(t);
              setError(null);
            }}
            error={error}
            autoCapitalize="words"
            autoComplete="name"
            textContentType="name"
          />
          <Notice>
            <Text variant="caption" color={colors.forest}>
              To change your email or password, go to{" "}
              <Text
                variant="label"
                color={colors.forest}
                accessibilityRole="link"
                onPress={() => router.replace("/settings/login-details")}
              >
                Login details
              </Text>
              .
            </Text>
          </Notice>
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: { gap: spacing.xl, paddingTop: spacing.md },
  avatar: { alignItems: "center" },
});
