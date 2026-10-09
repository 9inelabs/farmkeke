import { Text as RNText, type TextProps as RNTextProps } from "react-native";
import { type, type TypeVariant } from "@/theme/typography";

export type TextProps = RNTextProps & {
  variant?: TypeVariant;
  color?: string;
  align?: "left" | "center" | "right";
};

export function Text({ variant = "body", color, align, style, ...rest }: TextProps) {
  return (
    <RNText
      {...rest}
      style={[type[variant], color !== undefined && { color }, align && { textAlign: align }, style]}
    />
  );
}
