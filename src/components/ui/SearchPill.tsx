import { X } from "lucide-react-native";
import { Platform, Pressable, StyleSheet, TextInput, View, type TextInputProps } from "react-native";
import SearchButton from "../../../assets/icons/search-button.svg";
import { fonts } from "@/theme/typography";
import { borders, colors, radii, sizes, spacing } from "@/theme/tokens";
import { Text } from "./Text";

const PLACEHOLDER = "Search tomatoes, yam, ugwu...";

type Props =
  // Tappable pill that opens the search screen (Home)
  | { mode: "button"; onPress?: () => void }
  // Live input (Search screen)
  | ({ mode: "input"; onSubmit?: () => void; /** Shows a clear button while there is text */ onClear?: () => void } & Omit<TextInputProps, "style">);

/** Figma search pill with the round lime search button. */
export function SearchPill(props: Props) {
  const button = (
    <View pointerEvents="none">
      <SearchButton width={40} height={40} />
    </View>
  );

  if (props.mode === "button") {
    return (
      <Pressable
        accessibilityRole={props.onPress ? "search" : undefined}
        accessibilityLabel="Search produce"
        disabled={props.onPress === undefined}
        onPress={props.onPress}
        style={styles.pill}
      >
        <Text variant="body" color={colors.inkMuted} style={styles.flex} numberOfLines={1} maxFontSizeMultiplier={1.3}>
          {PLACEHOLDER}
        </Text>
        {button}
      </Pressable>
    );
  }

  const { mode: _mode, onSubmit, onClear, ...inputProps } = props;
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
      {onClear && inputProps.value ? (
        <Pressable accessibilityRole="button" accessibilityLabel="Clear search" onPress={onClear} hitSlop={8}>
          <X size={18} color={colors.inkSoft} />
        </Pressable>
      ) : null}
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
    paddingLeft: spacing.lg,
    paddingRight: spacing.xs,
    gap: spacing.sm,
  },
  flex: { flex: 1 },
  input: {
    fontFamily: fonts.regular,
    fontSize: 15,
    color: colors.ink,
    paddingVertical: 0,
    // The pill is the field's outline; no second browser focus ring inside it
    ...(Platform.OS === "web" ? ({ outlineStyle: "none" } as object) : {}),
  },
});
