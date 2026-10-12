// M-07 Outside service area.
import { api } from "@convex/_generated/api";
import { useConvex, useQuery } from "convex/react";
import { router, useLocalSearchParams } from "expo-router";
import { Bell, CheckCircle2, MapPin, Store } from "lucide-react-native";
import { useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { BottomSheet, Button, Notice, Screen, ScreenHeader, Skeleton, Text, TextField } from "@/components/ui";
import { errorMessage } from "@/lib/errors";
import { formatHours } from "@/lib/hours";
import { isEmail } from "@/lib/session";
import { borders, colors, radii, spacing } from "@/theme/tokens";

export default function OutsideArea() {
  const params = useLocalSearchParams<{ place?: string; state?: string; latitude?: string; longitude?: string }>();
  const latitude = Number(params.latitude);
  const longitude = Number(params.longitude);
  const hasPosition = Number.isFinite(latitude) && Number.isFinite(longitude);
  const place = params.place?.trim() || "your area";

  const match = useQuery(api.areas.matchLocation, hasPosition ? { latitude, longitude } : "skip");
  const viewer = useQuery(api.users.viewer);
  const point = match?.kind === "outside" ? match.nearestPickupPoint : null;

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
          <Notice icon={CheckCircle2}>We'll email you when delivery reaches {place}.</Notice>
        ) : (
          <Button label="Notify me when you arrive" icon={Bell} fullWidth onPress={openNotify} />
        )
      }
    >
      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          <View style={styles.pin}>
            <MapPin size={28} color={colors.pendingInk} />
          </View>
          <Text variant="displaySmall" align="center" accessibilityRole="header">
            We don't deliver to {place} yet
          </Text>
          <Text variant="body" color={colors.inkSoft} align="center">
            We're growing across the South-East. You can still collect from a pickup point, or we'll tell you when
            delivery reaches you.
          </Text>
        </View>

        {hasPosition && (
          <View style={styles.section}>
            <Text variant="overline">Nearest pickup point</Text>
            {match === undefined ? (
              <Skeleton height={68} radius={radii.lg} />
            ) : point ? (
              <View style={styles.card}>
                <View style={styles.cardIcon}>
                  <Store size={20} color={colors.forest} />
                </View>
                <View style={styles.cardCopy}>
                  <Text variant="bodyMedium">{point.name}</Text>
                  <Text variant="small">
                    {point.distanceKm} km away · {formatHours(point.hours)}
                  </Text>
                </View>
              </View>
            ) : (
              <Text variant="caption">No pickup points yet. We'll let you know when one opens near you.</Text>
            )}
          </View>
        )}

        <Button
          label="Change area"
          icon={MapPin}
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
  section: { gap: spacing.sm },
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radii.lg,
    borderWidth: borders.hairline,
    borderColor: colors.lime,
  },
  cardIcon: {
    width: 40,
    height: 40,
    borderRadius: radii.md,
    backgroundColor: colors.tint,
    alignItems: "center",
    justifyContent: "center",
  },
  cardCopy: { flex: 1, gap: 2 },
});
