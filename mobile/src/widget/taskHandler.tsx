"use no memo";
// Widgets are drawn outside React (plain function calls), so React Compiler's caching hook would crash them with
// "Invalid Hook Call": this file is opted out.
//
// Runs headless when Android asks a widget to draw (added, resized, the 30-minute refresh) while the app may be
// closed. Us and Streak only read the saved snapshot (no network, milliseconds). Doodle and Live pic draw the saved
// copy at once, then, on a refresh, look for anything newer from the partner and redraw if there is.
import type { WidgetTaskHandlerProps } from "react-native-android-widget";
import { getCheckInDateId } from "@/lib/dates";
import { UsWidget } from "./UsWidget";
import { StreakWidget } from "./StreakWidget";
import { DoodleWidget } from "./DoodleWidget";
import { LivePicWidget } from "./LivePicWidget";
import { freshen, loadSnapshot } from "./snapshot";
import { doodleToSvg, loadShared, saveShared, type SharedWidgets } from "./shared";

const SHARED = ["Doodle", "LivePic"];

const drawShared = (name: string, data: SharedWidgets | null) =>
  name === "Doodle" ? <DoodleWidget data={data} /> : <LivePicWidget data={data} />;

/** Fetch and decrypt the partner's latest. Gives up quietly (offline, signed out, no key) within a few seconds. */
async function fetchNewer(saved: SharedWidgets): Promise<SharedWidgets | null> {
  try {
    // Loaded here, not at the top, so drawing the saved copy never waits for Firebase to start
    const [{ auth }, { fetchPartnerWidgets }] = await Promise.all([import("~/native/firebase"), import("~/data/widgetShare")]);
    const signedIn = await new Promise<boolean>((resolve) => {
      if (auth.currentUser) return resolve(true);
      const t = setTimeout(() => { off(); resolve(false); }, 4000);
      const off = auth.onAuthStateChanged((u) => { if (u) { clearTimeout(t); off(); resolve(true); } });
    });
    if (!signedIn || auth.currentUser?.uid !== saved.uid) return null;
    const latest = await Promise.race([
      fetchPartnerWidgets(saved.coupleId, saved.uid, saved.partnerUid),
      new Promise<null>((r) => setTimeout(() => r(null), 8000)),
    ]);
    if (!latest) return null;
    const next: SharedWidgets = {
      ...saved,
      doodle: latest.doodle ? { svg: doodleToSvg(latest.doodle.strokes), at: latest.doodle.at } : saved.doodle,
      pic: latest.pic ? { data: latest.pic.data, at: latest.pic.at } : saved.pic,
    };
    return JSON.stringify(next) === JSON.stringify(saved) ? null : next;
  } catch {
    return null;
  }
}

export async function widgetTaskHandler({ widgetInfo, widgetAction, renderWidget }: WidgetTaskHandlerProps) {
  const name = widgetInfo.widgetName;
  if (widgetAction !== "WIDGET_ADDED" && widgetAction !== "WIDGET_UPDATE" && widgetAction !== "WIDGET_RESIZED") return;

  if (name === "Us" || name === "Streak") {
    const snap = await loadSnapshot();
    const data = snap ? freshen(snap, getCheckInDateId(new Date(), snap.tz)) : null;
    renderWidget(name === "Us" ? <UsWidget data={data} /> : <StreakWidget data={data} />);
    return;
  }

  if (SHARED.includes(name)) {
    const saved = await loadShared();
    renderWidget(drawShared(name, saved));
    if (widgetAction === "WIDGET_RESIZED" || !saved) return;
    const newer = await fetchNewer(saved);
    if (newer) {
      await saveShared(newer);
      renderWidget(drawShared(name, newer));
    }
  }
}
