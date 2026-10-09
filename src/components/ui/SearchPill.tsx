import { Search } from "lucide-react-native";
import { Pressable, StyleSheet, TextInput, View, type TextInputProps } from "react-native";
import { fonts } from "@/theme/typography";
import { borders, colors, radii, sizes, spacing } from "@/theme/tokens";
import { Text } from "./Text";

const PLACEHOLDER = "Search tomatoes, yam, ugwu...";

type Props =
  // Tappable pill that opens the search screen (Home)
  | { mode: "button"; onPress: () => void }
  // Live input (Search screen)
  | ({ mode: "input"; onSubmit?: () => void } & Omit<TextInputProps, "style">);

/** Figma search pill with the round lime search button. */
export function SearchPill(props: Props) {
  const button = (
    <View style={styles.searchButton} pointerEvents="none">
      <Search size={20} color={colors.white} strokeWidth={2.5} />
    </View>
  );

  if (props.mode === "button") {
    return (
      <Pressable
        accessibilityRole="search"
        accessibilityLabel="Search produce"
        onPress={props.onPress}
        style={styles.pill}
      >
        <Text variant="body" color={colors.inkMuted} style={styles.flex} numberOfLines={1}>
          {PLACEHOLDER}
        </Text>
        {button}
      </Pressable>
    );
  }

  const { mode: _mode, onSubmit, ...inputProps } = props;
  return (
    <View style={styles.pill}>
      <TextInput
        placeholder={PLACEHOLDER}
        placeholderTextColor={colors.inkMuted}
        selectionColor={colors.forest}
        returnKeyType="search"
        accessibilityLabel="Search produce"
        onSubmitEditing={onSubmit}
        {...inputProps}
        style={[styles.flex, styles.input]}
      />
      <Pressable accessibilityRole="button" accessibilityLabel="Search" onPress={onSubmit} hitSlop={6}>
        {button}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    height: sizes.searchHeight,
    borderRadius: radii.pill,
    borderWidth: borders.hairline,
    borderColor: colors.inkSoft,
    backgroundColor: colors.white,
    flexDirection: "row",
    alignItems: "center",
    paddingLeft: spacing.xl,
    paddingRight: spacing.sm,
    gap: spacing.sm,
  },
  flex: { flex: 1 },
  input: { fontFamily: fonts.regular, fontSize: 15, color: colors.ink, paddingVertical: 0 },
  searchButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.lime,
    alignItems: "center",
    justifyContent: "center",
  },
});
