// M-84 Saved addresses.
import { api } from "@convex/_generated/api";
import { useQuery } from "convex/react";
import { router } from "expo-router";
import { MapPin, Pencil, Plus, WifiOff } from "lucide-react-native";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { Button, EmptyState, Screen, ScreenHeader, Skeleton, StatusBadge, Text, useIsOffline } from "@/components/ui";
import { ADDRESS_ICONS, ADDRESS_LABELS } from "@/features/account/addressLabels";
import { useAccount } from "@/features/account/useAccount";
import { borders, colors, radii, spacing } from "@/theme/tokens";


export default function SavedAddresses() {
  useAccount();
  const addresses = useQuery(api.addresses.list);
  const offline = useIsOffline();
  const add = () => router.push("/settings/addresses/new");

  return (
    <Screen
      header={<ScreenHeader title="Saved addresses" />}
      footer={addresses && addresses.length > 0 ? <Button label="Add address" icon={Plus} fullWidth onPress={add} /> : undefined}
    >
      {addresses === undefined ? (
        offline ? (
          <EmptyState icon={WifiOff} title="Can't load your addresses" message="Check your mobile data or Wi-Fi, then try again." />
        ) : (
          <View style={styles.list}>
            <Skeleton height={96} radius={radii.lg} />
            <Skeleton height={96} radius={radii.lg} />
          </View>
        )
      ) : addresses.length === 0 ? (
        <View style={styles.center}>
          <EmptyState
            icon={MapPin}
            title="No saved addresses"
            message="Save where you'd like deliveries to go, and checkout gets faster."
            actionLabel="Add address"
            onAction={add}
          />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
          {addresses.map((address) => {
            const Icon = ADDRESS_ICONS[address.label];
            return (
              <Pressable
                key={address._id}
                accessibilityRole="button"
                accessibilityLabel={`${ADDRESS_LABELS[address.label]}${address.isDefault ? ", default" : ""}. ${address.street}. Edit`}
                onPress={() => router.push(`/settings/addresses/${address._id}`)}
                style={[styles.card, address.isDefault && styles.cardDefault]}
              >
                <View style={styles.icon}>
                  <Icon size={18} color={colors.forest} />
                </View>
                <View style={styles.copy}>
                  <View style={styles.titleRow}>
                    <Text variant="bodyMedium">{ADDRESS_LABELS[address.label]}</Text>
                    {address.isDefault && <StatusBadge label="Default" tone="brand" />}
                  </View>
                  <Text variant="body">{address.street}</Text>
                  <Text variant="small">
                    {address.landmark}
                    {address.area ? ` · ${address.area.name}` : ""}
                  </Text>
                </View>
                <View style={styles.edit}>
                  <Pencil size={14} color={colors.forest} />
                  <Text variant="label" color={colors.forest}>
                    Edit
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </ScrollView>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: "center" },
  list: { gap: spacing.md, paddingBottom: spacing.xl },
  card: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radii.lg,
    borderWidth: borders.hairline,
    borderColor: colors.line,
  },
  cardDefault: { borderColor: colors.forest, borderWidth: 1 },
  icon: {
    width: 36,
    height: 36,
    borderRadius: radii.sm,
    backgroundColor: colors.tint,
    alignItems: "center",
    justifyContent: "center",
  },
  copy: { flex: 1, gap: 2 },
  titleRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  edit: { flexDirection: "row", alignItems: "center", gap: spacing.xxs },
});
