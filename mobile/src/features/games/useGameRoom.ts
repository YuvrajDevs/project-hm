// What every game screen does around the game itself (from the web's GameScreen / QuestionDeckScreen / AboutScreen):
// marks this person as in the room (so no toast fires for it), joins on open, keeps the last known state on screen
// while it closes, follows the partner into the next round if they started one, and closes if the game is ended
// from the other phone or was already gone when a stale notification opened it.
import { useEffect, useState } from "react";
import { router } from "expo-router";
import { presence } from "@/lib/presence";
import { joinGame } from "@/lib/firestore-helpers";
import type { ActiveGame } from "@/lib/types";
import { useSession } from "~/store/session";
import { useLive } from "~/store/live";
import { usePartnerName } from "~/store/derived";
import { goHome, replaceWithGame } from "~/lib/nav";

export function useGameRoom(id: string) {
  const live = useLive((s) => s.games.find((g) => g.id === id) ?? null);
  const uid = useSession((s) => s.authUser?.uid ?? "");
  const partnerUid = useSession((s) => s.partner?.uid ?? "");
  const coupleId = useSession((s) => s.user?.coupleId ?? "");
  const partnerName = usePartnerName("Your partner");

  const [lastSeen, setLastSeen] = useState<ActiveGame | null>(live);
  if (live && live !== lastSeen) setLastSeen(live);
  const game = live ?? lastSeen;

  useEffect(() => {
    presence.gameId = id;
    return () => { if (presence.gameId === id) presence.gameId = null; };
  }, [id]);

  const joined = !!game?.joined?.[uid];
  useEffect(() => {
    if (coupleId && uid && game && !joined) joinGame(coupleId, id, uid).catch(console.error);
  }, [coupleId, id, uid, game, joined]);

  // Remembered past the game's own deletion: the partner's next round may land after this one is gone
  const [replacedBy, setReplacedBy] = useState<string | null>(null);
  if (game?.replacedBy && game.replacedBy !== replacedBy) setReplacedBy(game.replacedBy);
  const next = useLive((s) => (replacedBy ? s.games.find((g) => g.id === replacedBy) ?? null : null));
  const gone = !!lastSeen && !live;
  useEffect(() => {
    if (!gone) return;
    if (next) replaceWithGame(next);
    else goHome();
  }, [gone, next]);

  // Opened for a game that doesn't exist (any more): give the listener a moment, then go home
  useEffect(() => {
    if (game) return;
    const t = setTimeout(() => { if (!useLive.getState().games.some((g) => g.id === id)) goHome(); }, 2500);
    return () => clearTimeout(t);
  }, [game, id]);

  const leave = () => (router.canGoBack() ? router.back() : router.replace("/home"));
  return { game, uid, partnerUid, coupleId, partnerName, leave };
}
