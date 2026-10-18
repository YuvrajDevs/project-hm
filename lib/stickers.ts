// Stickers are small fixed pictures that ship with the app (public/stickers). A sticker message stores
// only the sticker's id, never the picture, so it costs a few bytes and can't carry anything else.

export const STICKER_COUNT = 27;

export const STICKER_IDS = Array.from({ length: STICKER_COUNT }, (_, i) => `s${String(i).padStart(2, "0")}`);

const KNOWN = new Set(STICKER_IDS);

export const isStickerId = (id: unknown): id is string => typeof id === "string" && KNOWN.has(id);

export const stickerUrl = (id: string) => `/stickers/${id}.webp`;
