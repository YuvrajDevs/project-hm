// Hooks that read exactly the slices a screen needs and memoise what is derived from them.
// Rule of thumb: select primitives or stable references from the store, derive with useMemo. Never build a new
// array inside a selector (it would re-render on every store change).
import { useMemo } from "react";
import { useShallow } from "zustand/react/shallow";
import { getCheckInDateId } from "@/lib/dates";
import { partnerLabel } from "@/lib/utils";
import { hasUnreadChat } from "@/lib/chat";
import { useSession } from "./session";
import { useLive } from "./live";
import {
  bellNotifications, computeMetrics, safeSpaceHasNew, splitGames, todaysCheckins, visibleEvents, visibleMessages,
} from "~/lib/derive";

/** The check-in day both partners share (the couple's timezone decides it). Changes once a day. */
export const useTodayId = () => {
  const now = useLive((s) => s.now);
  const tz = useSession((s) => s.couple?.dayTimezone);
  return getCheckInDateId(new Date(now), tz);
};

export const useIds = () =>
  useSession(useShallow((s) => ({
    uid: s.authUser?.uid ?? null,
    coupleId: s.user?.coupleId ?? null,
    partnerUid: s.partner?.uid ?? s.user?.partnerId ?? null,
  })));

export const usePartnerName = (fallback = "your partner") => {
  const nickname = useSession((s) => s.user?.partnerNickname);
  const name = useSession((s) => s.partner?.displayName);
  return partnerLabel({ partnerNickname: nickname }, { displayName: name }, fallback);
};

export const useFirstName = () => useSession((s) => s.user?.displayName?.trim().split(" ")[0] || "");

export const useMessages = () => {
  const uid = useSession((s) => s.authUser?.uid);
  const { raw, now, sealed } = useLive(useShallow((s) => ({ raw: s.rawMessages, now: s.now, sealed: s.sealedContent })));
  return useMemo(() => (uid ? visibleMessages(raw, uid, now, sealed) : []), [raw, uid, now, sealed]);
};

export const useTodaysCheckins = () => {
  const history = useLive((s) => s.historyCheckins);
  const today = useTodayId();
  return useMemo(() => todaysCheckins(history, today), [history, today]);
};

export const useEvents = () => {
  const uid = useSession((s) => s.authUser?.uid);
  const raw = useLive((s) => s.rawEvents);
  const today = useTodayId();
  return useMemo(() => (uid ? visibleEvents(raw, uid, today) : []), [raw, uid, today]);
};

export const useGames = () => {
  const games = useLive((s) => s.games);
  return useMemo(() => splitGames(games), [games]);
};

export const useGame = (id: string | null | undefined) => useLive((s) => (id ? s.games.find((g) => g.id === id) ?? null : null));

export const useMetrics = () => {
  const uid = useSession((s) => s.authUser?.uid);
  const storedStreak = useSession((s) => s.couple?.streakCount);
  const storedLastDay = useSession((s) => s.couple?.streakLastDay);
  const { history, reactions, now } = useLive(useShallow((s) => ({ history: s.historyCheckins, reactions: s.reactions, now: s.now })));
  const messages = useMessages();
  const todayId = useTodayId();
  return useMemo(
    () => (uid ? computeMetrics({ uid, history, messages, reactions, now, todayId, storedStreak, storedLastDay }) : null),
    [uid, history, messages, reactions, now, todayId, storedStreak, storedLastDay]
  );
};

export const useBell = () => {
  const all = useLive((s) => s.notifications);
  return useMemo(() => {
    const list = bellNotifications(all);
    return { list, unread: list.filter((n) => !n.read).length };
  }, [all]);
};

export const useSafeSpaceHasNew = () => {
  const session = useLive((s) => s.activeSafeSpace);
  const uid = useSession((s) => s.authUser?.uid ?? null);
  return safeSpaceHasNew(session, uid);
};

export const useUnreadChat = () =>
  useSession((s) => hasUnreadChat(s.couple, s.authUser?.uid));

export const useNotificationsEnabled = () => useSession((s) => s.user?.settings?.notificationsEnabled ?? true);
