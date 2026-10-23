// F-14 Setup checklist.
import { router } from "expo-router";
import { CheckCircle, Circle, Shop, Sprout, Truck, type IconComponent } from "@/components/icons";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { Screen, ScreenHeader, Skeleton, Text } from "@/components/ui";
import { setupDone } from "@/features/farmer/SetupCard";
import { useFarm } from "@/features/farmer/useFarm";
import { borders, colors, radii, spacing } from "@/theme/tokens";

export default function SetupChecklist() {
  const farm = useFarm();
  const steps: { icon: IconComponent; title: string; body: string; done: boolean; path?: string }[] = farm
    ? [
        { icon: Shop, title: "Business profile", body: "Add a farm photo and a short description buyers will read.", done: farm.checklist.profile, path: "/farm-settings/profile" },
        { icon: Truck, title: "Collection settings", body: "Confirm where and when riders collect orders.", done: farm.checklist.collection, path: "/farm-settings/fulfilment" },
        { icon: Sprout, title: "First listing", body: "Photograph your produce, set a price and stock, and send it for review.", done: farm.checklist.firstListing, path: farm.checklist.firstListing ? "/listings" : "/listing/new" },
      ]
    : [];

  return (
    <Screen header={<ScreenHeader title="Set up your farm" />}>
      <ScrollView contentContainerStyle={styles.body}>
        {farm === undefined ? (
          <Skeleton height={260} radius={radii.lg} />
        ) : (
          <>
            <Text variant="caption">
              {setupDone(farm.checklist)} of 3 done. Finish these so buyers can find and trust your farm.
            </Text>
            {steps.map(({ icon: Icon, title, body, done, path }) => (
              <Pressable
                key={title}
                accessibilityRole="button"
                accessibilityState={{ disabled: path === undefined, checked: done }}
                disabled={path === undefined}
                onPress={() => path && router.push(path)}
                style={[styles.step, done && styles.stepDone]}
              >
                <View style={styles.icon}>
                  <Icon size={20} color={colors.forest} />
                </View>
                <View style={styles.flex}>
                  <Text variant="bodyMedium">{title}</Text>
                  <Text variant="small">{body}</Text>
                </View>
                {done ? <CheckCircle size={22} color={colors.success} /> : <Circle size={22} color={colors.line} />}
              </Pressable>
            ))}
          </>
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: { gap: spacing.md, paddingTop: spacing.sm },
  step: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radii.lg,
    borderWidth: borders.hairline,
    borderColor: colors.lime,
  },
  stepDone: { backgroundColor: colors.tint },
  icon: { width: 40, height: 40, borderRadius: radii.md, backgroundColor: colors.tint, alignItems: "center", justifyContent: "center" },
  flex: { flex: 1, gap: 2 },
});
