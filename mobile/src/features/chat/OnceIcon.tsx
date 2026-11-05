// "View once": a "1" inside a ring that is solid on the left and dotted on the right (components/ui/OnceIcon.tsx)
import Svg, { Path } from "react-native-svg";

export function OnceIcon({ size = 24, color = "#fff" }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M12 2.8a9.2 9.2 0 0 0 0 18.4" />
      <Path d="M14.6 3.1h.01M17.4 4.6h.01M19.5 6.9h.01M20.7 9.5h.01M21 12h.01M20.7 14.5h.01M19.5 17.1h.01M17.4 19.4h.01M14.6 20.9h.01" strokeWidth={2.4} />
      <Path d="M10.6 9.6 12.4 8.4v7.4" strokeWidth={2.2} />
    </Svg>
  );
}
