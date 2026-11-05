// A live game, full screen. The game lives in Firestore, so either person can leave and come back to the same card.
import { useLocalSearchParams } from "expo-router";
import { DECK_BY_ID } from "@/lib/games/decks";
import { useGuard } from "~/lib/routing";
import { Loading } from "~/ui/Loading";
import { useGameRoom } from "~/features/games/useGameRoom";
import { BoardGame } from "~/features/games/BoardGame";
import { Scribble } from "~/features/games/Scribble";
import { CardGame } from "~/features/games/CardGame";

export default function GameRoute() {
  useGuard(["/home"]);
  const { id } = useLocalSearchParams<{ id: string }>();
  const { game, uid, partnerUid, coupleId, partnerName, leave } = useGameRoom(id);
  if (!game || !uid || !partnerUid) return <Loading />;
  const shared = { game, uid, partnerUid, partnerName, coupleId, onLeave: leave };
  const mechanic = DECK_BY_ID[game.deck]?.mechanic;
  if (mechanic === "xo" || mechanic === "connect4") return <BoardGame {...shared} />;
  if (mechanic === "scribble") return <Scribble {...shared} />;
  return <CardGame {...shared} />;
}
