import type { Couple } from "./types";

// A message from the partner that this person hasn't opened the chat to read yet
export const hasUnreadChat = (couple: Couple | null | undefined, uid: string | undefined) =>
  !!uid && !!couple?.chatLastAt && !!couple.chatLastBy && couple.chatLastBy !== uid && (couple.chatSeen?.[uid] ?? "") < couple.chatLastAt;
