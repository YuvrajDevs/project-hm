// Which home overlays are open. Kept apart from the data stores so opening a sheet never re-renders a list.
import { create } from "zustand";
import type { QuickReact } from "@/lib/types";

interface UIState {
  view: "mailbox" | "archive";
  compose: boolean;
  checkIn: boolean;
  signals: boolean;
  /** A partner's signal shown full screen: arrived just now (auto), or replayed from the mood tile (manual) */
  splash: { react: QuickReact; manual: boolean } | null;
  afterSafeSpace: boolean;
  empathyNudge: boolean;
}

export const useUI = create<UIState>(() => ({
  view: "mailbox", compose: false, checkIn: false, signals: false, splash: null, afterSafeSpace: false, empathyNudge: false,
}));

export const ui = {
  set: (patch: Partial<UIState>) => useUI.setState(patch),
  reset: () => useUI.setState({ view: "mailbox", compose: false, checkIn: false, signals: false, splash: null, afterSafeSpace: false, empathyNudge: false }),
};
