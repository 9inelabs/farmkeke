// M-07 Outside service area.
import { api } from "@convex/_generated/api";
import { useConvex, useQuery } from "convex/react";
import { router, useLocalSearchParams } from "expo-router";
import { Bell, CheckCircle, Pin } from "@/components/icons";
import { useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { BottomSheet, Button, Notice, Screen, ScreenHeader, Text, TextField } from "@/components/ui";
import { errorMessage } from "@/lib/errors";
import { isEmail } from "@/lib/session";
import { colors, spacing } from "@/theme/tokens";

export default function OutsideArea() {
  const params = useLocalSearchParams<{ place?: string; state?: string; latitude?: string; longitude?: string }>();
  const latitude = Number(params.latitude);
  const longitude = Number(params.longitude);
  const hasPosition = Number.isFinite(latitude) && Number.isFinite(longitude);
  const place = params.place?.trim() || "your area";

  const viewer = useQuery(api.users.viewer);

  const convex = useConvex();
  const [asking, setAsking] = useState(false);
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  const openNotify = () => {
    setEmail(viewer?.email ?? "");
    setError(null);
    setAsking(true);
  };

  const submit = async () => {
    if (!isEmail(email)) {
      setError("Enter a full email address, like name@example.com.");
      return;
    }
    setSaving(true);
    try {
      await convex.mutation(api.areas.requestArea, {
        place,
        state: params.state || undefined,
        email,
        latitude: hasPosition ? latitude : undefined,
        longitude: hasPosition ? longitude : undefined,
      });
      setAsking(false);
      setDone(true);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen
      header={<ScreenHeader title="Your area" />}
      footer={
        done ? (
          <Notice icon={CheckCircle}>We'll email you when delivery reaches {place}.</Notice>
        ) : (
          <Button label="Notify me when you arrive" icon={Bell} fullWidth onPress={openNotify} />
        )
      }
    >
      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          <View style={styles.pin}>
            <Pin size={28} color={colors.pendingInk} />
          </View>
          <Text variant="displaySmall" align="center" accessibilityRole="header">
            We don't deliver to {place} yet
          </Text>
          <Text variant="body" color={colors.inkSoft} align="center">
            We're growing across the South-East. Leave your email and we'll tell you as soon as delivery reaches you.
          </Text>
        </View>

        <Button
          label="Change area"
          icon={Pin}
          variant="ghost"
          onPress={() => router.push({ pathname: "/choose-area" })}
        />
      </ScrollView>

      <BottomSheet visible={asking} onClose={() => setAsking(false)}>
        <Text variant="heading">Tell me when Farmkeke delivers to {place}</Text>
        <Text variant="caption">One email when delivery starts. Nothing else.</Text>
        <TextField
          label="Email"
          value={email}
          onChangeText={(t) => {
            setEmail(t);
            setError(null);
          }}
          error={error}
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
          placeholder="you@example.com"
        />
        <Button label="Notify me" fullWidth loading={saving} onPress={() => void submit()} />
      </BottomSheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: { gap: spacing.xxl, paddingTop: spacing.xxl },
  hero: { alignItems: "center", gap: spacing.md },
  pin: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.pendingSoft,
    alignItems: "center",
    justifyContent: "center",
  },
});
