import { Eye, EyeOff, Info } from "@/components/icons";
import { forwardRef, useState } from "react";
import { Platform, Pressable, StyleSheet, TextInput, View, type TextInputProps } from "react-native";
import { fonts } from "@/theme/typography";
import { borders, colors, radii, sizes, spacing } from "@/theme/tokens";
import { Text } from "./Text";

type Props = Omit<TextInputProps, "style"> & {
  label?: string;
  helper?: string;
  error?: string | null;
  /** Fixed text before the input, e.g. "+234". */
  prefix?: string;
  /** Adds the Show / Hide toggle used on every password field. */
  password?: boolean;
  /** "lime": always outlined in lime, as on the farmer sign-up screens. */
  tone?: "default" | "lime";
};

export const TextField = forwardRef<TextInput, Props>(function TextField(
  { label, helper, error, prefix, password = false, tone = "default", onFocus, onBlur, ...inputProps },
  ref,
) {
  const [focused, setFocused] = useState(false);
  const [hidden, setHidden] = useState(true);
  const lime = tone === "lime";
  const borderColor = error ? colors.error : focused || lime ? colors.lime : colors.line;

  return (
    <View style={styles.wrap}>
      {label !== undefined && (
        <Text variant="label" style={[styles.label, lime && styles.labelLime]}>
          {label}
        </Text>
      )}
      <View style={styles.fieldRow}>
      <View style={[styles.field, lime && styles.fieldLime, { borderColor, borderWidth: focused || error || lime ? 1.5 : 1 }, focused && styles.fieldFocused]}>
        {prefix !== undefined && (
          <View style={styles.prefix}>
            <Text variant="bodyMedium">{prefix}</Text>
          </View>
        )}
        <TextInput
          ref={ref}
          {...inputProps}
          secureTextEntry={password ? hidden : inputProps.secureTextEntry}
          placeholderTextColor={colors.inkMuted}
          selectionColor={colors.forest}
          accessibilityLabel={inputProps.accessibilityLabel ?? label}
          onFocus={(e) => {
            setFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            onBlur?.(e);
          }}
          style={styles.input}
        />
      </View>
        {/* The Show / Hide eye sits just outside the field, as in the sign-in design. */}
        {password && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={hidden ? "Show password" : "Hide password"}
            hitSlop={8}
            onPress={() => setHidden((h) => !h)}
            style={styles.toggle}
          >
            {hidden ? <Eye size={22} color={colors.ink} variant="solid" /> : <EyeOff size={22} color={colors.ink} />}
          </Pressable>
        )}
      </View>
      {error ? (
        <View style={styles.message} accessibilityLiveRegion="polite">
          <Info size={14} color={colors.error} />
          <Text variant="small" color={colors.error} style={styles.messageText}>
            {error}
          </Text>
        </View>
      ) : helper !== undefined ? (
        <Text variant="small">{helper}</Text>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  wrap: { gap: spacing.sm },
  label: { color: colors.inkSoft },
  labelLime: { color: colors.ink },
  fieldRow: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  field: {
    flex: 1,
    minHeight: sizes.inputHeight,
    borderRadius: radii.md,
    backgroundColor: colors.surfaceMuted,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
  },
  fieldFocused: { backgroundColor: colors.white },
  fieldLime: { backgroundColor: "rgba(255,255,255,0.6)", borderRadius: radii.md + 2, minHeight: 56 },
  prefix: {
    paddingRight: spacing.md,
    marginRight: spacing.md,
    borderRightWidth: borders.hairline,
    borderRightColor: colors.line,
  },
  input: {
    flex: 1,
    fontFamily: fonts.regular,
    fontSize: 15,
    color: colors.ink,
    paddingVertical: spacing.md,
    ...(Platform.OS === "web" ? ({ outlineStyle: "none" } as object) : {}),
  },
  toggle: { width: 28, height: 44, alignItems: "center", justifyContent: "center" },
  message: { flexDirection: "row", alignItems: "center", gap: spacing.xs },
  messageText: { flexShrink: 1 },
});
