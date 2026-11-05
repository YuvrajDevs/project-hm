"use no memo";
// Widgets are drawn outside React (plain function calls), so React Compiler's caching hook would crash them with
// "Invalid Hook Call": this file is opted out.
//
// Small pieces shared by the home-screen widgets: fonts, the round action button, icons (as SVG, so they stay crisp
// at any size) and the time stamp. Widgets redraw rarely (when the app syncs, or every 30 minutes), so times are
// shown as a clock time, never "5m ago", which would be wrong a minute later.
import { FlexWidget, SvgWidget, TextWidget } from "react-native-android-widget";

export const BEBAS = "BebasNeue_400Regular";
export const BODY = "Outfit_400Regular";
export const SERIF = "PlayfairDisplay_600SemiBold_Italic";
export const INK = "#0e0e0e";
export const RADIUS = 28;

const svg = (stroke: string, body: string, fill = "none") =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="${fill}" stroke="${stroke}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">${body}</svg>`;

export const ICON = {
  pencil: (c: string) => svg(c, '<path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z"/><path d="m15 5 4 4"/>'),
  camera: (c: string) => svg(c, '<path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3"/>'),
  heart: (c: string) => svg(c, '<path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>', c),
};

type Hex = `#${string}`;

/** The round button in a widget's corner (pencil, camera…), like the reference's play and edit buttons */
export function RoundButton({ icon, bg, uri, size = 40 }: { icon: string; bg: Hex; uri: string; size?: number }) {
  return (
    <FlexWidget
      clickAction="OPEN_URI"
      clickActionData={{ uri }}
      style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: bg, justifyContent: "center", alignItems: "center" }}
    >
      <SvgWidget svg={icon} style={{ width: size * 0.45, height: size * 0.45 }} />
    </FlexWidget>
  );
}

/** A small label pill ("FROM ROBIN") */
export function Chip({ text, bg, color }: { text: string; bg: Hex; color: Hex }) {
  return (
    <FlexWidget style={{ backgroundColor: bg, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 }}>
      <TextWidget text={text} maxLines={1} truncate="END" style={{ fontFamily: BEBAS, fontSize: 12, color, letterSpacing: 0.12 }} />
    </FlexWidget>
  );
}

// The time stamp and first-name helpers live in shared.ts, so the app's own screens can use them without loading
// the widget library
export { stamp, firstName } from "./shared";
