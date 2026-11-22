// The attach mark for the chat's bottom bar: a paperclip, drawn on the icon
// set's 24px grid and line weight (the set has no paperclip).
import type { ColorValue } from "react-native";
import Svg, { Path } from "react-native-svg";

export function Paperclip({ size = 22, color, strokeWidth = 1.7 }: { size?: number; color: ColorValue; strokeWidth?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M20.5 11.2l-8.3 8.3a5.4 5.4 0 0 1-7.6-7.6l8.3-8.3a3.6 3.6 0 0 1 5.1 5.1l-8.3 8.3a1.8 1.8 0 0 1-2.5-2.5l7.6-7.6"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}
