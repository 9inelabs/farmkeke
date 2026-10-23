import { ChevronDown, Search } from "@/components/icons";
import { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, TextInput, View } from "react-native";
import { fonts } from "@/theme/typography";
import { borders, colors, radii, spacing } from "@/theme/tokens";
import { BottomSheet } from "./BottomSheet";
import { RadioRow } from "./Choice";
import { ListGroup } from "./ListRow";
import { Text } from "./Text";

type Option = { value: string; label: string; detail?: string };

type Props = {
  label: string;
  placeholder: string;
  options: Option[];
  value: string | undefined;
  onChange: (value: string) => void;
  error?: string | null;
  /** Show a search box in the sheet (long lists: states, banks). */
  searchable?: boolean;
};

/** A field that opens a bottom sheet of options. */
export function SelectField({ label, placeholder, options, value, onChange, error, searchable = false }: Props) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const selected = options.find((o) => o.value === value);
  const visible = useMemo(() => {
    const term = search.trim().toLowerCase();
    return term ? options.filter((o) => o.label.toLowerCase().includes(term)) : options;
  }, [options, search]);

  return (
    <View style={styles.wrap}>
      <Text variant="label">{label}</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${selected?.label ?? "not chosen"}. Change`}
        onPress={() => {
          setSearch("");
          setOpen(true);
        }}
        style={[styles.field, error ? styles.fieldError : null]}
      >
        <Text variant="body" color={selected ? colors.ink : colors.inkMuted} style={styles.flex} numberOfLines={1}>
          {selected?.label ?? placeholder}
        </Text>
        <ChevronDown size={18} color={colors.inkMuted} />
      </Pressable>
      {error ? (
        <Text variant="small" color={colors.error}>
          {error}
        </Text>
      ) : null}

      <BottomSheet visible={open} onClose={() => setOpen(false)}>
        <Text variant="heading">{label}</Text>
        {searchable && (
          <View style={styles.search}>
            <Search size={18} color={colors.inkMuted} />
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder="Search"
              placeholderTextColor={colors.inkMuted}
              selectionColor={colors.forest}
              style={styles.searchInput}
              accessibilityLabel={`Search ${label}`}
            />
          </View>
        )}
        <ScrollView style={styles.list} keyboardShouldPersistTaps="handled">
          <ListGroup>
            {visible.map((option) => (
              <RadioRow
                key={option.value}
                title={option.label}
                subtitle={option.detail}
                selected={option.value === value}
                onPress={() => {
                  onChange(option.value);
                  setOpen(false);
                }}
              />
            ))}
          </ListGroup>
        </ScrollView>
      </BottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.sm },
  field: {
    minHeight: 56,
    borderRadius: radii.control,
    borderWidth: borders.hairline,
    borderColor: colors.lime,
    paddingHorizontal: spacing.lg,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  fieldError: { borderColor: colors.error, borderWidth: 1 },
  flex: { flex: 1 },
  search: {
    height: 46,
    borderRadius: radii.pill,
    borderWidth: borders.hairline,
    borderColor: colors.inkSoft,
    paddingHorizontal: spacing.lg,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  searchInput: { flex: 1, fontFamily: fonts.regular, fontSize: 15, color: colors.ink },
  list: { maxHeight: 380 },
});
