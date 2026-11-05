// Runs headless when Android asks the widget to draw (added, resized, the 30-minute refresh) while the app may be
// closed. It only reads the saved snapshot: no Firebase, no network, so it finishes in milliseconds.
import type { WidgetTaskHandlerProps } from "react-native-android-widget";
import { getCheckInDateId } from "@/lib/dates";
import { UsWidget } from "./UsWidget";
import { freshen, loadSnapshot } from "./snapshot";

export async function widgetTaskHandler({ widgetInfo, widgetAction, renderWidget }: WidgetTaskHandlerProps) {
  if (widgetInfo.widgetName !== "Us") return;
  switch (widgetAction) {
    case "WIDGET_ADDED":
    case "WIDGET_UPDATE":
    case "WIDGET_RESIZED": {
      const snap = await loadSnapshot();
      renderWidget(<UsWidget data={snap ? freshen(snap, getCheckInDateId(new Date(), snap.tz)) : null} />);
      break;
    }
    default:
      break;
  }
}
