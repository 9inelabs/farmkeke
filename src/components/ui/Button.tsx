import type { IconComponent } from "@/components/icons";
import { ActivityIndicator, StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { borders, colors, radii, sizes, spacing } from "@/theme/tokens";
import { PressableScale } from "./PressableScale";
import { Text } from "./Text";

type Variant = "primary" | "dark" | "black" | "secondary" | "outline" | "ghost" | "danger";

type Props = {
  label: string;
  onPress?: () => void;
  variant?: Variant;
  size?: "default" | "large" | "small";
  icon?: IconComponent;
  /** Icon after the label ("Checkout →"). */
  iconRight?: IconComponent;
  /** Fully rounded ends, for floating actions (Checkout, Add to cart). */
  pill?: boolean;
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityHint?: string;
};

const palette: Record<Variant, { bg: string; fg: string; border?: string }> = {
  // Lime fill with dark text: the main call to action in every Figma frame
  primary: { bg: colors.lime, fg: colors.forest },
  dark: { bg: colors.forest, fg: colors.white },
  // Form submits on the sign-in and account screens
  black: { bg: colors.ink, fg: colors.white },
  secondary: { bg: colors.tint, fg: colors.forest, border: colors.lime },
  outline: { bg: colors.white, fg: colors.forest, border: colors.forest },
  ghost: { bg: "transparent", fg: colors.forest },
  danger: { bg: colors.errorSoft, fg: colors.error },
};

export function Button({
  label,
  onPress,
  variant = "primary",
  size = "default",
  icon: Icon,
  iconRight: IconRight,
  pill = false,
  loading = false,
  disabled = false,
  fullWidth = false,
  style,
  accessibilityHint,
}: Props) {
  const { bg, fg, border } = palette[variant];
  const height =
    size === "large" ? sizes.buttonHeightLarge : size === "small" ? sizes.chipHeight : sizes.buttonHeight;
  const inactive = disabled || loading;

  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: inactive, busy: loading }}
      disabled={inactive}
      onPress={onPress}
      style={[
        styles.base,
        {
          height,
          backgroundColor: bg,
          borderRadius: size === "small" || pill ? radii.pill : radii.control,
          paddingHorizontal: size === "small" ? spacing.lg : spacing.xxl,
        },
        border !== undefined && { borderColor: border, borderWidth: variant === "outline" ? 1 : borders.hairline },
        fullWidth && styles.fullWidth,
        disabled && !loading && styles.disabled,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={fg} />
      ) : (
        <View style={styles.content}>
          {Icon !== undefined && <Icon size={size === "small" ? 16 : 20} color={fg} />}
          <Text variant="button" color={fg} numberOfLines={1}>
            {label}
          </Text>
          {IconRight !== undefined && <IconRight size={size === "small" ? 16 : 20} color={fg} />}
        </View>
      )}
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  base: { alignItems: "center", justifyContent: "center" },
  fullWidth: { alignSelf: "stretch" },
  content: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  disabled: { opacity: 0.45 },
});
