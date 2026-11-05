// A soft round glow (the web's radial-gradient washes), drawn once as an SVG.
import { memo } from "react";
import Svg, { Defs, RadialGradient, Rect, Stop } from "react-native-svg";

export const Glow = memo(function Glow({ color, size, strength = 1 }: { color: string; size: number; strength?: number }) {
  return (
    <Svg width={size} height={size} pointerEvents="none">
      <Defs>
        <RadialGradient id="g" cx="50%" cy="50%" r="50%">
          <Stop offset="0" stopColor={color} stopOpacity={strength} />
          <Stop offset="0.65" stopColor={color} stopOpacity={0} />
        </RadialGradient>
      </Defs>
      <Rect width={size} height={size} fill="url(#g)" />
    </Svg>
  );
});
