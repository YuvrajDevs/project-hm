// What the widget shows, saved on the device so the widget can redraw (on boot, on resize, every 30 minutes)
// without the app running or any network call. Contains no message content.
import AsyncStorage from "@react-native-async-storage/async-storage";

export interface WidgetSnapshot {
  paired: boolean;
  partnerName: string;
  partnerMood: string;
  streak: number;
  streakDay: string;
  todayId: string;
  /** The couple's shared timezone, so the widget rolls the day over at the same moment the app does */
  tz?: string;
  mine: boolean;
  theirs: boolean;
  waiting: number;
}

const KEY = "hm_widget_snapshot_v1";

export const saveSnapshot = (s: WidgetSnapshot | null) =>
  (s ? AsyncStorage.setItem(KEY, JSON.stringify(s)) : AsyncStorage.removeItem(KEY)).catch(() => {});

export const loadSnapshot = async (): Promise<WidgetSnapshot | null> => {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as WidgetSnapshot) : null;
  } catch {
    return null;
  }
};

/** A check-in shown as "today" stops being today at midnight, even if the app hasn't run since. */
export const freshen = (s: WidgetSnapshot, todayId: string): WidgetSnapshot =>
  s.todayId === todayId ? s : { ...s, todayId, mine: false, theirs: false };
