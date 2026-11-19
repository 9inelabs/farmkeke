import { Check, Eye, EyeOff, Info, type IconComponent } from "@/components/icons";
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
  /**
   * "lime": always outlined in lime.
   * "premium": the welcome, sign-in and farmer sign-up screens: a taller,
   * rounder field with its icon inside, a forest outline and soft lime halo
   * when focused, and the password eye inside the field.
   */
  tone?: "default" | "lime" | "premium";
  /** Icon at the start of the field (premium). */
  icon?: IconComponent;
  /** Shows a lime tick at the end once the value checks out (premium). */
  valid?: boolean;
};

export const TextField = forwardRef<TextInput, Props>(function TextField(
  { label, helper, error, prefix, password = false, tone = "default", icon: Icon, valid = false, onFocus, onBlur, ...inputProps },
  ref,
) {
  const [focused, setFocused] = useState(false);
  const [hidden, setHidden] = useState(true);
  const lime = tone === "lime";
  const premium = tone === "premium";
  const borderColor = premium
    ? error
      ? colors.error
      : focused
        ? colors.forest
        : valid
          ? "#CFE3B0"
          : colors.line
    : error
      ? colors.error
      : focused || lime
        ? colors.lime
        : colors.line;
  const eye = password ? (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={hidden ? "Show password" : "Hide password"}
      hitSlop={8}
      onPress={() => setHidden((h) => !h)}
      style={styles.toggle}
    >
      {hidden ? (
        <Eye size={premium ? 20 : 22} color={premium ? colors.forestFaint : colors.ink} variant={premium ? "line" : "solid"} strokeWidth={premium ? 2 : 1.5} />
      ) : (
        <EyeOff size={premium ? 20 : 22} color={premium ? colors.forest : colors.ink} strokeWidth={premium ? 2 : 1.5} />
      )}
    </Pressable>
  ) : null;

  return (
    <View style={styles.wrap}>
      {label !== undefined && (
        <Text variant="label" style={[styles.label, (lime || premium) && styles.labelLime, premium && styles.labelPremium]}>
          {label}
        </Text>
      )}
      <View style={styles.fieldRow}>
      <View
        style={[
          styles.field,
          lime && styles.fieldLime,
          premium && styles.fieldPremium,
          { borderColor, borderWidth: focused || error || lime ? borders.strong : borders.hairline },
          focused && styles.fieldFocused,
          premium && valid && !focused && !error && styles.fieldFocused,
          premium && focused && !error && styles.haloPremium,
        ]}
      >
        {premium && Icon !== undefined ? <Icon size={20} color={focused ? colors.forest : "rgba(30, 59, 22, 0.55)"} strokeWidth={1.8} /> : null}
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
          style={[styles.input, premium && styles.inputPremium]}
        />
        {premium ? eye : null}
        {premium && valid && !password && !error ? (
          <View style={styles.validTick} accessibilityLabel="Looks good">
            <Check size={12} color={colors.forest} strokeWidth={3} />
          </View>
        ) : null}
      </View>
        {/* The Show / Hide eye sits just outside the field, as in the sign-in design. */}
        {premium ? null : eye}
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
  labelPremium: { fontFamily: fonts.semibold },
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
  fieldPremium: { minHeight: 54, borderRadius: 15, backgroundColor: "#F7F9F4", paddingHorizontal: 15, gap: 10 },
  haloPremium: { boxShadow: "0px 0px 0px 4px rgba(169, 214, 84, 0.28)" },
  inputPremium: { fontFamily: fonts.medium, fontSize: 15.5 },
  validTick: { width: 20, height: 20, borderRadius: 10, backgroundColor: colors.lime, alignItems: "center", justifyContent: "center" },
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
