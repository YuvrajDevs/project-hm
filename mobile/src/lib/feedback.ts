// Haptics, the app's equivalent of the web's sound-and-vibrate feedback (hooks/useSensoryFeedback.ts).
// Fire-and-forget: a haptic must never block or throw into UI code.
import * as Haptics from "expo-haptics";

const safe = (p: Promise<unknown>) => { p.catch(() => {}); };

export const tick = () => safe(Haptics.selectionAsync());
export const pop = () => safe(Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light));
export const thump = () => safe(Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium));
export const success = () => safe(Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success));
export const warn = () => safe(Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning));
