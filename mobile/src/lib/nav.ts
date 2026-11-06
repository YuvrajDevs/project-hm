// One place for "open X", the app's version of the web's window events (openGame, openChat, openSafeSpace…).
import { useCallback, useEffect, useRef } from "react";
import { BackHandler } from "react-native";
import { router, useFocusEffect } from "expo-router";
import { DECK_BY_ID, slotFor } from "@/lib/games/decks";
import type { ActiveGame } from "@/lib/types";

export const openChat = () => router.push("/chat");
export const openSafeSpace = () => router.push("/safe-space");
export const openNotifications = () => router.push("/notifications");
export const openSettings = () => router.push("/settings");
export const openProfile = () => router.push("/profile");

/** A live game, a question deck or Everything About Us, each on its own screen */
export const openAnyGame = (game: Pick<ActiveGame, "id" | "deck">) => {
  if (slotFor(game.deck) === "current") router.push({ pathname: "/game/[id]", params: { id: game.id } });
  else if (DECK_BY_ID[game.deck]?.mechanic === "about") router.push({ pathname: "/about/[id]", params: { id: game.id } });
  else router.push({ pathname: "/questions/[id]", params: { id: game.id } });
};

/** Swap the screen to a different game (play again / next round) without stacking another screen */
export const replaceWithGame = (game: Pick<ActiveGame, "id" | "deck">) => {
  if (slotFor(game.deck) === "current") router.replace({ pathname: "/game/[id]", params: { id: game.id } });
  else if (DECK_BY_ID[game.deck]?.mechanic === "about") router.replace({ pathname: "/about/[id]", params: { id: game.id } });
  else router.replace({ pathname: "/questions/[id]", params: { id: game.id } });
};

export const goHome = () => (router.canGoBack() ? router.back() : router.replace("/home"));

/**
 * Android's Back (button or gesture) steps back inside a screen before leaving it: the Archive tab back to the
 * mailbox, saved messages back to the chat. `handler` returns true when it handled Back; false lets the screen
 * close as usual. Only active while the screen is in front, so a screen underneath never takes another's Back.
 */
export function useAndroidBack(handler: () => boolean) {
  const latest = useRef(handler);
  useEffect(() => { latest.current = handler; });
  useFocusEffect(useCallback(() => {
    const sub = BackHandler.addEventListener("hardwareBackPress", () => latest.current());
    return () => sub.remove();
  }, []));
}
