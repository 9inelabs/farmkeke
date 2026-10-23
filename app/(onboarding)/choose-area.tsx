// M-06 Choose your area. Also opened from Home's location chip (?from=home).
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { useQuery } from "convex/react";
import { router, useLocalSearchParams } from "expo-router";
import { ChevronDown, Offline, Search } from "@/components/icons";
import { useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, TextInput, View } from "react-native";
import {
  BottomSheet,
  Button,
  EmptyState,
  ListGroup,
  RadioRow,
  Screen,
  ScreenHeader,
  Skeleton,
  StatusBadge,
  Text,
  useIsOffline,
} from "@/components/ui";
import { usePrefs } from "@/store/prefs";
import { fonts } from "@/theme/typography";
import { borders, colors, radii, spacing } from "@/theme/tokens";

export default function ChooseArea() {
  const { from } = useLocalSearchParams<{ from?: string }>();
  const current = usePrefs((s) => s.area);
  const setArea = usePrefs((s) => s.setArea);
  const offline = useIsOffline();

  const states = useQuery(api.areas.listServedStates);
  const [state, setState] = useState<string | null>(current?.state ?? null);
  const [statePicker, setStatePicker] = useState(false);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Id<"serviceAreas"> | null>(
    (current?.serviceAreaId as Id<"serviceAreas"> | undefined) ?? null,
  );

  // Default to the first served state once known.
  useEffect(() => {
    if (state === null && states && states.length > 0) setState(states[0]);
  }, [state, states]);

  const areas = useQuery(api.areas.listServiceAreas, state ? { state } : "skip");
  const visible = useMemo(() => {
    const term = search.trim().toLowerCase();
    return (areas ?? []).filter(
      (a) => term === "" || a.name.toLowerCase().includes(term) || a.lga.toLowerCase().includes(term),
    );
  }, [areas, search]);

  const confirm = () => {
    const area = areas?.find((a) => a._id === selected);
    if (!area) return;
    setArea({ serviceAreaId: area._id, name: area.name, state: area.state, lga: area.lga });
    if (from === "home" && router.canGoBack()) router.back();
    else router.replace("/home");
  };

  const loading = states === undefined || (state !== null && areas === undefined);

  return (
    <Screen
      header={<ScreenHeader title="Choose your area" />}
      footer={<Button label="Confirm area" fullWidth disabled={selected === null} onPress={confirm} />}
    >
      <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={styles.body}>
        <View style={styles.field}>
          <Text variant="label">State</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`State: ${state ?? "not chosen"}. Change state`}
            onPress={() => setStatePicker(true)}
            style={styles.select}
          >
            <Text variant="body">{state ?? "Choose a state"}</Text>
            <ChevronDown size={18} color={colors.inkMuted} />
          </Pressable>
        </View>

        <View style={styles.field}>
          <Text variant="label">Area or LGA</Text>
          <View style={styles.search}>
            <Search size={18} color={colors.inkMuted} />
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder="Search New Owerri, Orlu…"
              placeholderTextColor={colors.inkMuted}
              selectionColor={colors.forest}
              accessibilityLabel="Search areas"
              style={styles.searchInput}
            />
          </View>
        </View>

        {loading && offline ? (
          <EmptyState
            icon={Offline}
            title="Can't load areas right now"
            message="Check your mobile data or Wi-Fi. This list loads as soon as you're back online."
          />
        ) : loading ? (
          <View style={styles.skeletons}>
            {Array.from({ length: 5 }, (_, i) => (
              <Skeleton key={i} height={56} radius={radii.md} />
            ))}
          </View>
        ) : (
          <ListGroup title={`Areas we deliver to in ${state ?? ""}`}>
            {visible.length === 0 ? (
              <View style={styles.none}>
                <Text variant="caption">No area matches “{search.trim()}”. Try another name, or pick from the list.</Text>
              </View>
            ) : (
              visible.map((area) => (
                <RadioRow
                  key={area._id}
                  title={area.name}
                  subtitle={area.lga}
                  selected={selected === area._id}
                  onPress={() => setSelected(area._id)}
                  trailing={selected === area._id ? <StatusBadge label="Selected" tone="brand" /> : undefined}
                />
              ))
            )}
          </ListGroup>
        )}
        <Text variant="small" style={styles.hint}>
          Not on the list?{" "}
          <Text
            variant="small"
            color={colors.forest}
            accessibilityRole="link"
            onPress={() => router.push("/location")}
          >
            Use my location
          </Text>{" "}
          and we'll find the farms nearest you.
        </Text>
      </ScrollView>

      <BottomSheet visible={statePicker} onClose={() => setStatePicker(false)}>
        <Text variant="heading">Choose a state</Text>
        <ListGroup>
          {(states ?? []).map((s) => (
            <RadioRow
              key={s}
              title={s}
              selected={s === state}
              onPress={() => {
                setState(s);
                setSelected(null);
                setStatePicker(false);
              }}
            />
          ))}
        </ListGroup>
      </BottomSheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: { gap: spacing.xl, paddingBottom: spacing.xxl },
  field: { gap: spacing.sm },
  select: {
    height: 52,
    borderRadius: radii.md,
    backgroundColor: colors.surfaceMuted,
    paddingHorizontal: spacing.lg,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  search: {
    height: 52,
    borderRadius: radii.md,
    borderWidth: borders.hairline,
    borderColor: colors.lime,
    paddingHorizontal: spacing.lg,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  searchInput: { flex: 1, fontFamily: fonts.regular, fontSize: 15, color: colors.ink },
  skeletons: { gap: spacing.sm },
  none: { padding: spacing.lg },
  hint: { marginTop: -spacing.sm },
});
